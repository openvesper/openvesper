// ============================================================
// 🌒 @openvesper/core — Vesper workspace (v3)
//
// Top-level runtime that ties together:
//   - Plugins (tools + agents)
//   - Markdown agents (.agents/<name>/manifest.md)
//   - Skills (skills/*.md and agent-specific skills)
//   - Memory, permissions, workspace
// ============================================================

import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import {
  ProviderName,
  PluginDefinition,
  AgentDefinition,
  SkillDefinition,
  TaskOptions,
  WorkspaceContext,
  PermissionHandler,
} from "../types";
import { PluginRegistry } from "../plugins/registry";
import { MemoryManager } from "../memory";
import { PermissionManager } from "../permissions/manager";
import { Task } from "./task";
import {
  loadAgentFromMarkdown,
  loadAgentsFromDirectory,
  loadSkillsFromDirectory,
  loadSkillFromMarkdown,
  LoadedAgent,
} from "../markdown";

export interface VesperOptions {
  llm?: { provider?: ProviderName; model?: string };
  plugins?: (PluginDefinition | string)[];
  workspace?: { id?: string; path?: string };
  memory?: { enabled?: boolean; maxItems?: number; file?: string };
  permissions?: { handler?: PermissionHandler };
  /** Auto-load .agents/ from cwd at startup */
  agentsDir?: string | false;
  /** Auto-load skills/ from cwd at startup */
  skillsDir?: string | false;
}

export class Vesper {
  private registry: PluginRegistry;
  private memory?: MemoryManager;
  private workspace: WorkspaceContext;
  private defaultLLM: { provider: ProviderName; model?: string };
  private permissionManager: PermissionManager;
  private _pendingPlugins: string[] = [];

  constructor(options: VesperOptions = {}) {
    this.registry = new PluginRegistry();
    this.defaultLLM = {
      provider: options.llm?.provider || (process.env.LLM_PROVIDER as ProviderName) || "anthropic",
      model: options.llm?.model,
    };

    const wsId = options.workspace?.id || "default";
    const wsPath = options.workspace?.path || path.join(os.homedir(), ".openvesper", wsId);
    if (!fs.existsSync(wsPath)) fs.mkdirSync(wsPath, { recursive: true });
    this.workspace = { id: wsId, path: wsPath, data: {} };

    if (options.memory?.enabled !== false) {
      this.memory = new MemoryManager({
        file: options.memory?.file || path.join(wsPath, "memory.json"),
        maxItems: options.memory?.maxItems || 100,
        enabled: options.memory?.enabled ?? true,
      });
    }

    this.permissionManager = new PermissionManager({ handler: options.permissions?.handler });

    for (const p of options.plugins || []) {
      if (typeof p === "string") this._pendingPlugins.push(p);
      else this.registry.register(p);
    }

    // Auto-load .agents/ unless explicitly disabled
    if (options.agentsDir !== false) {
      const dir = typeof options.agentsDir === "string"
        ? options.agentsDir
        : path.join(process.cwd(), ".agents");
      if (fs.existsSync(dir)) this.useAgentDirectory(dir);
    }

    // Auto-load skills/ unless explicitly disabled
    if (options.skillsDir !== false) {
      const dir = typeof options.skillsDir === "string"
        ? options.skillsDir
        : path.join(process.cwd(), "skills");
      if (fs.existsSync(dir)) this.useSkillsDirectory(dir);
    }
  }

  async loadPlugins(): Promise<void> {
    for (const name of this._pendingPlugins) await this.registry.loadPackage(name);
    this._pendingPlugins = [];
  }

  /**
   * Register a plugin (tools + agents).
   */
  use(plugin: PluginDefinition): this {
    this.registry.register(plugin);
    return this;
  }

  /**
   * Register a markdown-defined agent.
   *
   * Path can be:
   *   - A directory: ".agents/security-reviewer"        (looks for manifest.md inside)
   *   - A manifest:   ".agents/security-reviewer/manifest.md"
   *   - A flat .md:   ".agents/legacy.md"
   *
   * Agent-specific skills in <agentDir>/skills/ are auto-registered.
   */
  useMarkdownAgent(pathOrDir: string): this {
    const loaded = loadAgentFromMarkdown(pathOrDir);
    this.registry.registerAgent(loaded.agent);
    for (const skill of loaded.skills) {
      this.registry.registerSkill(skill);
    }
    return this;
  }

  /**
   * Register all markdown agents found in a directory.
   *
   * Default: scans ".agents/" relative to cwd.
   */
  useAgentDirectory(dir: string = path.join(process.cwd(), ".agents")): this {
    const loaded = loadAgentsFromDirectory(dir);
    for (const { agent, skills } of loaded) {
      this.registry.registerAgent(agent);
      for (const skill of skills) {
        this.registry.registerSkill(skill);
      }
    }
    return this;
  }

  /**
   * Register all skills found in a directory (project-wide skills).
   *
   * Default: scans "skills/" relative to cwd.
   */
  useSkillsDirectory(dir: string = path.join(process.cwd(), "skills")): this {
    const skills = loadSkillsFromDirectory(dir);
    for (const skill of skills) {
      this.registry.registerSkill(skill);
    }
    return this;
  }

  /**
   * Register a single skill from a markdown file.
   */
  useSkill(filePath: string): this {
    const skill = loadSkillFromMarkdown(filePath);
    this.registry.registerSkill(skill);
    return this;
  }

  /**
   * Verify that all of an agent's allowedTools and required skills exist in the registry.
   * Returns the list of missing references.
   */
  validateAgent(agentMode: string): { missingTools: string[]; missingSkills: string[]; warnings: string[] } {
    const agent = this.registry.getAgent(agentMode);
    if (!agent) {
      return { missingTools: [], missingSkills: [], warnings: [`Agent "${agentMode}" not found`] };
    }

    const missingTools: string[] = [];
    const missingSkills: string[] = [];
    const warnings: string[] = [];

    if (Array.isArray(agent.allowedTools)) {
      for (const toolName of agent.allowedTools) {
        if (!this.registry.getTool(toolName)) {
          missingTools.push(toolName);
        }
      }
    }

    for (const skillId of agent.skills || []) {
      if (!this.registry.getSkill(skillId)) {
        missingSkills.push(skillId);
      }
    }

    if (missingTools.length > 0) {
      warnings.push(
        `Agent "${agentMode}" references ${missingTools.length} unknown tools: ${missingTools.join(", ")}. Load the corresponding plugins.`
      );
    }
    if (missingSkills.length > 0) {
      warnings.push(
        `Agent "${agentMode}" references ${missingSkills.length} unknown skills: ${missingSkills.join(", ")}.`
      );
    }

    return { missingTools, missingSkills, warnings };
  }

  /**
   * Validate ALL registered agents at once. Returns a summary.
   */
  validateAll(): {
    agents: number;
    valid: number;
    invalid: { agent: string; missingTools: string[]; missingSkills: string[] }[];
  } {
    const all = this.listAgents();
    const invalid: { agent: string; missingTools: string[]; missingSkills: string[] }[] = [];

    for (const a of all) {
      const { missingTools, missingSkills } = this.validateAgent(a.mode);
      if (missingTools.length || missingSkills.length) {
        invalid.push({ agent: a.mode, missingTools, missingSkills });
      }
    }

    return {
      agents: all.length,
      valid: all.length - invalid.length,
      invalid,
    };
  }

  task(opts: TaskOptions): Task {
    return new Task(opts, {
      registry: this.registry,
      memory: this.memory,
      workspace: this.workspace,
      defaultLLM: this.defaultLLM,
      permissions: this.permissionManager,
      vesper: this,
    });
  }

  async run(opts: TaskOptions): Promise<string> {
    const task = this.task(opts);
    const result = await task.run();
    if (!result.success) throw new Error(result.error || "Task failed");
    return result.output;
  }

  listPlugins() { return this.registry.listPlugins(); }
  listAgents() { return this.registry.listAgents(); }
  listTools() { return this.registry.listTools(); }
  listSkills() { return this.registry.listSkills(); }
  listCommands() { return this.registry.listCommands(); }
  getRegistry() { return this.registry; }
  getMemory() { return this.memory; }
  getWorkspace() { return this.workspace; }
  getDefaultLLM() { return this.defaultLLM; }
  getPermissions() { return this.permissionManager; }

  setLLM(provider: ProviderName, model?: string) {
    this.defaultLLM = { provider, model };
  }

  async runCommand(input: string, output: (msg: string) => void): Promise<boolean> {
    return this.registry.commands.tryExecute(input, this, output);
  }
}

export function createVesper(opts: VesperOptions = {}): Vesper {
  return new Vesper(opts);
}
