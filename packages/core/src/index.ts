// ============================================================
// 🌒 @openvesper/core — Public API
// ============================================================

// Types
export * from "./types";

// LLM Providers
export * from "./providers";

// Secrets (opt-in OS keychain integration)
export * as secrets from "./secrets";

// Runtime
export { Vesper, createVesper } from "./runtime/vesper";
export type { VesperOptions } from "./runtime/vesper";
export { Task } from "./runtime/task";
export type { TaskRunnerOptions } from "./runtime/task";
export { ConversationManager } from "./runtime/conversations";

// Registries
export { PluginRegistry } from "./plugins/registry";
export { SkillRegistry } from "./skills/registry";
export { CommandRegistry } from "./commands/registry";

// Subsystems
export { MemoryManager } from "./memory";
export { PermissionManager } from "./permissions/manager";
export { Orchestrator } from "./orchestrator";
export type { DelegationContext, OrchestratorOptions } from "./orchestrator";

// Streaming
export {
  streamLLM, streamAnthropic, streamOpenAICompat, streamGemini, streamOllama,
} from "./streaming";
export type { StreamChunk, StreamRequest } from "./streaming";

// MCP
export { MCPClient, MCPManager } from "./mcp";
export type { MCPServerConfig, MCPTool } from "./mcp";

// Routing
export { routeKeyword, routeLLM, smartRoute } from "./routing";
export type { RoutingResult } from "./routing";

// Cache
export { LRUCache, RequestBatcher, toolCache, globalBatcher, toolCacheKey, CACHE_TTL } from "./cache";
export type { CacheEntry, CacheStats } from "./cache";

// Markdown agent + skill loading (OpenClaw-compatible)
export {
  loadAgentFromMarkdown,
  loadAgentsFromDirectory,
  loadSkillFromMarkdown,
  loadSkillsFromDirectory,
  loadProjectContext,
  agentToMarkdown,
  resolveSkillsWithPrecedence,
  loadWorkspaceBootstrap,
  setupAgentWorkspace,
  BOOTSTRAP_FILES,
  BOOTSTRAP_MAX_CHARS,
  BOOTSTRAP_TOTAL_MAX_CHARS,
} from "./markdown";
export type {
  AgentFrontmatter,
  SkillFrontmatter,
  LoadedAgent,
  WorkspaceBootstrap,
} from "./markdown";

// Skill loader (multi-source + gating + allowlist)
export {
  loadAllSkills,
  buildDefaultSources,
  checkGating,
  estimateSkillsPromptChars,
  resolveAgentAllowlist,
  filterByAllowlist,
} from "./skills/loader";
export type {
  SkillSource,
  SkillSourceLevel,
  LoaderOptions,
  LoadResult,
  GatingResult,
  AgentAllowlistConfig,
} from "./skills/loader";

// Planning
export { generatePlan, parsePlan, formatPlan } from "./planning";
export type { Plan, PlanStep, PlanRequest, PlanApproval, PlanApprovalHandler } from "./planning";

// Heartbeat / Cron (Sprint 6)
export {
  Scheduler,
  parseCron,
  cronMatches,
  nextRunAfter,
} from "./heartbeat/scheduler";
export type { CronJob, CronJobsConfig, SchedulerOptions, JobRunner, Deliverer } from "./heartbeat/scheduler";

export {
  WebhookRouter,
  verifyWebhookSignature,
  expandWebhookPrompt,
  matchesFilter,
} from "./heartbeat/webhooks";
export type { WebhookConfig, WebhookEvent, WebhookHandler } from "./heartbeat/webhooks";

export {
  loadHeartbeat,
  loadAllHeartbeats,
  buildHeartbeatPrompt,
} from "./heartbeat";
export type { HeartbeatItem } from "./heartbeat";

export { loadCronConfig, loadWebhookConfig } from "./heartbeat/config";
