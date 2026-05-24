// ============================================================
// 🌒 Channel Commands — /reset, /new, /status, /queue, /agent
// ============================================================
//
// In-channel commands that don't reach the LLM. Implemented like OpenClaw's
// "command hooks" — intercepted before the agent loop runs.
//
// Channels (CLI, Telegram, Slack, etc.) pass messages through tryHandleCommand
// first. If it returns a reply, that reply is delivered directly without
// running the agent.

import { sessionStore } from "./sessions.js";
import { commandQueue, type QueueMode } from "./queue.js";
import { sessionLanes } from "./session-lane.js";
import { runRegistry } from "./run-registry.js";
import { compactSession, sessionTokens } from "./compaction.js";

export interface CommandContext {
  sessionKey: string;
  message: string;
  channel: string;
}

export interface CommandResult {
  handled: boolean;
  reply?: string;
}

/**
 * Try to handle a channel-level command. Returns { handled: true, reply }
 * if the message was a command. Returns { handled: false } otherwise.
 */
export async function tryHandleCommand(ctx: CommandContext): Promise<CommandResult> {
  const trimmed = ctx.message.trim();
  if (!trimmed.startsWith("/")) return { handled: false };

  // Parse: /cmd arg1 arg2 ...
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "/reset":
      return handleReset(ctx);

    case "/new":
      return handleNew(ctx);

    case "/status":
      return handleStatus(ctx);

    case "/queue":
      return handleQueue(ctx, args);

    case "/agent":
      return handleAgent(ctx, args);

    case "/stop":
      return handleStop(ctx);

    case "/compact":
      return handleCompact(ctx, args);

    case "/help":
    case "/?":
      return handleHelp();

    default:
      return { handled: false };
  }
}

async function handleReset(ctx: CommandContext): Promise<CommandResult> {
  await sessionStore.reset(ctx.sessionKey);
  commandQueue.cancelDebounce(ctx.sessionKey);
  return {
    handled: true,
    reply: "🌒 Session reset. Conversation history cleared.",
  };
}

async function handleNew(ctx: CommandContext): Promise<CommandResult> {
  await sessionStore.reset(ctx.sessionKey);
  commandQueue.cancelDebounce(ctx.sessionKey);
  return {
    handled: true,
    reply: "🌒 New session started.",
  };
}

async function handleStatus(ctx: CommandContext): Promise<CommandResult> {
  const session = await sessionStore.getOrCreate(ctx.sessionKey);
  const isRunning = sessionLanes.isRunning(ctx.sessionKey);
  const runId = sessionLanes.currentRunId(ctx.sessionKey);
  const queueMode = commandQueue.getMode(ctx.sessionKey);
  const queueLength = commandQueue.peek(ctx.sessionKey).length;
  const activeRuns = runRegistry.listActive().length;

  const lines = [
    "🌒 Session status",
    "",
    `   Session:    ${session.id}`,
    `   Agent:      ${session.agent}`,
    `   Messages:   ${session.messages.length}`,
    `   Running:    ${isRunning ? `yes (run ${runId})` : "no"}`,
    `   Queue:      ${queueLength} pending · mode=${queueMode.mode}`,
    `   Channel:    ${ctx.channel}`,
    "",
    `   System active runs: ${activeRuns}`,
  ];

  return { handled: true, reply: lines.join("\n") };
}

async function handleQueue(ctx: CommandContext, args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    const m = commandQueue.getMode(ctx.sessionKey);
    return {
      handled: true,
      reply: `🌒 Current queue mode: ${m.mode} (debounce ${m.debounceMs}ms · cap ${m.cap} · drop=${m.drop})\n\nUsage: /queue <steer|followup|collect|default>`,
    };
  }

  const sub = args[0].toLowerCase();
  if (sub === "default" || sub === "reset") {
    commandQueue.resetSessionMode(ctx.sessionKey);
    return { handled: true, reply: "🌒 Queue mode reset to default (steer)." };
  }

  const validModes: QueueMode[] = ["steer", "followup", "collect"];
  if (!validModes.includes(sub as QueueMode)) {
    return {
      handled: true,
      reply: `🌒 Invalid queue mode: ${sub}. Valid: steer, followup, collect, default`,
    };
  }

  const opts = commandQueue.setSessionMode(ctx.sessionKey, { mode: sub as QueueMode });
  return {
    handled: true,
    reply: `🌒 Queue mode → ${opts.mode}`,
  };
}

async function handleAgent(ctx: CommandContext, args: string[]): Promise<CommandResult> {
  if (args.length === 0) {
    const session = await sessionStore.getOrCreate(ctx.sessionKey);
    return {
      handled: true,
      reply: `🌒 Current agent: ${session.agent}\n\nUsage: /agent <mode>`,
    };
  }
  const mode = args[0];
  await sessionStore.setAgent(ctx.sessionKey, mode);
  return {
    handled: true,
    reply: `🌒 Switched to agent: ${mode}`,
  };
}

async function handleStop(ctx: CommandContext): Promise<CommandResult> {
  const runId = sessionLanes.currentRunId(ctx.sessionKey);
  if (!runId) {
    return { handled: true, reply: "🌒 No run in progress." };
  }
  const aborted = runRegistry.abort(runId);
  return {
    handled: true,
    reply: aborted ? `🌒 Aborted run ${runId}.` : "🌒 Could not abort (already complete?).",
  };
}

async function handleCompact(ctx: CommandContext, args: string[]): Promise<CommandResult> {
  const session = await sessionStore.getOrCreate(ctx.sessionKey);
  const tokens = sessionTokens(session);
  const instructions = args.join(" ").trim() || undefined;

  // Run a structural compaction (no LLM needed for the synchronous /compact path)
  // For LLM-driven compaction, agent-loop triggers it before next run.
  const result = await compactSession(ctx.sessionKey, {
    keepRecent: 10,
    instructions,
  });

  if (!result.compacted) {
    return {
      handled: true,
      reply: `🧹 Nothing to compact. Session has ${session.messages.length} message(s), ~${tokens} tokens.`,
    };
  }

  return {
    handled: true,
    reply: `🧹 Compacted ${result.oldMessageCount} → ${result.newMessageCount} messages. Tokens ${result.tokensBefore} → ${result.tokensAfter}.`,
  };
}

function handleHelp(): CommandResult {
  return {
    handled: true,
    reply: [
      "🌒 OpenVesper commands",
      "",
      "  /new                  — start a fresh session",
      "  /reset                — clear current session messages",
      "  /status               — show session info",
      "  /agent <mode>         — switch active agent",
      "  /queue <mode>         — set queue mode (steer | followup | collect | default)",
      "  /compact [hint]       — summarize old messages to free context",
      "  /stop                 — abort current run",
      "  /help                 — this message",
    ].join("\n"),
  };
}
