// ============================================================
// 🌒 Compaction — Summarize old conversation context
// ============================================================
//
// When a session's message history grows too long for the model's context
// window, we compact: ask the LLM to summarize older messages and replace
// them with the summary, then retry the run.
//
// Triggers:
//   - Auto: when estimated tokens > threshold (default 80% of window)
//   - Manual: user types /compact
//
// PRIVACY: Compaction runs locally via your configured LLM provider.
// The original messages and summary both live in ~/.openvesper/. We don't
// send anything to OpenVesper servers (we have none).

import type { Session, SessionMessage } from "./sessions.js";
import { sessionStore } from "./sessions.js";

// Rough estimate: 1 token ≈ 4 chars for English. Conservative.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function sessionTokens(session: Session): number {
  return session.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

export interface CompactionOptions {
  /** Keep this many recent messages verbatim (default: 10) */
  keepRecent?: number;
  /** Maximum tokens we'd like to fit (default: 100k — typical Claude/GPT) */
  budgetTokens?: number;
  /** Custom instructions for the summary (e.g. "Focus on decisions") */
  instructions?: string;
}

export interface CompactionResult {
  compacted: boolean;
  oldMessageCount: number;
  newMessageCount: number;
  summary: string | null;
  tokensBefore: number;
  tokensAfter: number;
}

/**
 * Compact a session by summarizing all but the most recent N messages.
 * Calls the configured LLM provider via the runtime to generate the summary.
 */
export async function compactSession(
  sessionKey: string,
  opts: CompactionOptions = {},
  llmCall?: (prompt: string) => Promise<string>
): Promise<CompactionResult> {
  const keepRecent = opts.keepRecent ?? 10;
  const session = await sessionStore.getOrCreate(sessionKey);
  const tokensBefore = sessionTokens(session);

  // Nothing to compact?
  if (session.messages.length <= keepRecent) {
    return {
      compacted: false,
      oldMessageCount: session.messages.length,
      newMessageCount: session.messages.length,
      summary: null,
      tokensBefore,
      tokensAfter: tokensBefore,
    };
  }

  const toSummarize = session.messages.slice(0, session.messages.length - keepRecent);
  const keep = session.messages.slice(-keepRecent);

  // Build summarization prompt
  const transcript = toSummarize
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const instructions = opts.instructions || "Capture key decisions, open questions, and important context.";
  const prompt = `Summarize the following conversation as concise bullet points.
${instructions}

Conversation:
${transcript}

Output only the summary, no preamble.`;

  // Call LLM
  let summary: string;
  if (llmCall) {
    summary = await llmCall(prompt);
  } else {
    // Fallback: structural summary without LLM
    summary = `[${toSummarize.length} earlier messages from ${new Date(toSummarize[0].timestamp).toISOString()} to ${new Date(toSummarize[toSummarize.length - 1].timestamp).toISOString()}. First user message: "${toSummarize[0].content.slice(0, 80)}..."]`;
  }

  // Replace summarized messages with a single system message + keep recent
  const compacted: SessionMessage = {
    role: "system",
    content: `[Compacted summary of ${toSummarize.length} earlier messages]\n\n${summary}`,
    timestamp: Date.now(),
    channel: "compaction",
  };

  session.messages = [compacted, ...keep];
  session.updatedAt = Date.now();

  // Persist
  await sessionStore.appendMessage(sessionKey, { ...keep[keep.length - 1] });
  // Use a direct save via the internal mechanism — re-set agent triggers persistence
  await sessionStore.setAgent(sessionKey, session.agent);

  const tokensAfter = sessionTokens(session);

  return {
    compacted: true,
    oldMessageCount: toSummarize.length + keep.length,
    newMessageCount: session.messages.length,
    summary,
    tokensBefore,
    tokensAfter,
  };
}

/**
 * Check if a session should auto-compact based on token budget.
 */
export function shouldAutoCompact(session: Session, budgetTokens = 100_000): boolean {
  const tokens = sessionTokens(session);
  // Trigger at 80% of budget to leave headroom
  return tokens > budgetTokens * 0.8;
}
