// ============================================================
// 🌒 @openvesper/core — Plan Mode
// Agent presents a plan, user approves, then executes (Markdown-based)
// ============================================================

import { ProviderName, LLMMessage, AgentDefinition, ToolDefinition } from "../types";
import { getProvider } from "../providers";

export interface Plan {
  goal: string;
  steps: PlanStep[];
  risks: string[];
  estimatedToolCalls: number;
  rawText: string;
}

export interface PlanStep {
  index: number;
  description: string;
  tool?: string;
  reasoning?: string;
}

export interface PlanRequest {
  prompt: string;
  agent: AgentDefinition;
  llm: { provider: ProviderName; model?: string; apiKey?: string };
  availableTools: ToolDefinition[];
}

/**
 * Ask the LLM to plan before executing.
 * Returns a structured plan that the user can approve/reject/edit.
 */
export async function generatePlan(req: PlanRequest): Promise<Plan> {
  const toolList = req.availableTools
    .slice(0, 30) // cap to avoid blowing context
    .map((t) => `- ${t.name}: ${t.description.slice(0, 100)}`)
    .join("\n");

  const planPrompt = `You are in PLAN MODE. DO NOT execute any tools.

Your job: read the user's request, then propose a plan. Output in this EXACT format:

GOAL: <one-sentence goal>

STEPS:
1. <step description> [tool: <tool_name or N/A>]
2. <step description> [tool: <tool_name or N/A>]
...

RISKS:
- <potential issue 1>
- <potential issue 2>

TOOL_COUNT: <estimated number of tool calls>

---

Available tools:
${toolList}

User request: ${req.prompt}

Plan:`;

  const provider = getProvider(req.llm.provider);
  const messages: LLMMessage[] = [
    { role: "user", content: planPrompt },
  ];

  const response = await provider.call({
    model: req.llm.model || provider.defaultModel,
    messages,
    system: req.agent.systemPrompt,
    maxTokens: 1500,
    temperature: 0.3,
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return parsePlan(text);
}

/**
 * Parse the LLM's plan output into structured form.
 */
export function parsePlan(text: string): Plan {
  const lines = text.split("\n");
  let goal = "";
  const steps: PlanStep[] = [];
  const risks: string[] = [];
  let estimatedToolCalls = 0;

  let section: "goal" | "steps" | "risks" | "tool_count" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.toUpperCase().startsWith("GOAL:")) {
      goal = line.replace(/^goal:\s*/i, "").trim();
      section = "goal";
      continue;
    }
    if (line.toUpperCase().startsWith("STEPS")) {
      section = "steps";
      continue;
    }
    if (line.toUpperCase().startsWith("RISKS")) {
      section = "risks";
      continue;
    }
    if (line.toUpperCase().startsWith("TOOL_COUNT:")) {
      const m = line.match(/(\d+)/);
      if (m) estimatedToolCalls = parseInt(m[1]);
      continue;
    }

    // Step lines: "1. Do something [tool: foo]"
    if (section === "steps") {
      const stepMatch = line.match(/^\d+\.\s*(.+)$/);
      if (stepMatch) {
        const stepText = stepMatch[1];
        const toolMatch = stepText.match(/\[tool:\s*([^\]]+)\]/i);
        const tool = toolMatch && toolMatch[1].toLowerCase() !== "n/a" ? toolMatch[1].trim() : undefined;
        steps.push({
          index: steps.length + 1,
          description: stepText.replace(/\[tool:[^\]]+\]/i, "").trim(),
          tool,
        });
      }
    }

    if (section === "risks") {
      const riskMatch = line.match(/^[-•]\s*(.+)$/);
      if (riskMatch) risks.push(riskMatch[1]);
    }
  }

  return { goal, steps, risks, estimatedToolCalls, rawText: text };
}

/**
 * Format a plan for terminal/UI display.
 */
export function formatPlan(plan: Plan): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("📋 PLAN");
  lines.push("─".repeat(60));
  lines.push(`🎯 Goal: ${plan.goal}`);
  lines.push("");
  lines.push("📝 Steps:");
  for (const step of plan.steps) {
    const toolMark = step.tool ? ` [⚙ ${step.tool}]` : "";
    lines.push(`  ${step.index}. ${step.description}${toolMark}`);
  }
  if (plan.risks.length > 0) {
    lines.push("");
    lines.push("⚠ Risks:");
    for (const risk of plan.risks) lines.push(`  • ${risk}`);
  }
  lines.push("");
  lines.push(`📊 Estimated tool calls: ${plan.estimatedToolCalls}`);
  lines.push("─".repeat(60));
  return lines.join("\n");
}

/**
 * User interaction for plan approval (CLI version).
 */
export interface PlanApproval {
  approved: boolean;
  editedPrompt?: string;
  comment?: string;
}

export type PlanApprovalHandler = (plan: Plan) => Promise<PlanApproval>;
