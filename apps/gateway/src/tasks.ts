// ============================================================
// 🌒 Background Tasks — Long-running agent work
// ============================================================
//
// Inspired by OpenClaw's tasks/taskflow. Lets users say things like:
//   - "Remind me in 30 minutes"
//   - "Prepare this report and message me when done"
//   - "Check the BTC price every hour"
//
// PRIVACY: All task state lives in ~/.openvesper/tasks/ (mode 0600).
// No state crosses the network.

import fs from "fs/promises";
import path from "path";
import os from "os";
import { EventEmitter } from "events";

export type TaskStatus = "scheduled" | "running" | "complete" | "error" | "cancelled";

export type TaskKind =
  | "reminder"       // notify at time T with message
  | "deferred-run"   // run agent prompt at time T
  | "deferred-now";  // run now in background, notify when done

export interface Task {
  id: string;
  kind: TaskKind;
  sessionKey: string;
  agent?: string;
  channel: string;
  /** What to do — prompt text or reminder message */
  payload: string;
  /** When to run (epoch ms). Use Date.now() for immediate. */
  runAt: number;
  /** Optional: recurring interval in ms */
  recurEveryMs?: number;
  createdAt: number;
  status: TaskStatus;
  startedAt: number | null;
  completedAt: number | null;
  result: string | null;
  error: string | null;
}

const TASKS_DIR = path.join(os.homedir(), ".openvesper", "tasks");

export class TaskManager extends EventEmitter {
  private tasks = new Map<string, Task>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private executor?: (task: Task) => Promise<string>;

  /** Inject the function that actually runs the agent for deferred-run tasks */
  setExecutor(fn: (task: Task) => Promise<string>) {
    this.executor = fn;
  }

  async init(): Promise<void> {
    await fs.mkdir(TASKS_DIR, { recursive: true, mode: 0o700 });
    await this.loadFromDisk();
  }

  start(checkIntervalMs = 5000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(console.error), checkIntervalMs);
    console.log(`[tasks] Daemon started (check every ${checkIntervalMs / 1000}s)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async create(
    input: Omit<Task, "id" | "createdAt" | "status" | "startedAt" | "completedAt" | "result" | "error">
  ): Promise<Task> {
    const task: Task = {
      ...input,
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      status: "scheduled",
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
    };
    this.tasks.set(task.id, task);
    await this.save(task);
    this.emit("created", task);
    return task;
  }

  async cancel(id: string): Promise<boolean> {
    const t = this.tasks.get(id);
    if (!t || t.status === "complete" || t.status === "cancelled") return false;
    t.status = "cancelled";
    t.completedAt = Date.now();
    await this.save(t);
    this.emit("cancelled", t);
    return true;
  }

  list(filter?: { status?: TaskStatus; sessionKey?: string }): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => {
        if (filter?.status && t.status !== filter.status) return false;
        if (filter?.sessionKey && t.sessionKey !== filter.sessionKey) return false;
        return true;
      })
      .sort((a, b) => a.runAt - b.runAt);
  }

  get(id: string): Task | null {
    return this.tasks.get(id) || null;
  }

  status() {
    return {
      total: this.tasks.size,
      scheduled: this.list({ status: "scheduled" }).length,
      running: this.list({ status: "running" }).length,
      complete: this.list({ status: "complete" }).length,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.status !== "scheduled") continue;
      if (task.runAt > now) continue;
      await this.execute(task);
    }
  }

  private async execute(task: Task): Promise<void> {
    task.status = "running";
    task.startedAt = Date.now();
    await this.save(task);
    this.emit("started", task);

    try {
      let result: string;
      if (task.kind === "reminder") {
        // Reminders just emit — caller decides how to deliver
        result = `⏰ Reminder: ${task.payload}`;
        this.emit("reminder", { task, message: result });
      } else if (this.executor) {
        result = await this.executor(task);
      } else {
        result = `[no executor configured for task ${task.id}]`;
      }

      task.status = "complete";
      task.completedAt = Date.now();
      task.result = result;
      this.emit("complete", task);

      // Recurring? schedule next
      if (task.recurEveryMs) {
        await this.create({
          kind: task.kind,
          sessionKey: task.sessionKey,
          agent: task.agent,
          channel: task.channel,
          payload: task.payload,
          runAt: Date.now() + task.recurEveryMs,
          recurEveryMs: task.recurEveryMs,
        });
      }
    } catch (err) {
      task.status = "error";
      task.completedAt = Date.now();
      task.error = err instanceof Error ? err.message : String(err);
      this.emit("error", task);
    }

    await this.save(task);
  }

  private async save(task: Task): Promise<void> {
    this.tasks.set(task.id, task);
    const filePath = path.join(TASKS_DIR, `${task.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(task, null, 2), { mode: 0o600 });
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const files = await fs.readdir(TASKS_DIR);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = await fs.readFile(path.join(TASKS_DIR, file), "utf-8");
          const task = JSON.parse(raw) as Task;
          this.tasks.set(task.id, task);
        } catch {
          // skip corrupted task files
        }
      }
      console.log(`[tasks] Loaded ${this.tasks.size} task(s) from disk`);
    } catch {
      // dir doesn't exist yet
    }
  }
}

export const taskManager = new TaskManager();
