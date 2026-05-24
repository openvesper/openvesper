// ============================================================
// 🌒 @openvesper/plugin-sdk — testing helpers self-test
// ============================================================

import { describe, it, expect } from "vitest";

describe("plugin-sdk", () => {
  it("exports definePlugin, defineTool, defineAgent, inputSchema", async () => {
    const sdk = await import("@openvesper/plugin-sdk");
    expect(sdk.definePlugin).toBeDefined();
    expect(sdk.defineTool).toBeDefined();
    expect(sdk.defineAgent).toBeDefined();
    expect(sdk.inputSchema).toBeDefined();
  });

  it("inputSchema builds a JSON schema", async () => {
    const { inputSchema } = await import("@openvesper/plugin-sdk");
    const schema = inputSchema(
      {
        name: { type: "string", description: "User name" },
        age: { type: "number" },
      },
      ["name"]
    );
    expect(schema.type).toBe("object");
    expect(schema.required).toEqual(["name"]);
    expect(schema.properties.name.type).toBe("string");
  });

  it("defineTool returns a complete ToolDefinition", async () => {
    const { defineTool, inputSchema } = await import("@openvesper/plugin-sdk");
    const tool = defineTool({
      name: "greet",
      description: "Returns a greeting",
      inputSchema: inputSchema({ name: { type: "string" } }, ["name"]),
      handler: async (input) => ({
        success: true,
        data: { greeting: `Hello, ${(input as { name: string }).name}` },
      }),
    });
    expect(tool.name).toBe("greet");
    expect(typeof tool.handler).toBe("function");
  });
});

describe("plugin-sdk testing helpers", () => {
  it("mockRuntime + callTool round-trip succeeds", async () => {
    const { definePlugin, defineTool, inputSchema } = await import("@openvesper/plugin-sdk");
    const { mockRuntime, expectTool } = await import("@openvesper/plugin-sdk/testing");

    const plugin = definePlugin({
      name: "test-plugin",
      version: "0.0.1",
      description: "fixture",
      tools: [
        defineTool({
          name: "add",
          description: "Adds two numbers",
          inputSchema: inputSchema(
            { a: { type: "number" }, b: { type: "number" } },
            ["a", "b"]
          ),
          handler: async (input) => {
            const { a, b } = input as { a: number; b: number };
            return { success: true, data: { sum: a + b } };
          },
        }),
      ],
    });

    const runtime = mockRuntime();
    runtime.registerPlugin(plugin);

    const result = await runtime.callTool("add", { a: 2, b: 3 });
    expectTool(result).toSucceed();
    expect((result.data as { sum: number }).sum).toBe(5);
    expect(runtime.getCallCount("add")).toBe(1);
  });

  it("callTool with unknown tool returns failure", async () => {
    const { mockRuntime, expectTool } = await import("@openvesper/plugin-sdk/testing");
    const runtime = mockRuntime();
    const result = await runtime.callTool("nonexistent", {});
    expectTool(result).toFail();
  });

  it("expectTool.toReturnData matcher works", async () => {
    const { definePlugin, defineTool, inputSchema } = await import("@openvesper/plugin-sdk");
    const { mockRuntime, expectTool } = await import("@openvesper/plugin-sdk/testing");

    const plugin = definePlugin({
      name: "score-plugin",
      version: "0.0.1",
      description: "fixture",
      tools: [
        defineTool({
          name: "score",
          description: "fixture",
          inputSchema: inputSchema({}, []),
          handler: async () => ({ success: true, data: { score: 95, ok: true } }),
        }),
      ],
    });

    const runtime = mockRuntime();
    runtime.registerPlugin(plugin);
    const result = await runtime.callTool("score", {});
    expectTool(result)
      .toSucceed()
      .toReturnData((d) => (d as { score: number }).score > 90);
  });

  it("withEnv scopes env vars during execution", async () => {
    const { mockRuntime } = await import("@openvesper/plugin-sdk/testing");
    const runtime = mockRuntime();

    const before = process.env.TEST_KEY;
    await runtime.withEnv({ TEST_KEY: "scoped-value" }, async () => {
      expect(process.env.TEST_KEY).toBe("scoped-value");
    });
    expect(process.env.TEST_KEY).toBe(before);
  });
});
