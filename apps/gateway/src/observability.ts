// ============================================================
// 🌒 Tool Loop Detection + Thinking Levels
// ============================================================
//
// Loop detection: agent stuck calling the same tool with same args 5x?
//                 Abort and report. Prevents infinite tool loops.
//
// Thinking levels: hint to the LLM about how much reasoning to apply.
//                  Maps to provider-specific params (Anthropic budget_tokens,
//                  OpenAI reasoning_effort, etc.)
//
// PRIVACY: All state in-process. No external calls beyond LLM itself.

// ── Tool loop detection ──────────────────────────────────────────────

export interface ToolCallRecord {
  tool: string;
  inputHash: string;
  timestamp: number;
}

export class ToolLoopDetector {
  private history = new Map<string, ToolCallRecord[]>();
  private maxRepeats: number;
  private windowMs: number;

  constructor(maxRepeats = 5, windowMs = 60_000) {
    this.maxRepeats = maxRepeats;
    this.windowMs = windowMs;
  }

  /** Returns true if this call should be blocked (loop detected) */
  recordAndCheck(sessionKey: string, tool: string, input: unknown): { loop: boolean; count: number; message?: string } {
    const inputHash = this.hashInput(input);
    const record: ToolCallRecord = {
      tool,
      inputHash,
      timestamp: Date.now(),
    };

    const list = this.history.get(sessionKey) || [];

    // Drop expired
    const cutoff = Date.now() - this.windowMs;
    const recent = list.filter((r) => r.timestamp > cutoff);

    // Count matching calls in window
    const matching = recent.filter((r) => r.tool === tool && r.inputHash === inputHash);

    recent.push(record);
    this.history.set(sessionKey, recent);

    if (matching.length >= this.maxRepeats - 1) {
      return {
        loop: true,
        count: matching.length + 1,
        message: `Tool "${tool}" called ${matching.length + 1} times with the same input in the last ${this.windowMs / 1000}s — likely infinite loop. Stopping.`,
      };
    }

    return { loop: false, count: matching.length + 1 };
  }

  reset(sessionKey: string): void {
    this.history.delete(sessionKey);
  }

  private hashInput(input: unknown): string {
    try {
      const str = JSON.stringify(input || {});
      // Simple djb2 hash
      let h = 5381;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
      }
      return h.toString(36);
    } catch {
      return "0";
    }
  }
}

export const loopDetector = new ToolLoopDetector();

// ── Thinking levels ──────────────────────────────────────────────────

export type ThinkingLevel = "low" | "medium" | "high" | "auto";

/**
 * Map a thinking level to provider-specific parameters.
 * Caller picks based on provider and merges into LLM call args.
 */
export function thinkingLevelParams(level: ThinkingLevel, provider: string): Record<string, unknown> {
  switch (provider.toLowerCase()) {
    case "anthropic":
      // budget_tokens for extended thinking
      if (level === "low") return { thinking: { type: "enabled", budget_tokens: 1024 } };
      if (level === "medium") return { thinking: { type: "enabled", budget_tokens: 8192 } };
      if (level === "high") return { thinking: { type: "enabled", budget_tokens: 32768 } };
      return {};
    case "openai":
      // reasoning_effort for o-series
      if (level === "low") return { reasoning_effort: "low" };
      if (level === "medium") return { reasoning_effort: "medium" };
      if (level === "high") return { reasoning_effort: "high" };
      return {};
    default:
      // Most providers ignore thinking hints
      return {};
  }
}

/**
 * Auto-detect a reasonable thinking level based on prompt characteristics.
 */
export function autoThinkingLevel(prompt: string): ThinkingLevel {
  const len = prompt.length;
  // Long, complex prompt with multiple requirements → high
  if (len > 1000 || /\b(plan|design|architect|analyze|reason|prove|derive)\b/i.test(prompt)) {
    return "high";
  }
  // Multi-step or comparison → medium
  if (len > 300 || /\b(compare|explain|why|how|because)\b/i.test(prompt)) {
    return "medium";
  }
  // Short factual → low
  return "low";
}
