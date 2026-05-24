// ============================================================
// 🌒 vesper cron <subcommand>
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function color(s: string, c: keyof typeof COLOR) {
  return `${COLOR[c]}${s}${COLOR.reset}`;
}

function statePath(): string {
  const home = process.env.HOME || "";
  return path.join(home, ".openvesper", "workspace", "heartbeat.json");
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  prompt: string;
  deliver_to?: string;
  enabled: boolean;
  lastRun?: number;
  lastResult?: string;
  lastError?: string;
  nextRun?: number;
  runCount: number;
}

function loadJobs(): CronJob[] {
  const p = statePath();
  if (!fs.existsSync(p)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    return Array.isArray(data?.jobs) ? data.jobs : [];
  } catch {
    return [];
  }
}

function saveJobs(jobs: CronJob[]): void {
  const p = statePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(p, JSON.stringify({ jobs }, null, 2));
  if (process.platform !== "win32") {
    try { fs.chmodSync(p, 0o600); } catch { /* best effort */ }
  }
}

function formatTime(ts?: number): string {
  if (!ts) return color("—", "dim");
  const d = new Date(ts);
  return d.toLocaleString();
}

// ── cron list ───────────────────────────────────────────────

export function listJobs(opts: { json?: boolean }) {
  const jobs = loadJobs();

  if (opts.json) {
    console.log(JSON.stringify(jobs, null, 2));
    return;
  }

  console.log(color(`\n🌒 Scheduled jobs (${jobs.length})\n`, "cyan"));

  if (jobs.length === 0) {
    console.log(color("No jobs configured.", "dim"));
    console.log();
    console.log(color("Add one: vesper cron add <id> --schedule '0 8 * * *' --agent <mode> --prompt '...'", "cyan"));
    console.log();
    return;
  }

  console.log(color("Status   ID                          Schedule           Agent              Last run             Next run", "dim"));
  console.log(color("───────  ──────────────────────────  ─────────────────  ─────────────────  ───────────────────  ───────────────────", "dim"));

  for (const j of jobs) {
    const status = j.enabled
      ? j.lastResult === "error"
        ? color("ERROR  ", "red")
        : color("ENABLED", "green")
      : color("OFF    ", "dim");
    const id = j.id.padEnd(26);
    const sched = j.schedule.padEnd(17);
    const agent = j.agent.padEnd(17);
    const last = formatTime(j.lastRun).padEnd(19);
    const next = j.enabled ? formatTime(j.nextRun) : color("—", "dim");
    console.log(`${status}  ${color(id, "bold")}  ${sched}  ${agent}  ${last}  ${next}`);
  }
  console.log();
  console.log(color("Tip:", "dim") + color(" vesper cron run <id>", "cyan") + color("   — run now", "dim"));
  console.log(color("    ", "dim") + color(" vesper cron toggle <id>", "cyan") + color(" — enable/disable", "dim"));
  console.log();
}

// ── cron add ────────────────────────────────────────────────

export function addJob(args: Record<string, string>): void {
  const id = args.id || args.name;
  if (!id) {
    console.error(color("Error: --id required", "red"));
    process.exit(1);
  }
  if (!args.schedule) {
    console.error(color("Error: --schedule required (e.g., '0 8 * * *')", "red"));
    process.exit(1);
  }
  if (!args.agent) {
    console.error(color("Error: --agent required", "red"));
    process.exit(1);
  }
  if (!args.prompt) {
    console.error(color("Error: --prompt required", "red"));
    process.exit(1);
  }

  // Validate cron expression with a basic check
  const parts = args.schedule.trim().split(/\s+/);
  const isShortcut = args.schedule.startsWith("@");
  if (!isShortcut && parts.length !== 5) {
    console.error(color(`Error: invalid schedule "${args.schedule}" (need 5 fields or @shortcut)`, "red"));
    process.exit(1);
  }

  const jobs = loadJobs();
  const existing = jobs.findIndex((j) => j.id === id);

  const job: CronJob = {
    id,
    name: args.name || id,
    schedule: args.schedule,
    agent: args.agent,
    prompt: args.prompt,
    deliver_to: args.deliver_to || args["deliver-to"],
    enabled: args.disabled === "true" ? false : true,
    runCount: existing >= 0 ? jobs[existing].runCount : 0,
  };

  if (existing >= 0) {
    jobs[existing] = job;
    console.log(color(`\n✓ Updated job ${id}\n`, "green"));
  } else {
    jobs.push(job);
    console.log(color(`\n✓ Added job ${id}\n`, "green"));
  }

  saveJobs(jobs);

  console.log(color(`  ID:       ${job.id}`, "dim"));
  console.log(color(`  Schedule: ${job.schedule}`, "dim"));
  console.log(color(`  Agent:    ${job.agent}`, "dim"));
  console.log(color(`  Enabled:  ${job.enabled}`, "dim"));
  if (job.deliver_to) {
    console.log(color(`  Deliver:  ${job.deliver_to}`, "dim"));
  }
  console.log();
  console.log(color("Run now: ", "dim") + color(`vesper cron run ${job.id}`, "cyan"));
  console.log(color("List:    ", "dim") + color("vesper cron list", "cyan"));
  console.log();
}

// ── cron remove ─────────────────────────────────────────────

export function removeJob(id: string): void {
  const jobs = loadJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) {
    console.error(color(`Job not found: ${id}`, "red"));
    process.exit(1);
  }
  jobs.splice(idx, 1);
  saveJobs(jobs);
  console.log(color(`\n✓ Removed job ${id}\n`, "green"));
}

// ── cron toggle ─────────────────────────────────────────────

export function toggleJob(id: string): void {
  const jobs = loadJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) {
    console.error(color(`Job not found: ${id}`, "red"));
    process.exit(1);
    return; // unreachable but helps TS narrowing
  }
  job.enabled = !job.enabled;
  saveJobs(jobs);
  console.log(color(`\n✓ Job ${id} is now ${job.enabled ? "ENABLED" : "DISABLED"}\n`, job.enabled ? "green" : "yellow"));
}

// ── cron run ────────────────────────────────────────────────

export async function runJobNow(id: string): Promise<void> {
  const jobs = loadJobs();
  const job = jobs.find((j) => j.id === id);
  if (!job) {
    console.error(color(`Job not found: ${id}`, "red"));
    process.exit(1);
    return;
  }

  console.log(color(`\n🌒 Running job: ${job.id}\n`, "cyan"));
  console.log(color(`  Agent:  ${job.agent}`, "dim"));
  console.log(color(`  Prompt: ${job.prompt.slice(0, 100)}${job.prompt.length > 100 ? "..." : ""}`, "dim"));
  console.log();
  console.log(color("Note: actual agent execution requires the daemon running.", "yellow"));
  console.log(color("Use: vesper daemon start  (Sprint 6+)", "dim"));
  console.log();
  console.log(color("For now, this updates the job's lastRun timestamp.", "dim"));

  job.lastRun = Date.now();
  job.runCount = (job.runCount || 0) + 1;
  job.lastResult = "ok";
  saveJobs(jobs);
}

// ── cron status ─────────────────────────────────────────────

export function cronStatus(): void {
  const jobs = loadJobs();
  const enabled = jobs.filter((j) => j.enabled);
  const errors = jobs.filter((j) => j.lastResult === "error");
  const totalRuns = jobs.reduce((s, j) => s + (j.runCount || 0), 0);

  console.log(color(`\n🌒 Cron status\n`, "cyan"));
  console.log(`  Total jobs:      ${color(String(jobs.length), "bold")}`);
  console.log(`  Enabled:         ${color(String(enabled.length), "green")}`);
  console.log(`  Disabled:        ${color(String(jobs.length - enabled.length), "dim")}`);
  console.log(`  Errors:          ${errors.length > 0 ? color(String(errors.length), "red") : color("0", "dim")}`);
  console.log(`  Total runs:      ${totalRuns}`);
  console.log(`  State file:      ${statePath()}`);
  console.log();

  if (errors.length > 0) {
    console.log(color("Jobs with last error:", "red"));
    for (const e of errors) {
      console.log(color(`  • ${e.id}: ${e.lastError || "unknown error"}`, "dim"));
    }
    console.log();
  }
}
