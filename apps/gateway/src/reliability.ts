// ============================================================
// 🌒 Session Pruning + Retry Policy
// ============================================================
//
// Pruning: trim large tool outputs in-memory before sending to LLM.
//          Does not modify persisted session — only the context for one run.
//
// Retry:   Wrap LLM calls in exponential backoff for transient failures.

import type { SessionMessage } from "./sessions.js";

// ── Session pruning ──────────────────────────────────────────────────

export interface PruneOptions {
  /** Max characters per tool result before truncation (default 4000) */
  maxToolResultChars?: number;
  /** Keep this many recent tool results full-length (default 3) */
  keepRecentFull?: number;
}

/**
 * Create a pruned copy of messages for LLM context.
 * Truncates large tool outputs (older than `keepRecentFull`).
 * Original session.messages is NOT modified.
 */
export function pruneMessages(
  messages: SessionMessage[],
  opts: PruneOptions = {}
): SessionMessage[] {
  const maxChars = opts.maxToolResultChars ?? 4000;
  const keepFull = opts.keepRecentFull ?? 3;

  // Find indices of tool-result-like messages (long, contain JSON)
  const toolResultIndices: number[] = [];
  messages.forEach((m, i) => {
    if (m.content.length > maxChars && m.role === "user") {
      // Likely a tool result fed back as user message
      toolResultIndices.push(i);
    }
  });

  // If fewer than threshold, no pruning needed
  if (toolResultIndices.length <= keepFull) return messages;

  // Older tool results get truncated
  const toTruncate = toolResultIndices.slice(0, -keepFull);
  const truncateSet = new Set(toTruncate);

  return messages.map((m, i) => {
    if (truncateSet.has(i)) {
      const head = m.content.slice(0, maxChars / 2);
      const tail = m.content.slice(-200);
      return {
        ...m,
        content: `${head}\n\n... [${m.content.length - maxChars / 2 - 200} chars truncated] ...\n\n${tail}`,
      };
    }
    return m;
  });
}

// ── Retry policy ─────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  /** Filter: only retry these error patterns. If unset, retry all. */
  retryableErrors?: RegExp[];
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 8000,
  backoffFactor: 2,
  retryableErrors: [
    /rate.?limit/i,
    /429/,
    /503/,
    /504/,
    /timeout/i,
    /network/i,
    /ECONNRESET/,
    /ETIMEDOUT/,
    /ENOTFOUND/,
    /overloaded/i,
  ],
};

/**
 * Retry an async function with exponential backoff.
 * Only retries errors matching `retryableErrors` patterns (default: transient/network).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY, ...opts };
  let lastError: unknown;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);

      // Last attempt — bail
      if (attempt === cfg.maxAttempts) {
        throw err;
      }

      // Check if retryable
      const isRetryable = cfg.retryableErrors.some((pattern) => pattern.test(msg));
      if (!isRetryable) {
        throw err;
      }

      // Exponential backoff with jitter
      const baseDelay = Math.min(
        cfg.initialDelayMs * Math.pow(cfg.backoffFactor, attempt - 1),
        cfg.maxDelayMs
      );
      const jitter = Math.random() * 0.3 * baseDelay;
      const delay = baseDelay + jitter;

      console.warn(
        `[retry] attempt ${attempt}/${cfg.maxAttempts} failed: ${msg.slice(0, 80)} — retrying in ${Math.round(delay)}ms`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}
