// ============================================================
// 🌒 @openvesper/core — Cron Scheduler
// ============================================================
// PRIVACY: All scheduling state is local. Jobs are stored at
// <workspacePath>/heartbeat.json (mode 0600 on POSIX). No remote
// scheduler, no shared state, no openvesper.com contact.
// ============================================================

import * as fs from "fs";
import * as path from "path";

export interface CronJob {
  id: string;
  name: string;
  schedule: string;        // cron expression: "0 8 * * *"
  agent: string;           // agent mode to run
  prompt: string;          // prompt template (supports {{now}}, {{yesterday}}, {{user}})
  deliver_to?: string;     // "telegram:@me" | "slack:#channel" | "console" | "log"
  enabled: boolean;
  // Tracking
  lastRun?: number;        // timestamp
  lastResult?: "ok" | "error" | "skipped";
  lastError?: string;
  nextRun?: number;        // timestamp
  runCount: number;
}

export interface CronJobsConfig {
  jobs: CronJob[];
}

// ────────────────────────────────────────────────────────────
// Cron expression parser (minute hour day-of-month month day-of-week)
// ────────────────────────────────────────────────────────────

interface ParsedCron {
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
}

const DAY_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};
const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function parseField(field: string, min: number, max: number, nameMap?: Record<string, number>): Set<number> {
  // Replace name aliases (e.g., "MON" → "1")
  if (nameMap) {
    for (const [name, num] of Object.entries(nameMap)) {
      field = field.replace(new RegExp(`\\b${name}\\b`, "gi"), String(num));
    }
  }

  const result = new Set<number>();

  for (const part of field.split(",")) {
    // Handle "*" or "*/N"
    if (part === "*") {
      for (let i = min; i <= max; i++) result.add(i);
    } else if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2));
      for (let i = min; i <= max; i += step) result.add(i);
    } else if (part.includes("/")) {
      // "5-30/3"
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr);
      const [lo, hi] = range.includes("-")
        ? range.split("-").map((n) => parseInt(n))
        : [parseInt(range), max];
      for (let i = lo; i <= hi; i += step) result.add(i);
    } else if (part.includes("-")) {
      const [lo, hi] = part.split("-").map((n) => parseInt(n));
      for (let i = lo; i <= hi; i++) result.add(i);
    } else {
      result.add(parseInt(part));
    }
  }

  return result;
}

export function parseCron(expression: string): ParsedCron {
  // Common shortcuts
  const SHORTCUTS: Record<string, string> = {
    "@yearly": "0 0 1 1 *",
    "@annually": "0 0 1 1 *",
    "@monthly": "0 0 1 * *",
    "@weekly": "0 0 * * 0",
    "@daily": "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@hourly": "0 * * * *",
  };
  const expr = SHORTCUTS[expression] || expression;

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: "${expression}". Expected 5 fields.`);
  }

  const [minute, hour, dom, month, dow] = parts;
  return {
    minute: parseField(minute, 0, 59),
    hour: parseField(hour, 0, 23),
    dayOfMonth: parseField(dom, 1, 31),
    month: parseField(month, 1, 12, MONTH_NAMES),
    dayOfWeek: parseField(dow, 0, 6, DAY_NAMES),
  };
}

/**
 * Compute the next run timestamp for a cron expression, after `after`.
 */
export function nextRunAfter(expression: string, after: Date = new Date()): Date {
  const cron = parseCron(expression);
  const candidate = new Date(after.getTime() + 60_000); // start at next minute
  candidate.setSeconds(0, 0);

  // Look up to 366 days ahead
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (
      cron.minute.has(candidate.getMinutes()) &&
      cron.hour.has(candidate.getHours()) &&
      cron.dayOfMonth.has(candidate.getDate()) &&
      cron.month.has(candidate.getMonth() + 1) &&
      cron.dayOfWeek.has(candidate.getDay())
    ) {
      return new Date(candidate);
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  throw new Error(`Could not find next run within 1 year for: "${expression}"`);
}

/**
 * Check if a cron expression matches the current minute.
 * Used for tick-based evaluation (called every minute by scheduler).
 */
export function cronMatches(expression: string, now: Date = new Date()): boolean {
  const cron = parseCron(expression);
  return (
    cron.minute.has(now.getMinutes()) &&
    cron.hour.has(now.getHours()) &&
    cron.dayOfMonth.has(now.getDate()) &&
    cron.month.has(now.getMonth() + 1) &&
    cron.dayOfWeek.has(now.getDay())
  );
}

// ────────────────────────────────────────────────────────────
// Scheduler — manages jobs, persistence, tick loop
// ────────────────────────────────────────────────────────────

export type JobRunner = (job: CronJob, expandedPrompt: string) => Promise<{ success: boolean; output?: string; error?: string }>;
export type Deliverer = (job: CronJob, output: string) => Promise<void>;

export interface SchedulerOptions {
  /**
   * Path to the heartbeat.json state file. Required.
   * Recommended: <workspacePath>/heartbeat.json
   */
  statePath: string;

  /**
   * Path to the cron.yaml config (optional, for loading static jobs).
   */
  configPath?: string;

  /**
   * Called when a job is due. Implementer runs the agent.
   */
  runJob: JobRunner;

  /**
   * Called with the output of a successful job, for delivery to
   * the target channel (Telegram, Slack, console, etc).
   */
  deliver?: Deliverer;

  /**
   * Verbose logging (default: false).
   */
  verbose?: boolean;
}

export class Scheduler {
  private jobs: Map<string, CronJob> = new Map();
  private statePath: string;
  private configPath?: string;
  private runJob: JobRunner;
  private deliver?: Deliverer;
  private verbose: boolean;
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(opts: SchedulerOptions) {
    this.statePath = opts.statePath;
    this.configPath = opts.configPath;
    this.runJob = opts.runJob;
    this.deliver = opts.deliver;
    this.verbose = opts.verbose ?? false;
    this.loadState();
  }

  /**
   * Load saved job state from disk.
   */
  private loadState(): void {
    if (!fs.existsSync(this.statePath)) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.statePath, "utf8"));
      if (data.jobs && Array.isArray(data.jobs)) {
        for (const job of data.jobs) {
          this.jobs.set(job.id, job);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[scheduler] failed to load state: ${(e as Error).message}`);
    }
  }

  /**
   * Persist current job state to disk.
   */
  private saveState(): void {
    try {
      const dir = path.dirname(this.statePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const data: CronJobsConfig = { jobs: Array.from(this.jobs.values()) };
      fs.writeFileSync(this.statePath, JSON.stringify(data, null, 2));
      if (process.platform !== "win32") {
        try { fs.chmodSync(this.statePath, 0o600); } catch { /* best effort */ }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[scheduler] failed to save state:`, e);
    }
  }

  /**
   * Add or replace a job.
   */
  addJob(job: Omit<CronJob, "runCount">): CronJob {
    // Validate cron expression
    try {
      parseCron(job.schedule);
    } catch (e) {
      throw new Error(`Invalid schedule: ${(e as Error).message}`);
    }

    const full: CronJob = {
      ...job,
      runCount: this.jobs.get(job.id)?.runCount ?? 0,
      nextRun: nextRunAfter(job.schedule).getTime(),
    };
    this.jobs.set(job.id, full);
    this.saveState();
    return full;
  }

  /**
   * Remove a job.
   */
  removeJob(id: string): boolean {
    const removed = this.jobs.delete(id);
    if (removed) this.saveState();
    return removed;
  }

  /**
   * Enable/disable a job (preserves history).
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    job.enabled = enabled;
    this.saveState();
    return true;
  }

  /**
   * List all jobs.
   */
  listJobs(): CronJob[] {
    return Array.from(this.jobs.values()).map((j) => ({ ...j }));
  }

  /**
   * Get a specific job.
   */
  getJob(id: string): CronJob | null {
    const job = this.jobs.get(id);
    return job ? { ...job } : null;
  }

  /**
   * Run a job immediately, bypassing schedule.
   */
  async runNow(id: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const job = this.jobs.get(id);
    if (!job) return { success: false, error: `Job not found: ${id}` };
    return this.execute(job);
  }

  /**
   * Expand prompt template with variables.
   */
  private expandPrompt(template: string): string {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return template
      .replace(/\{\{now\}\}/g, now.toISOString())
      .replace(/\{\{date\}\}/g, now.toISOString().split("T")[0])
      .replace(/\{\{yesterday\}\}/g, yesterday.toISOString().split("T")[0])
      .replace(/\{\{time\}\}/g, now.toTimeString().slice(0, 5))
      .replace(/\{\{weekday\}\}/g, now.toLocaleDateString("en-US", { weekday: "long" }))
      .replace(/\{\{user\}\}/g, process.env.USER || process.env.USERNAME || "user");
  }

  /**
   * Execute a single job: expand prompt, run agent, deliver result, update state.
   */
  private async execute(job: CronJob): Promise<{ success: boolean; output?: string; error?: string }> {
    const expanded = this.expandPrompt(job.prompt);

    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[scheduler] running job ${job.id} (${job.name})`);
    }

    let result: { success: boolean; output?: string; error?: string };
    try {
      result = await this.runJob(job, expanded);
    } catch (e) {
      result = { success: false, error: (e as Error).message };
    }

    job.lastRun = Date.now();
    job.runCount = (job.runCount || 0) + 1;
    if (result.success) {
      job.lastResult = "ok";
      job.lastError = undefined;
      // Deliver
      if (this.deliver && result.output) {
        try {
          await this.deliver(job, result.output);
        } catch (e) {
          // Delivery failure is not job failure, but log it
          if (this.verbose) {
            // eslint-disable-next-line no-console
            console.warn(`[scheduler] delivery failed for ${job.id}:`, e);
          }
        }
      }
    } else {
      job.lastResult = "error";
      job.lastError = result.error?.slice(0, 500);
    }
    job.nextRun = nextRunAfter(job.schedule).getTime();
    this.saveState();

    return result;
  }

  /**
   * Run one tick: find jobs that match the current minute and execute them.
   */
  async tick(): Promise<void> {
    if (this.running) {
      if (this.verbose) {
        // eslint-disable-next-line no-console
        console.log(`[scheduler] tick skipped — previous tick still running`);
      }
      return;
    }
    this.running = true;
    try {
      const now = new Date();
      for (const job of this.jobs.values()) {
        if (!job.enabled) continue;
        // Avoid double-running within the same minute
        if (job.lastRun && now.getTime() - job.lastRun < 60_000) continue;
        if (cronMatches(job.schedule, now)) {
          await this.execute(job); // serial — avoid resource contention
        }
      }
    } finally {
      this.running = false;
    }
  }

  /**
   * Start the tick loop (runs every 60 seconds).
   */
  start(): void {
    if (this.interval) return;
    // Align first tick to the next minute boundary for cleaner scheduling
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    setTimeout(() => {
      this.tick();
      this.interval = setInterval(() => this.tick(), 60_000);
    }, msToNextMinute);
    if (this.verbose) {
      // eslint-disable-next-line no-console
      console.log(`[scheduler] started, ${this.jobs.size} jobs registered`);
    }
  }

  /**
   * Stop the tick loop.
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
