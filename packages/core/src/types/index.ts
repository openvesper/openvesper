// ============================================================
// 🌒 @openvesper/core — Type Definitions (v2)
// ============================================================

export type ProviderName =
  | "anthropic" | "openai" | "gemini" | "grok" | "deepseek"
  | "mistral" | "groq" | "together" | "openrouter"
  | "fireworks" | "nebius" | "deepinfra"
  | "ollama" | "lmstudio" | "perplexity";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | LLMContentBlock[];
  tool_call_id?: string;
}

export interface LLMContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

export interface LLMTool {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export interface LLMRequest {
  messages: LLMMessage[];
  system?: string;
  tools?: LLMTool[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  content: LLMContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence" | "other";
  usage?: { inputTokens: number; outputTokens: number };
  model: string;
  provider: ProviderName;
}

export interface LLMProvider {
  name: ProviderName;
  defaultModel: string;
  supportsTools: boolean;
  call(req: LLMRequest): Promise<LLMResponse>;
  isAvailable(): boolean;
}

// ── Permissions ───────────────────────────────────────────────────────────────

export type PermissionLevel = "read" | "write" | "execute" | "external" | "trade";
export type PermissionMode = "allow_always" | "ask" | "deny";

export interface PermissionRequest {
  toolName: string;
  level: PermissionLevel;
  reason: string;
  input: Record<string, unknown>;
}

export type PermissionHandler = (req: PermissionRequest) => Promise<boolean>;

// ── Tools ─────────────────────────────────────────────────────────────────────

export interface ToolResult<T = unknown> { success: boolean; data?: T; error?: string }

export interface ToolContext {
  env: Record<string, string | undefined>;
  log: (msg: string) => void;
  fetch: typeof fetch;
  workspace: WorkspaceContext;
  spawn?: (opts: { agent?: string; prompt: string; tools?: string[] }) => Promise<{ output: string; success: boolean }>;
  requestPermission?: (req: Omit<PermissionRequest, "toolName" | "input">) => Promise<boolean>;
}

export interface WorkspaceContext {
  id: string;
  path: string;
  data: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: LLMTool["input_schema"];
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
  category?: string;
  permission?: PermissionLevel;
  requireApproval?: boolean;
}

// ── Skills ────────────────────────────────────────────────────────────────────

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  body: string;
  requiresTools?: string[];
  keywords?: string[];

  // ── Gating (load-time filters) ──
  /** Source level — set by loader. */
  source?: "workspace" | "project-agent" | "personal-agent" | "managed" | "bundled" | "extra";
  /** Absolute path of skill folder (or SKILL.md if flat). Set by loader. */
  dir?: string;
  /** If true, skill is always eligible regardless of other gates. */
  always?: boolean;
  /** Platforms where this skill is eligible. If unset, all OSes allowed. */
  os?: ("darwin" | "linux" | "win32")[];
  /** Binaries that must exist on PATH. ALL must be present. */
  requiresBins?: string[];
  /** Binaries — ANY ONE must exist on PATH. */
  requiresAnyBins?: string[];
  /** Environment variables that must be set. */
  requiresEnv?: string[];
  /** Dotted openvesper.json keys that must be truthy. */
  requiresConfig?: string[];
  /** Env var name associated with this skill's API key. */
  primaryEnv?: string;
  /** Optional emoji for UI. */
  emoji?: string;
  /** Optional homepage URL. */
  homepage?: string;
  /** Whether the skill is exposed as a slash command. Default true. */
  userInvocable?: boolean;
  /** When true, skill instructions are NOT injected into prompt; only available as slash command. */
  disableModelInvocation?: boolean;
}

// ── Agents ────────────────────────────────────────────────────────────────────

export interface AgentDefinition {
  mode: string;
  icon?: string;
  name?: string;
  description?: string;
  systemPrompt: string;
  allowedTools: string[] | "*";
  skills?: string[];
  defaultLLM?: { provider: ProviderName; model?: string };
  canDelegate?: boolean;
}

// ── Slash Commands ────────────────────────────────────────────────────────────

export interface SlashCommandContext {
  args: string[];
  raw: string;
  vesper: unknown;
  output: (msg: string) => void;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage?: string;
  handler: (ctx: SlashCommandContext) => Promise<void> | void;
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export interface PluginDefinition {
  name: string;
  version: string;
  author?: string;
  description?: string;
  homepage?: string;
  license?: string;
  tools?: ToolDefinition[];
  agents?: AgentDefinition[];
  skills?: SkillDefinition[];
  commands?: SlashCommand[];
  systemPrompts?: Record<string, string>;
  onLoad?: (ctx: ToolContext) => void | Promise<void>;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TaskOptions {
  agent?: string;
  prompt: string;
  llm?: { provider?: ProviderName; model?: string };
  tools?: string[];
  skills?: string[];
  maxIterations?: number;
  temperature?: number;
  memory?: boolean;
  permissionHandler?: PermissionHandler;
}

export interface TaskResult {
  success: boolean;
  output: string;
  toolCalls: { name: string; input: Record<string, unknown>; result: ToolResult }[];
  iterations: number;
  usage?: { totalInputTokens: number; totalOutputTokens: number };
  error?: string;
}

export interface WorkspaceOptions {
  id?: string;
  path?: string;
  memory?: boolean;
}

export interface MemoryItem {
  id: string;
  timestamp: number;
  type: string;
  prompt: string;
  response: string;
  tags: string[];
  toolsUsed: string[];
}
