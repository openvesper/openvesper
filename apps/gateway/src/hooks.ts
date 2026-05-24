// ============================================================
// 🌒 Hooks — Lifecycle hooks (OpenClaw-style)
// ============================================================
//
// Two types:
//
// 1. Internal hooks (Gateway hooks) — event-driven scripts for
//    commands and lifecycle events:
//      - agent:bootstrap   — building bootstrap files, can inject context
//      - command:new       — /new command
//      - command:reset     — /reset command
//      - command:stop      — /stop command
//
// 2. Plugin hooks — run inside the agent loop or gateway:
//      - agent:tool-call   — when LLM decides to call a tool
//      - agent:tool-result — after tool execution
//      - agent:complete    — final reply ready
//
// Hooks are registered as async functions and run in order.

export type HookContext = {
  sessionId: string;
  sessionKey: string;
  agent: string;
  channel: string;
  systemPrompt?: string;
  message?: string;
  tool?: { name: string; input: unknown };
  result?: { output: unknown };
  reply?: string;
  metadata?: Record<string, unknown>;
};

export type HookFn = (ctx: HookContext) => Promise<HookContext | void>;

export type HookName =
  | "agent:bootstrap"
  | "agent:tool-call"
  | "agent:tool-result"
  | "agent:complete"
  | "agent:error"
  | "command:new"
  | "command:reset"
  | "command:stop";

class HooksRegistry {
  private hooks = new Map<HookName, HookFn[]>();

  register(name: HookName, fn: HookFn): () => void {
    const list = this.hooks.get(name) || [];
    list.push(fn);
    this.hooks.set(name, list);
    // Return unregister function
    return () => {
      const current = this.hooks.get(name);
      if (!current) return;
      const idx = current.indexOf(fn);
      if (idx >= 0) current.splice(idx, 1);
    };
  }

  /** Run all hooks for an event in order, threading context through */
  async run(name: HookName, ctx: HookContext): Promise<HookContext> {
    const list = this.hooks.get(name);
    if (!list || list.length === 0) return ctx;
    let current = ctx;
    for (const fn of list) {
      try {
        const result = await fn(current);
        if (result) current = result;
      } catch (err) {
        console.error(`[hook] ${name} failed:`, err);
      }
    }
    return current;
  }

  count(name: HookName): number {
    return this.hooks.get(name)?.length || 0;
  }

  list(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [name, list] of this.hooks) {
      out[name] = list.length;
    }
    return out;
  }
}

export const hooks = new HooksRegistry();

// ── Built-in hooks ────────────────────────────────────────────────────

/**
 * Bootstrap hook: load project's AGENTS.md and inject into system prompt
 * (this is what OpenClaw does for project context)
 */
hooks.register("agent:bootstrap", async (ctx) => {
  // Already integrated via packages/core's loadProjectAgentsMd
  // This is here as an extension point — users can override or add more
  return ctx;
});

/**
 * Tool call hook: log to console (in production, would write to audit log)
 */
hooks.register("agent:tool-call", async (ctx) => {
  if (ctx.tool) {
    console.log(`[tool] ${ctx.agent} → ${ctx.tool.name}`);
  }
  return ctx;
});

/**
 * Complete hook: log session activity
 */
hooks.register("agent:complete", async (ctx) => {
  console.log(`[loop] ${ctx.agent}@${ctx.channel} → ${ctx.reply?.slice(0, 60) || "(empty)"}...`);
  return ctx;
});
