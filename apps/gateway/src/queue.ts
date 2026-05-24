// ============================================================
// 🌒 Command Queue — Handle messages arriving mid-run
// ============================================================
//
// When a session is already running and a new message arrives, what happens?
//
// 3 modes (OpenClaw-style):
//
//   steer:    Inject into the active runtime. Pending messages are delivered
//             after the current tool calls, before the next LLM call.
//             Use this for "Wait, instead of that, do X" interruptions.
//
//   followup: Don't steer. Queue messages for a new agent turn after the
//             current one ends. Default debounce of 1s to coalesce rapid
//             messages.
//
//   collect:  Don't steer. Hold messages until the run ends, then deliver
//             them as a structured batch ("you said A, then B, then C").
//
// Default per-session mode: steer (most useful for interactive use).
//
// PRIVACY: All queue state is in-process. Nothing written to disk.

import { EventEmitter } from "events";

export type QueueMode = "steer" | "followup" | "collect";

export interface QueueOptions {
  mode: QueueMode;
  debounceMs?: number;  // wait for quiet before draining (followup/collect)
  cap?: number;         // max messages to keep before drop
  drop?: "oldest" | "newest" | "summarize";
}

export interface QueuedMessage {
  id: string;
  sessionKey: string;
  message: string;
  channel: string;
  agent?: string;
  metadata?: Record<string, unknown>;
  enqueuedAt: number;
}

const DEFAULT_OPTIONS: QueueOptions = {
  mode: "steer",
  debounceMs: 1000,
  cap: 20,
  drop: "summarize",
};

class CommandQueue extends EventEmitter {
  private queues = new Map<string, QueuedMessage[]>();
  private sessionOptions = new Map<string, QueueOptions>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private droppedNotes = new Map<string, string[]>();

  /** Set queue mode for a specific session (e.g. via `/queue steer` command) */
  setSessionMode(sessionKey: string, opts: Partial<QueueOptions>): QueueOptions {
    const current = this.sessionOptions.get(sessionKey) || { ...DEFAULT_OPTIONS };
    const merged = { ...current, ...opts };
    this.sessionOptions.set(sessionKey, merged);
    return merged;
  }

  resetSessionMode(sessionKey: string): void {
    this.sessionOptions.delete(sessionKey);
  }

  getMode(sessionKey: string): QueueOptions {
    return this.sessionOptions.get(sessionKey) || { ...DEFAULT_OPTIONS };
  }

  /** Enqueue a message arriving while a session is busy */
  enqueue(msg: Omit<QueuedMessage, "id" | "enqueuedAt">): { mode: QueueMode; queueLength: number } {
    const opts = this.getMode(msg.sessionKey);
    const queue = this.queues.get(msg.sessionKey) || [];

    const full: QueuedMessage = {
      ...msg,
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      enqueuedAt: Date.now(),
    };

    queue.push(full);

    // Apply cap with drop policy
    const cap = opts.cap || 20;
    if (queue.length > cap) {
      const overflow = queue.length - cap;
      if (opts.drop === "newest") {
        // Drop latest (the one we just added)
        const dropped = queue.splice(-overflow);
        this.recordDropped(msg.sessionKey, dropped);
      } else if (opts.drop === "summarize") {
        // Drop oldest, keep a summary note
        const dropped = queue.splice(0, overflow);
        this.recordDropped(msg.sessionKey, dropped);
      } else {
        // Drop oldest silently
        queue.splice(0, overflow);
      }
    }

    this.queues.set(msg.sessionKey, queue);
    this.emit("enqueued", { sessionKey: msg.sessionKey, message: full, mode: opts.mode });

    return { mode: opts.mode, queueLength: queue.length };
  }

  /** Drain the queue for a session — call after a run ends */
  drain(sessionKey: string): QueuedMessage[] {
    const queue = this.queues.get(sessionKey) || [];
    this.queues.delete(sessionKey);
    this.cancelDebounce(sessionKey);

    // Inject dropped-notes summary if any
    const dropped = this.droppedNotes.get(sessionKey);
    if (dropped && dropped.length > 0) {
      queue.unshift({
        id: `q_summary_${Date.now()}`,
        sessionKey,
        message: `[Summary of ${dropped.length} dropped messages while busy: ${dropped.join(" | ")}]`,
        channel: "summary",
        enqueuedAt: Date.now(),
      });
      this.droppedNotes.delete(sessionKey);
    }

    return queue;
  }

  /** Peek without draining */
  peek(sessionKey: string): QueuedMessage[] {
    return [...(this.queues.get(sessionKey) || [])];
  }

  /** Schedule debounced drain (for followup/collect modes) */
  scheduleDebouncedDrain(sessionKey: string, callback: (messages: QueuedMessage[]) => void): void {
    const opts = this.getMode(sessionKey);
    this.cancelDebounce(sessionKey);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(sessionKey);
      const messages = this.drain(sessionKey);
      if (messages.length > 0) callback(messages);
    }, opts.debounceMs || 1000);

    this.debounceTimers.set(sessionKey, timer);
  }

  cancelDebounce(sessionKey: string): void {
    const timer = this.debounceTimers.get(sessionKey);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionKey);
    }
  }

  /** Format multiple queued messages as a single prompt (for collect mode) */
  formatBatched(messages: QueuedMessage[]): string {
    if (messages.length === 0) return "";
    if (messages.length === 1) return messages[0].message;
    return messages
      .map((m, i) => `[message ${i + 1}/${messages.length}]\n${m.message}`)
      .join("\n\n---\n\n");
  }

  status() {
    return {
      activeQueues: this.queues.size,
      perSessionModes: Object.fromEntries(this.sessionOptions),
      queues: Array.from(this.queues.entries()).map(([k, q]) => ({
        sessionKey: k,
        length: q.length,
        oldestAge: q.length > 0 ? Date.now() - q[0].enqueuedAt : 0,
      })),
    };
  }

  private recordDropped(sessionKey: string, dropped: QueuedMessage[]): void {
    const notes = this.droppedNotes.get(sessionKey) || [];
    for (const d of dropped) {
      notes.push(d.message.slice(0, 50));
    }
    this.droppedNotes.set(sessionKey, notes);
  }
}

export const commandQueue = new CommandQueue();
