// ============================================================
// 🌒 Plugin Testing Helpers
// ============================================================
//
// Utilities for writing tests for OpenVesper plugins.
//
// Example:
//   import { mockRuntime, expectTool } from "@openvesper/plugin-sdk/testing";
//
//   test("crypto_price returns BTC price", async () => {
//     const runtime = mockRuntime();
//     const result = await runtime.callTool("crypto_price", { symbol: "BTC" });
//     expectTool(result).toSucceed();
//     expect(result.data).toHaveProperty("price");
//   });

import type { PluginDefinition, ToolDefinition, ToolResult } from "@openvesper/core";

// ── Mock runtime ─────────────────────────────────────────────────────

export interface MockRuntime {
  /** Register a plugin's tools/agents for testing */
  registerPlugin(plugin: PluginDefinition): void;
  /** Call a tool by name with input */
  callTool(name: string, input: Record<string, unknown>): Promise<ToolResult>;
  /** List registered tools */
  listTools(): string[];
  /** Get a tool definition */
  getTool(name: string): ToolDefinition | undefined;
  /** Mock environment variables for the duration of a test */
  withEnv(env: Record<string, string>, fn: () => Promise<void>): Promise<void>;
  /** Inject a fake LLM response for tools that call LLMs */
  setMockLLMResponse(response: string): void;
  /** Get count of times a tool was called */
  getCallCount(toolName: string): number;
}

export function mockRuntime(): MockRuntime {
  const tools = new Map<string, ToolDefinition>();
  const callCounts = new Map<string, number>();
  let mockLLM: string | null = null;

  return {
    registerPlugin(plugin) {
      for (const tool of plugin.tools || []) {
        tools.set(tool.name, tool);
      }
    },

    async callTool(name, input) {
      const tool = tools.get(name);
      if (!tool) {
        return { success: false, error: `No such tool: ${name}` };
      }
      callCounts.set(name, (callCounts.get(name) || 0) + 1);
      try {
        // Minimal context for testing — real contexts come from the runtime
        const ctx = {
          agent: "test",
          sessionKey: "test-session",
          logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
        } as unknown as Parameters<typeof tool.handler>[1];
        return await tool.handler(input, ctx);
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "unknown error" };
      }
    },

    listTools() {
      return Array.from(tools.keys());
    },

    getTool(name) {
      return tools.get(name);
    },

    async withEnv(env, fn) {
      const original: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(env)) {
        original[k] = process.env[k];
        process.env[k] = v;
      }
      try {
        await fn();
      } finally {
        for (const [k, v] of Object.entries(original)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
      }
    },

    setMockLLMResponse(response) {
      mockLLM = response;
    },

    getCallCount(toolName) {
      return callCounts.get(toolName) || 0;
    },
  };
}

// ── Assertion helpers ────────────────────────────────────────────────

export interface ToolAssertion {
  toSucceed(): ToolAssertion;
  toFail(): ToolAssertion;
  toFailWith(messagePattern: string | RegExp): ToolAssertion;
  toReturnData(predicate: (data: unknown) => boolean): ToolAssertion;
  toHaveDataMatching(matcher: Record<string, unknown>): ToolAssertion;
}

export function expectTool(result: ToolResult): ToolAssertion {
  const assertion: ToolAssertion = {
    toSucceed() {
      if (!result.success) {
        throw new Error(`Expected tool to succeed, but it failed: ${result.error}`);
      }
      return assertion;
    },
    toFail() {
      if (result.success) {
        throw new Error(`Expected tool to fail, but it succeeded with: ${JSON.stringify(result.data)}`);
      }
      return assertion;
    },
    toFailWith(pattern) {
      if (result.success) throw new Error("Expected failure but got success");
      const msg = result.error || "";
      if (typeof pattern === "string" && !msg.includes(pattern)) {
        throw new Error(`Expected error to contain "${pattern}", got: ${msg}`);
      }
      if (pattern instanceof RegExp && !pattern.test(msg)) {
        throw new Error(`Expected error to match ${pattern}, got: ${msg}`);
      }
      return assertion;
    },
    toReturnData(predicate) {
      if (!result.success) throw new Error(`Tool failed: ${result.error}`);
      if (!predicate(result.data)) {
        throw new Error(`Data predicate failed for: ${JSON.stringify(result.data)}`);
      }
      return assertion;
    },
    toHaveDataMatching(matcher) {
      if (!result.success) throw new Error(`Tool failed: ${result.error}`);
      const data = result.data as Record<string, unknown>;
      for (const [k, v] of Object.entries(matcher)) {
        if (data[k] !== v) {
          throw new Error(`Expected data.${k} to equal ${JSON.stringify(v)}, got ${JSON.stringify(data[k])}`);
        }
      }
      return assertion;
    },
  };
  return assertion;
}

// ── Network mocking ──────────────────────────────────────────────────

/**
 * Replace global fetch for a test. Returns a restore function.
 * The handler receives the URL and init, returns a mock Response-like object.
 */
export function mockFetch(
  handler: (url: string, init?: RequestInit) => Promise<{ ok: boolean; status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> }>
): () => void {
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const result = await handler(url, init);
    return {
      ok: result.ok,
      status: result.status || (result.ok ? 200 : 500),
      json: result.json || (async () => ({})),
      text: result.text || (async () => ""),
      headers: new Map(),
    } as any;
  };
  return () => {
    (globalThis as any).fetch = originalFetch;
  };
}
