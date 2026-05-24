// ============================================================
// 🌒 Session Lane — Per-session execution lock
// ============================================================
//
// Prevents race conditions when two messages arrive for the same session
// while a run is in progress. OpenClaw calls this a "session lane".
//
// Behavior:
//   - First request acquires the lane and starts running.
//   - Subsequent requests for the same session wait (or steer the running
//     agent, depending on queue mode — see queue.ts).
//   - Different sessions run in parallel up to globalMaxConcurrent.
//
// PRIVACY: This lives in-process only. No state crosses process restarts.

import { EventEmitter } from "events";

export type LaneState = "idle" | "running" | "queued";

interface LaneRecord {
  sessionKey: string;
  state: LaneState;
  runId: string | null;
  startedAt: number | null;
  waiters: Array<() => void>;
}

class SessionLaneManager extends EventEmitter {
  private lanes = new Map<string, LaneRecord>();
  private globalMaxConcurrent: number;
  private activeRuns = 0;
  private globalWaiters: Array<() => void> = [];

  constructor(globalMaxConcurrent = 4) {
    super();
    this.globalMaxConcurrent = globalMaxConcurrent;
  }

  /**
   * Acquire the lane for a session. Resolves when the lane is free.
   * Returns a release function that MUST be called when the run ends.
   */
  async acquire(sessionKey: string, runId: string): Promise<() => void> {
    const lane = this.getOrCreateLane(sessionKey);

    // Wait for global slot
    while (this.activeRuns >= this.globalMaxConcurrent) {
      await new Promise<void>((resolve) => this.globalWaiters.push(resolve));
    }

    // Wait for session slot (this session not already running)
    while (lane.state === "running") {
      await new Promise<void>((resolve) => lane.waiters.push(resolve));
    }

    // Acquire
    lane.state = "running";
    lane.runId = runId;
    lane.startedAt = Date.now();
    this.activeRuns++;
    this.emit("acquired", { sessionKey, runId });

    let released = false;
    return () => {
      if (released) return;
      released = true;
      lane.state = "idle";
      lane.runId = null;
      lane.startedAt = null;
      this.activeRuns--;
      this.emit("released", { sessionKey, runId });

      // Wake next session waiter
      const next = lane.waiters.shift();
      if (next) next();

      // Wake next global waiter
      const nextGlobal = this.globalWaiters.shift();
      if (nextGlobal) nextGlobal();
    };
  }

  /** Try acquire without waiting. Returns release fn or null. */
  tryAcquire(sessionKey: string, runId: string): (() => void) | null {
    const lane = this.getOrCreateLane(sessionKey);
    if (lane.state === "running") return null;
    if (this.activeRuns >= this.globalMaxConcurrent) return null;
    lane.state = "running";
    lane.runId = runId;
    lane.startedAt = Date.now();
    this.activeRuns++;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      lane.state = "idle";
      lane.runId = null;
      lane.startedAt = null;
      this.activeRuns--;
      const next = lane.waiters.shift();
      if (next) next();
      const nextGlobal = this.globalWaiters.shift();
      if (nextGlobal) nextGlobal();
    };
  }

  isRunning(sessionKey: string): boolean {
    return this.lanes.get(sessionKey)?.state === "running";
  }

  currentRunId(sessionKey: string): string | null {
    return this.lanes.get(sessionKey)?.runId || null;
  }

  status() {
    return {
      activeRuns: this.activeRuns,
      globalMax: this.globalMaxConcurrent,
      lanes: Array.from(this.lanes.entries()).map(([k, l]) => ({
        sessionKey: k,
        state: l.state,
        runId: l.runId,
        runningMs: l.startedAt ? Date.now() - l.startedAt : null,
        waitersCount: l.waiters.length,
      })),
    };
  }

  private getOrCreateLane(sessionKey: string): LaneRecord {
    let lane = this.lanes.get(sessionKey);
    if (!lane) {
      lane = {
        sessionKey,
        state: "idle",
        runId: null,
        startedAt: null,
        waiters: [],
      };
      this.lanes.set(sessionKey, lane);
    }
    return lane;
  }
}

export const sessionLanes = new SessionLaneManager(
  parseInt(process.env.OPENVESPER_MAX_CONCURRENT || "4", 10)
);
