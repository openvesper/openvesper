// ============================================================
// 🌒 Run Registry — Track in-flight runs for async API
// ============================================================
//
// When a client calls POST /agent (sync), they block on the HTTP request
// until the run finishes. For long-running tasks this is bad.
//
// Async pattern (OpenClaw-style):
//   POST /agent      → immediately returns { runId, acceptedAt }
//   POST /agent/wait → blocks until that runId completes
//   POST /agent/abort → cancels a running runId
//
// PRIVACY: In-process only. Run records auto-expire after 30 min.

import { EventEmitter } from "events";

export type RunStatus = "queued" | "running" | "complete" | "error" | "aborted";

export interface RunRecord {
  runId: string;
  sessionKey: string;
  agent: string;
  channel: string;
  status: RunStatus;
  acceptedAt: number;
  startedAt: number | null;
  endedAt: number | null;
  reply: string | null;
  error: string | null;
  abortController: AbortController;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

class RunRegistry extends EventEmitter {
  private runs = new Map<string, RunRecord>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    super();
    // Clean up expired runs every 5 min
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
    // Don't block process exit on this timer
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      (this.cleanupTimer as { unref?: () => void }).unref?.();
    }
  }

  /** Create a new run record (status: queued) */
  create(sessionKey: string, agent: string, channel: string): RunRecord {
    const runId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const record: RunRecord = {
      runId,
      sessionKey,
      agent,
      channel,
      status: "queued",
      acceptedAt: Date.now(),
      startedAt: null,
      endedAt: null,
      reply: null,
      error: null,
      abortController: new AbortController(),
    };
    this.runs.set(runId, record);
    this.emit("created", record);
    return record;
  }

  markStarted(runId: string): void {
    const r = this.runs.get(runId);
    if (!r) return;
    r.status = "running";
    r.startedAt = Date.now();
    this.emit("started", r);
  }

  markComplete(runId: string, reply: string): void {
    const r = this.runs.get(runId);
    if (!r) return;
    r.status = "complete";
    r.endedAt = Date.now();
    r.reply = reply;
    this.emit("complete", r);
  }

  markError(runId: string, error: string): void {
    const r = this.runs.get(runId);
    if (!r) return;
    r.status = "error";
    r.endedAt = Date.now();
    r.error = error;
    this.emit("error", r);
  }

  abort(runId: string): boolean {
    const r = this.runs.get(runId);
    if (!r) return false;
    if (r.status === "complete" || r.status === "error" || r.status === "aborted") {
      return false;
    }
    r.abortController.abort();
    r.status = "aborted";
    r.endedAt = Date.now();
    r.error = "Aborted by client";
    this.emit("aborted", r);
    return true;
  }

  get(runId: string): RunRecord | null {
    return this.runs.get(runId) || null;
  }

  /** Block until run completes (or timeout). Returns final record. */
  async wait(runId: string, timeoutMs = 5 * 60 * 1000): Promise<RunRecord> {
    const r = this.runs.get(runId);
    if (!r) throw new Error(`No such runId: ${runId}`);

    // Already done?
    if (r.status === "complete" || r.status === "error" || r.status === "aborted") {
      return r;
    }

    // Wait for completion event
    return new Promise<RunRecord>((resolve, reject) => {
      let settled = false;
      const onSettle = (rec: RunRecord) => {
        if (rec.runId !== runId) return;
        if (settled) return;
        settled = true;
        cleanup();
        resolve(rec);
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(`Timeout waiting for run ${runId}`));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        this.off("complete", onSettle);
        this.off("error", onSettle);
        this.off("aborted", onSettle);
      };
      this.on("complete", onSettle);
      this.on("error", onSettle);
      this.on("aborted", onSettle);
    });
  }

  listActive(): RunRecord[] {
    return Array.from(this.runs.values()).filter(
      (r) => r.status === "queued" || r.status === "running"
    );
  }

  status() {
    return {
      total: this.runs.size,
      active: this.listActive().length,
    };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, r] of this.runs) {
      if (r.endedAt && now - r.endedAt > TTL_MS) {
        this.runs.delete(id);
      }
    }
  }
}

export const runRegistry = new RunRegistry();
