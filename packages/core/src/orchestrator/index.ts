// ============================================================
// 🌒 @openvesper/core — Sub-Agent Orchestrator
// Master agent delegates tasks to specialized child agents
// ============================================================

import { EventEmitter } from "events";
import { ProviderName, ToolContext, TaskResult } from "../types";
import { PluginRegistry } from "../plugins/registry";
import { Task } from "../runtime/task";
import { MemoryManager } from "../memory";

export interface DelegationContext {
  parentTaskId: string;
  parentAgent?: string;
  depth: number;
  maxDepth: number;
}

export interface OrchestratorOptions {
  registry: PluginRegistry;
  memory?: MemoryManager;
  workspace: { id: string; path: string; data: Record<string, unknown> };
  defaultLLM: { provider: ProviderName; model?: string };
  maxDelegationDepth?: number;
}

/**
 * Orchestrator allows a parent agent to delegate sub-tasks to specialized agents.
 * Prevents infinite recursion via maxDepth.
 */
export class Orchestrator extends EventEmitter {
  private opts: OrchestratorOptions;
  private activeDelegations: Map<string, DelegationContext> = new Map();
  private taskCounter = 0;

  constructor(opts: OrchestratorOptions) {
    super();
    this.opts = opts;
  }

  /**
   * Delegate a sub-task to a child agent.
   * Returns the result (output + tool calls + usage).
   */
  async delegate(params: {
    childAgent: string;
    prompt: string;
    parentTaskId?: string;
    parentAgent?: string;
    llm?: { provider?: ProviderName; model?: string };
  }): Promise<TaskResult> {
    const parentCtx = params.parentTaskId ? this.activeDelegations.get(params.parentTaskId) : null;
    const depth = (parentCtx?.depth || 0) + 1;
    const maxDepth = this.opts.maxDelegationDepth ?? 3;

    if (depth > maxDepth) {
      return {
        success: false,
        output: "",
        toolCalls: [],
        iterations: 0,
        error: `Max delegation depth exceeded (${maxDepth})`,
      };
    }

    const childTaskId = `task_${++this.taskCounter}_${Date.now()}`;
    const delegationCtx: DelegationContext = {
      parentTaskId: params.parentTaskId || "root",
      parentAgent: params.parentAgent,
      depth,
      maxDepth,
    };
    this.activeDelegations.set(childTaskId, delegationCtx);

    this.emit("delegation_start", {
      taskId: childTaskId,
      childAgent: params.childAgent,
      parentAgent: params.parentAgent,
      depth,
      prompt: params.prompt.slice(0, 100),
    });

    const task = new Task(
      {
        agent: params.childAgent,
        prompt: params.prompt,
        llm: params.llm || this.opts.defaultLLM,
        maxIterations: 10,
        memory: false, // Sub-tasks don't write to memory
      },
      {
        registry: this.opts.registry,
        memory: this.opts.memory,
        workspace: this.opts.workspace,
        defaultLLM: this.opts.defaultLLM,
      }
    );

    // Bubble events up
    task.on("tool_call", (data) => this.emit("delegation_tool_call", { taskId: childTaskId, ...data }));
    task.on("tool_result", (data) => this.emit("delegation_tool_result", { taskId: childTaskId, ...data }));

    const result = await task.run();

    this.activeDelegations.delete(childTaskId);
    this.emit("delegation_end", { taskId: childTaskId, result });

    return result;
  }

  /**
   * Get the "delegate_to_agent" tool definition for injection into a master agent.
   * When the master agent calls this tool, the orchestrator delegates.
   */
  getDelegationTool(currentAgent?: string) {
    return {
      name: "delegate_to_agent",
      description: "Delegate a focused sub-task to a specialized agent. Use this when you need expertise from another agent (e.g. security check, trading analysis, on-chain lookup). Returns the child agent's response.",
      input_schema: {
        type: "object" as const,
        properties: {
          agent_mode: {
            type: "string",
            description: "Child agent mode: bagsfm, pumpfun, solana, soldev, base, crypto, trading, quant, security, research, defi, twitter, onchain, whale, github, telegram, macro, derivatives, airdrop, memescan, code, filesystem, shell",
          },
          prompt: {
            type: "string",
            description: "Specific task for the child agent. Be focused and clear.",
          },
        },
        required: ["agent_mode", "prompt"],
      },
      handler: async (input: Record<string, unknown>) => {
        const result = await this.delegate({
          childAgent: input.agent_mode as string,
          prompt: input.prompt as string,
          parentAgent: currentAgent,
        });
        return {
          success: result.success,
          data: {
            childAgent: input.agent_mode,
            output: result.output,
            toolCallsCount: result.toolCalls.length,
            tools: result.toolCalls.map((t) => t.name),
          },
          error: result.error,
        };
      },
    };
  }
}
