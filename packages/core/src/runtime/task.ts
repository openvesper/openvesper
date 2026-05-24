// ============================================================
// 🌒 @openvesper/core — Task Runtime (v2)
// w/ skills, permissions, sub-agent spawning
// ============================================================

import { EventEmitter } from "events";
import {
  TaskOptions, TaskResult, LLMMessage, LLMContentBlock, LLMTool,
  ToolResult, ProviderName, ToolContext, WorkspaceContext,
  PermissionRequest,
} from "../types";
import { getProvider, detectDefaultProvider } from "../providers";
import { PluginRegistry } from "../plugins/registry";
import { MemoryManager } from "../memory";
import { PermissionManager } from "../permissions/manager";

export interface TaskRunnerOptions {
  registry: PluginRegistry;
  memory?: MemoryManager;
  workspace: WorkspaceContext;
  defaultLLM?: { provider: ProviderName; model?: string };
  permissions?: PermissionManager;
  /** Reference to Vesper instance for sub-agent spawning */
  vesper?: { task: (opts: TaskOptions) => Task };
}

export class Task extends EventEmitter {
  private opts: TaskOptions;
  private runner: TaskRunnerOptions;
  private toolCallLog: { name: string; input: Record<string, unknown>; result: ToolResult }[] = [];
  private totalUsage = { totalInputTokens: 0, totalOutputTokens: 0 };

  constructor(opts: TaskOptions, runner: TaskRunnerOptions) {
    super();
    this.opts = opts;
    this.runner = runner;
  }

  async run(): Promise<TaskResult> {
    const { agent: agentMode, prompt, llm: llmOverride, maxIterations = 15, temperature, memory: useMemory = true } = this.opts;

    const providerName = llmOverride?.provider || this.runner.defaultLLM?.provider || detectDefaultProvider();
    const provider = getProvider(providerName);
    if (!provider.isAvailable()) {
      this.emit("error", `Provider ${providerName} not configured`);
      return { success: false, output: "", toolCalls: [], iterations: 0, error: `Provider ${providerName} not configured` };
    }
    const model = llmOverride?.model || this.runner.defaultLLM?.model || provider.defaultModel;

    let systemPrompt = "You are OpenVesper, an AI agent.";
    let tools: LLMTool[] = [];
    let skillIds: string[] = [];

    if (agentMode) {
      const agent = this.runner.registry.getAgent(agentMode);
      if (!agent) {
        return { success: false, output: "", toolCalls: [], iterations: 0, error: `Agent mode '${agentMode}' not found` };
      }
      systemPrompt = agent.systemPrompt;

      // Validate agent: detect missing tools/skills
      if (Array.isArray(agent.allowedTools)) {
        const missingTools = agent.allowedTools.filter((n) => !this.runner.registry.getTool(n));
        if (missingTools.length) {
          this.emit("warning", `Agent '${agentMode}' references ${missingTools.length} unavailable tools: ${missingTools.join(", ")}. Load the corresponding plugin(s).`);
        }
      }
      if (agent.skills && agent.skills.length) {
        const missingSkills = agent.skills.filter((id) => !this.runner.registry.getSkill(id));
        if (missingSkills.length) {
          this.emit("warning", `Agent '${agentMode}' references ${missingSkills.length} unavailable skills: ${missingSkills.join(", ")}.`);
        }
      }

      const agentTools = this.runner.registry.getToolsForAgent(agentMode);
      tools = agentTools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
      skillIds = [...(agent.skills || [])];
    } else if (this.opts.tools?.length) {
      tools = this.opts.tools
        .map((name) => this.runner.registry.getTool(name))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    } else {
      tools = this.runner.registry.listTools().map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    }

    // Add explicit skills from opts
    if (this.opts.skills?.length) skillIds.push(...this.opts.skills);
    // Auto-detect skills from prompt
    const autoSkills = this.runner.registry.skills.detectFromPrompt(prompt, 2);
    for (const sk of autoSkills) if (!skillIds.includes(sk.id)) skillIds.push(sk.id);

    // Inject skills into system prompt + merge their required tools
    // This lets a skill bring its own tools (from any plugin) into the agent.
    if (skillIds.length) {
      const skillContext = this.runner.registry.skills.buildContext(skillIds);
      systemPrompt = systemPrompt + skillContext;

      // Each skill can declare `requiresTools: [...]` in its frontmatter.
      // We merge those into the LLM's tool list — across plugins.
      const existingNames = new Set(tools.map((t) => t.name));
      const addedFromSkills: string[] = [];
      for (const skillId of skillIds) {
        const skill = this.runner.registry.getSkill(skillId);
        if (!skill?.requiresTools) continue;
        for (const toolName of skill.requiresTools) {
          if (existingNames.has(toolName)) continue;
          const toolDef = this.runner.registry.getTool(toolName);
          if (!toolDef) continue;
          tools.push({ name: toolDef.name, description: toolDef.description, input_schema: toolDef.inputSchema });
          existingNames.add(toolName);
          addedFromSkills.push(toolName);
        }
      }

      this.emit("skill_loaded", { skills: skillIds, addedTools: addedFromSkills });
    }

    // Build messages
    const history: LLMMessage[] = [];
    let userMsg = prompt;
    if (useMemory && this.runner.memory) {
      const memCtx = this.runner.memory.buildContext(prompt);
      if (memCtx) userMsg = prompt + memCtx;
    }
    history.push({ role: "user", content: userMsg });

    let finalText = "";

    for (let iter = 0; iter < maxIterations; iter++) {
      this.emit("thinking", { iteration: iter + 1 });

      let response;
      try {
        response = await provider.call({
          model, messages: history, system: systemPrompt,
          tools: provider.supportsTools && tools.length > 0 ? tools : undefined,
          maxTokens: 4096, temperature,
        });
      } catch (e: any) {
        this.emit("error", e.message);
        return { success: false, output: finalText, toolCalls: this.toolCallLog, iterations: iter, error: e.message };
      }

      if (response.usage) {
        this.totalUsage.totalInputTokens += response.usage.inputTokens;
        this.totalUsage.totalOutputTokens += response.usage.outputTokens;
      }

      const texts = response.content.filter((b) => b.type === "text").map((b) => b.text || "");
      if (texts.length) { finalText = texts.join("\n"); this.emit("message", finalText); }

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      if (response.stopReason === "end_turn" || !toolUses.length) {
        history.push({ role: "assistant", content: response.content });
        break;
      }

      history.push({ role: "assistant", content: response.content });
      const resultBlocks: LLMContentBlock[] = [];

      for (const tu of toolUses) {
        if (!tu.name || !tu.id) continue;
        const input = (tu.input as Record<string, unknown>) || {};
        this.emit("tool_call", { name: tu.name, input });

        const toolDef = this.runner.registry.getTool(tu.name);
        let result: ToolResult;
        if (!toolDef) {
          result = { success: false, error: `Tool not found: ${tu.name}` };
        } else {
          // Permission check
          if (this.runner.permissions && (toolDef.requireApproval || toolDef.permission === "write" || toolDef.permission === "execute" || toolDef.permission === "trade")) {
            const permReq: PermissionRequest = {
              toolName: toolDef.name,
              level: toolDef.permission || "execute",
              reason: toolDef.description,
              input,
            };
            this.emit("permission_request", permReq);
            const allowed = await this.runner.permissions.check(permReq);
            if (!allowed) {
              result = { success: false, error: `Permission denied for ${toolDef.name}` };
              this.toolCallLog.push({ name: tu.name, input, result });
              resultBlocks.push({ type: "tool_result", tool_use_id: tu.id, content: `TOOL_ERROR: ${result.error}` });
              this.emit("tool_result", { name: tu.name, result });
              continue;
            }
          }

          try {
            const ctx: ToolContext = {
              env: process.env,
              log: (msg) => this.emit("message", `[${tu.name}] ${msg}`),
              fetch: globalThis.fetch,
              workspace: this.runner.workspace,
              spawn: this.runner.vesper
                ? async ({ agent, prompt, tools: subTools }) => {
                    const sub = this.runner.vesper!.task({ agent, prompt, tools: subTools });
                    const subResult = await sub.run();
                    return { output: subResult.output, success: subResult.success };
                  }
                : undefined,
              requestPermission: this.runner.permissions
                ? async (req) => this.runner.permissions!.check({ ...req, toolName: tu.name!, input })
                : undefined,
            };
            result = await toolDef.handler(input, ctx);
          } catch (e: any) {
            result = { success: false, error: e.message };
          }
        }

        this.toolCallLog.push({ name: tu.name, input, result });
        this.emit("tool_result", { name: tu.name, result });
        resultBlocks.push({
          type: "tool_result", tool_use_id: tu.id,
          content: result.success ? JSON.stringify(result.data) : `TOOL_ERROR: ${result.error}`,
        });
      }
      history.push({ role: "user", content: resultBlocks });
    }

    if (useMemory && this.runner.memory && finalText) {
      this.runner.memory.add(agentMode || "auto", prompt, finalText.slice(0, 400), this.extractTags(prompt), this.toolCallLog.map((t) => t.name));
    }

    const result: TaskResult = {
      success: true, output: finalText,
      toolCalls: this.toolCallLog,
      iterations: this.toolCallLog.length > 0 ? this.toolCallLog.length : 1,
      usage: this.totalUsage,
    };
    this.emit("done", result);
    return result;
  }

  private extractTags(text: string): string[] {
    const lower = text.toLowerCase();
    const tags: string[] = [];
    if (/crypto|btc|eth|sol|meme/.test(lower)) tags.push("crypto");
    if (/solana|jupiter|pump|bags/.test(lower)) tags.push("solana");
    if (/github|repo/.test(lower)) tags.push("github");
    if (/wallet|onchain/.test(lower)) tags.push("onchain");
    return tags;
  }
}
