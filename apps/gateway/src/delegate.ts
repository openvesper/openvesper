// ============================================================
// 🌒 Delegate Architecture — Agent-to-agent delegation
// ============================================================
//
// One agent can invoke another mid-conversation. Useful for:
//   - "Have code-reviewer check this, then continue our discussion"
//   - "Ask defi-strategist to validate this yield, then summarize"
//
// Patterns supported:
//   - sub-query: spawn a fresh sub-session with another agent
//   - hand-off: transfer the entire session to another agent
//
// PRIVACY: Sub-sessions live in the same gateway process. No state leaves
// the user's machine.

import { agentLoop } from "./agent-loop.js";

export interface DelegateRequest {
  parentSessionKey: string;
  delegateAgent: string;
  query: string;
  channel: string;
  /** If true, copy parent's recent messages as context */
  inheritContext?: boolean;
}

export interface DelegateResult {
  delegatedTo: string;
  reply: string;
  durationMs: number;
  subSessionKey: string;
}

/**
 * Delegate a sub-query to another agent without affecting the parent session's
 * agent assignment. Uses a temporary sub-session.
 */
export async function delegate(req: DelegateRequest): Promise<DelegateResult> {
  // Create a sub-session keyed by parent + delegate (deterministic)
  const subSessionKey = `${req.parentSessionKey}::delegate::${req.delegateAgent}`;

  const start = Date.now();
  const result = await agentLoop.run({
    sessionKey: subSessionKey,
    message: req.query,
    channel: `delegate-from-${req.channel}`,
    agent: req.delegateAgent,
  });

  return {
    delegatedTo: req.delegateAgent,
    reply: result.reply,
    durationMs: Date.now() - start,
    subSessionKey,
  };
}

/**
 * Hand off the entire conversation to a different agent. Updates session.agent.
 */
export async function handoff(sessionKey: string, newAgent: string): Promise<void> {
  const { sessionStore } = await import("./sessions.js");
  await sessionStore.setAgent(sessionKey, newAgent);
  await sessionStore.appendMessage(sessionKey, {
    role: "system",
    content: `[Handoff: conversation transferred to agent "${newAgent}"]`,
    timestamp: Date.now(),
    channel: "delegate",
  });
}

// ── Sub-agents (parallel execution) ──────────────────────────────────

export interface SubAgentTask {
  agent: string;
  query: string;
}

export interface SubAgentResult {
  agent: string;
  query: string;
  reply: string;
  durationMs: number;
  error?: string;
}

/**
 * Run multiple agents in parallel on the same parent session. Each gets its
 * own sub-session keyed by parent + agent + nanoid. Useful for:
 *   - "Get 3 second opinions"
 *   - "Have these specialists review in parallel"
 *
 * Concurrency is bounded by the global session lane manager — if all lanes
 * are busy, sub-agents queue.
 */
export async function runSubAgents(
  parentSessionKey: string,
  tasks: SubAgentTask[],
  channel = "subagent"
): Promise<SubAgentResult[]> {
  const promises = tasks.map(async (task) => {
    const subKey = `${parentSessionKey}::sub::${task.agent}::${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const start = Date.now();
    try {
      const result = await agentLoop.run({
        sessionKey: subKey,
        message: task.query,
        channel,
        agent: task.agent,
      });
      return {
        agent: task.agent,
        query: task.query,
        reply: result.reply,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        agent: task.agent,
        query: task.query,
        reply: "",
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return Promise.all(promises);
}
