// ============================================================
// 🌒 Agent Loop — OpenClaw-style execution with full plumbing
// ============================================================
//
// Lifecycle: intake → command-check → lane-acquire → context → model
//            → tools → persist → drain-queue
//
// Hooks emitted:
//   - agent:bootstrap    (before model call, can inject context)
//   - agent:tool-call    (when LLM decides to call a tool)
//   - agent:tool-result  (after tool execution)
//   - agent:complete     (final reply ready)
//   - agent:error        (something failed)
//   - agent:queued       (run rejected due to busy session, message queued)
//
// PRIVACY: All state lives in user's machine (~/.openvesper/). No server-side
// retention. EventEmitter callbacks are in-process only.

import { EventEmitter } from "events";
import path from "path";
import { sessionStore, type SessionMessage } from "./sessions.js";
import { sessionLanes } from "./session-lane.js";
import { commandQueue, type QueuedMessage } from "./queue.js";
import { runRegistry, type RunRecord } from "./run-registry.js";
import { tryHandleCommand } from "./commands.js";

export interface AgentLoopRequest {
  sessionKey: string;
  message: string;
  channel: string;
  agent?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentLoopResponse {
  sessionId: string;
  runId: string;
  reply: string;
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
  durationMs: number;
  agent: string;
  status: "ok" | "queued" | "command" | "error";
}

export class AgentLoop extends EventEmitter {
  /**
   * Run a single agent loop iteration.
   * Returns immediately if the session is busy (queues message instead).
   */
  async run(req: AgentLoopRequest): Promise<AgentLoopResponse> {
    const start = Date.now();

    // 1. Intercept channel commands BEFORE acquiring any locks
    const cmdResult = await tryHandleCommand({
      sessionKey: req.sessionKey,
      message: req.message,
      channel: req.channel,
    });
    if (cmdResult.handled) {
      return {
        sessionId: "command",
        runId: "command",
        reply: cmdResult.reply || "",
        toolCalls: [],
        durationMs: Date.now() - start,
        agent: req.agent || "command",
        status: "command",
      };
    }

    const session = await sessionStore.getOrCreate(req.sessionKey, req.agent || "auto");
    const activeAgent = req.agent || session.agent;

    // 2. Check if session is busy — if yes, queue/steer based on mode
    if (sessionLanes.isRunning(req.sessionKey)) {
      const queueResult = commandQueue.enqueue({
        sessionKey: req.sessionKey,
        message: req.message,
        channel: req.channel,
        agent: req.agent,
        metadata: req.metadata,
      });

      this.emit("agent:queued", {
        sessionId: session.id,
        mode: queueResult.mode,
        queueLength: queueResult.queueLength,
      });

      return {
        sessionId: session.id,
        runId: "queued",
        reply: `[Queued. Mode: ${queueResult.mode}. Position: ${queueResult.queueLength}.]`,
        toolCalls: [],
        durationMs: Date.now() - start,
        agent: activeAgent,
        status: "queued",
      };
    }

    // 3. Create run record + acquire session lane
    const run = runRegistry.create(req.sessionKey, activeAgent, req.channel);
    const release = await sessionLanes.acquire(req.sessionKey, run.runId);
    runRegistry.markStarted(run.runId);

    try {
      const result = await this.executeRun(run, req, session.id);
      return {
        ...result,
        durationMs: Date.now() - start,
      };
    } finally {
      release();
      // Process any messages that piled up while we were running
      this.processQueuedMessages(req.sessionKey).catch(console.error);
    }
  }

  /**
   * Async variant: returns immediately with runId. Caller polls or waits.
   * Equivalent to OpenClaw's `agent.run()` returning `{ runId, acceptedAt }`.
   */
  async runAsync(req: AgentLoopRequest): Promise<{ runId: string; acceptedAt: number; status: string }> {
    // Same command check
    const cmdResult = await tryHandleCommand({
      sessionKey: req.sessionKey,
      message: req.message,
      channel: req.channel,
    });
    if (cmdResult.handled) {
      // Commands are sync — return synthetic completed run
      const run = runRegistry.create(req.sessionKey, req.agent || "command", req.channel);
      runRegistry.markComplete(run.runId, cmdResult.reply || "");
      return { runId: run.runId, acceptedAt: run.acceptedAt, status: "command" };
    }

    const session = await sessionStore.getOrCreate(req.sessionKey, req.agent || "auto");
    const activeAgent = req.agent || session.agent;

    if (sessionLanes.isRunning(req.sessionKey)) {
      const queueResult = commandQueue.enqueue({
        sessionKey: req.sessionKey,
        message: req.message,
        channel: req.channel,
        agent: req.agent,
      });
      return {
        runId: "queued",
        acceptedAt: Date.now(),
        status: `queued (mode=${queueResult.mode})`,
      };
    }

    const run = runRegistry.create(req.sessionKey, activeAgent, req.channel);

    // Fire-and-forget — execute in background
    (async () => {
      const release = await sessionLanes.acquire(req.sessionKey, run.runId);
      runRegistry.markStarted(run.runId);
      try {
        await this.executeRun(run, req, session.id);
      } catch (err) {
        runRegistry.markError(
          run.runId,
          err instanceof Error ? err.message : "unknown error"
        );
      } finally {
        release();
        this.processQueuedMessages(req.sessionKey).catch(console.error);
      }
    })();

    return { runId: run.runId, acceptedAt: run.acceptedAt, status: "accepted" };
  }

  /** Core execution — assumes lane is held */
  private async executeRun(
    run: RunRecord,
    req: AgentLoopRequest,
    sessionId: string
  ): Promise<Omit<AgentLoopResponse, "durationMs">> {
    // Record user message
    await sessionStore.appendMessage(req.sessionKey, {
      role: "user",
      content: req.message,
      timestamp: Date.now(),
      channel: req.channel,
    });

    // Bootstrap hook
    this.emit("agent:bootstrap", {
      sessionId,
      runId: run.runId,
      agent: run.agent,
      channel: req.channel,
    });

    // Build context from recent messages
    const session = await sessionStore.getOrCreate(req.sessionKey);
    const recentMessages = session.messages.slice(-20);

    // Check abort before LLM call
    if (run.abortController.signal.aborted) {
      runRegistry.markError(run.runId, "Aborted");
      return {
        sessionId,
        runId: run.runId,
        reply: "[Aborted by /stop]",
        toolCalls: [],
        agent: run.agent,
        status: "error",
      };
    }

    // Call LLM
    let reply: string;
    let toolCalls: Array<{ name: string; input: unknown; output: unknown }> = [];

    try {
      const result = await this.callLLM(run.agent, recentMessages, run.abortController.signal);
      reply = result.reply;
      toolCalls = result.toolCalls;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emit("agent:error", { sessionId, runId: run.runId, error: msg });
      runRegistry.markError(run.runId, msg);
      return {
        sessionId,
        runId: run.runId,
        reply: `Error: ${msg}`,
        toolCalls: [],
        agent: run.agent,
        status: "error",
      };
    }

    // Record assistant reply
    await sessionStore.appendMessage(req.sessionKey, {
      role: "assistant",
      content: reply,
      timestamp: Date.now(),
      channel: req.channel,
    });

    runRegistry.markComplete(run.runId, reply);
    this.emit("agent:complete", {
      sessionId,
      runId: run.runId,
      reply,
      toolCalls,
    });

    return {
      sessionId,
      runId: run.runId,
      reply,
      toolCalls,
      agent: run.agent,
      status: "ok",
    };
  }

  /** Drain any queued messages after a run ends */
  private async processQueuedMessages(sessionKey: string): Promise<void> {
    const queued = commandQueue.peek(sessionKey);
    if (queued.length === 0) return;

    const opts = commandQueue.getMode(sessionKey);

    if (opts.mode === "followup") {
      // Schedule with debounce
      commandQueue.scheduleDebouncedDrain(sessionKey, async (messages) => {
        await this.runQueuedBatch(sessionKey, messages);
      });
    } else if (opts.mode === "collect") {
      // Schedule with debounce, format as batched
      commandQueue.scheduleDebouncedDrain(sessionKey, async (messages) => {
        const batched = commandQueue.formatBatched(messages);
        if (messages.length > 0) {
          await this.run({
            sessionKey,
            message: batched,
            channel: messages[0].channel,
            agent: messages[0].agent,
          });
        }
      });
    } else {
      // steer mode — but the original run is done now, so treat as followup
      const messages = commandQueue.drain(sessionKey);
      await this.runQueuedBatch(sessionKey, messages);
    }
  }

  private async runQueuedBatch(sessionKey: string, messages: QueuedMessage[]): Promise<void> {
    // Run each queued message as a separate turn
    for (const msg of messages) {
      await this.run({
        sessionKey,
        message: msg.message,
        channel: msg.channel,
        agent: msg.agent,
        metadata: msg.metadata,
      });
    }
  }

  // ── LLM integration ────────────────────────────────────────────────

  private vesperInstance: { run: (opts: { agent?: string; message: string }) => Promise<string> } | null = null;
  private vesperLoading: Promise<unknown> | null = null;

  private async getVesper() {
    if (this.vesperInstance) return this.vesperInstance;
    if (this.vesperLoading) {
      await this.vesperLoading;
      return this.vesperInstance;
    }

    this.vesperLoading = (async () => {
      try {
        const { createVesper } = (await import("@openvesper/core")) as {
          createVesper: (opts: unknown) => unknown;
        };
        const v = createVesper({ autoLoad: true }) as {
          useAgentDirectory: (dir: string) => unknown;
          run: (opts: { agent?: string; message: string }) => Promise<string>;
        };
        try {
          v.useAgentDirectory(path.join(process.cwd(), ".agents"));
        } catch {
          // ignore
        }
        this.vesperInstance = v as { run: (opts: { agent?: string; message: string }) => Promise<string> };
      } catch (err) {
        console.error("[agent-loop] Failed to load Vesper runtime:", err);
        this.vesperInstance = null;
      }
    })();

    await this.vesperLoading;
    return this.vesperInstance;
  }

  private async callLLM(
    agent: string,
    messages: SessionMessage[],
    abortSignal?: AbortSignal
  ): Promise<{ reply: string; toolCalls: Array<{ name: string; input: unknown; output: unknown }> }> {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return { reply: "(no user message)", toolCalls: [] };

    // Check abort
    if (abortSignal?.aborted) {
      throw new Error("Aborted");
    }

    const vesper = await this.getVesper();
    if (!vesper) {
      return {
        reply: `[${agent}] Runtime not available. Echo: ${lastUserMsg.content}`,
        toolCalls: [],
      };
    }

    try {
      const reply = await vesper.run({ agent, message: lastUserMsg.content });
      return { reply, toolCalls: [] };
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

export const agentLoop = new AgentLoop();
