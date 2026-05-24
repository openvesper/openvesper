// ============================================================
// 🌒 @openvesper/core — Plugin Registry (v3)
//
// Central registry for plugins, tools, agents, skills, commands.
// Supports both plugin-bundled registration and direct registration
// (used by markdown agent/skill loader).
// ============================================================

import { PluginDefinition, ToolDefinition, AgentDefinition, ToolContext, SkillDefinition, SlashCommand } from "../types";
import { SkillRegistry } from "../skills/registry";
import { CommandRegistry } from "../commands/registry";

export class PluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();
  private tools: Map<string, ToolDefinition> = new Map();
  private agents: Map<string, AgentDefinition> = new Map();
  public readonly skills = new SkillRegistry();
  public readonly commands = new CommandRegistry();

  /** Register a plugin (with its tools, agents, skills, commands). */
  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' already registered`);
    }
    this.plugins.set(plugin.name, plugin);

    for (const tool of plugin.tools || []) {
      if (this.tools.has(tool.name)) {
        // eslint-disable-next-line no-console
        console.warn(`Tool '${tool.name}' from ${plugin.name} overrides existing tool`);
      }
      this.tools.set(tool.name, tool);
    }
    for (const agent of plugin.agents || []) this.registerAgent(agent);
    for (const skill of plugin.skills || []) this.registerSkill(skill);
    for (const cmd of plugin.commands || []) this.commands.register(cmd);
  }

  /** Register a single tool (mostly used internally by `register()`). */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /** Register a single agent (e.g. loaded from markdown). */
  registerAgent(agent: AgentDefinition): void {
    if (this.agents.has(agent.mode)) {
      // eslint-disable-next-line no-console
      console.warn(`Agent '${agent.mode}' already registered, overriding`);
    }
    this.agents.set(agent.mode, agent);
  }

  /** Register a single skill (e.g. loaded from markdown). */
  registerSkill(skill: SkillDefinition): void {
    this.skills.register(skill);
  }

  /** Dynamically load a plugin package by name. */
  async loadPackage(packageName: string): Promise<void> {
    try {
      const mod = await import(packageName);
      const plugin = (mod.default || mod) as PluginDefinition;
      if (!plugin?.name) throw new Error(`Plugin ${packageName} has no valid export`);
      this.register(plugin);
    } catch (e: any) {
      throw new Error(`Failed to load plugin ${packageName}: ${e.message}`);
    }
  }

  /** Run plugin onLoad hooks. */
  async initialize(ctx: ToolContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.onLoad) {
        try { await plugin.onLoad(ctx); }
        catch (e) { /* eslint-disable-next-line no-console */ console.warn(`Plugin ${plugin.name} onLoad failed:`, e); }
      }
    }
  }

  // ── Lookups ───────────────────────────────────────────────
  getTool(name: string): ToolDefinition | undefined { return this.tools.get(name); }
  getAgent(mode: string): AgentDefinition | undefined { return this.agents.get(mode); }
  getSkill(id: string): SkillDefinition | undefined { return this.skills.get(id); }
  getPlugin(name: string): PluginDefinition | undefined { return this.plugins.get(name); }

  // ── Listings ──────────────────────────────────────────────
  listTools(): ToolDefinition[] { return Array.from(this.tools.values()); }
  listAgents(): AgentDefinition[] { return Array.from(this.agents.values()); }
  listPlugins(): PluginDefinition[] { return Array.from(this.plugins.values()); }
  listSkills(): SkillDefinition[] { return this.skills.list(); }
  listCommands(): SlashCommand[] { return this.commands.list(); }

  /**
   * Resolve the set of tools an agent is allowed to call.
   * Returns ONLY tools that both:
   *   1. The agent's allowedTools whitelist permits, AND
   *   2. Are actually registered in this registry.
   *
   * Use `validateAgent` on Vesper to detect mismatches before runtime.
   */
  getToolsForAgent(mode: string): ToolDefinition[] {
    const agent = this.agents.get(mode);
    if (!agent) return [];
    if (agent.allowedTools === "*") return this.listTools();
    return agent.allowedTools
      .map((n) => this.tools.get(n))
      .filter((t): t is ToolDefinition => Boolean(t));
  }

  /**
   * Resolve the set of skills attached to an agent.
   */
  getSkillsForAgent(mode: string): SkillDefinition[] {
    const agent = this.agents.get(mode);
    if (!agent || !agent.skills) return [];
    return agent.skills
      .map((id) => this.skills.get(id))
      .filter((s): s is SkillDefinition => Boolean(s));
  }
}
