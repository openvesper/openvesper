// ============================================================
// 🌒 Context Engine — Modular system prompt builder
// ============================================================
//
// Instead of one big string concat, the context engine assembles the
// system prompt from typed layers in a deterministic order. Each layer
// is independent and can be enabled/disabled or modified by hooks.
//
// Layer order (top to bottom in the prompt):
//   1. Bootstrap   — date, hostname, timezone, agent identity
//   2. Persona     — SOUL.md content
//   3. User        — USER.md content
//   4. Identity    — IDENTITY.md content
//   5. Tools       — TOOLS.md content (tool policy)
//   6. Skills      — skill descriptions agent might pull in
//   7. Memory      — relevant entries from active memory
//   8. Commitments — open commitments the agent owes the user
//   9. Standing    — user's standing orders for this agent
//  10. Project     — project-level AGENTS.md if present
//
// PRIVACY: All layers built from local files. Nothing transmitted off-machine
// except the assembled prompt sent to the user's chosen LLM provider.

import fs from "fs/promises";
import path from "path";
import os from "os";
import { memoryEngine } from "./memory-engine.js";
import { commitments } from "./commitments.js";
import { standingOrders } from "./standing-orders.js";

export interface ContextLayer {
  name: string;
  /** Higher = earlier in the prompt */
  priority: number;
  content: string;
  enabled: boolean;
}

export interface ContextBuildOptions {
  agent: string;
  sessionKey: string;
  recentMessages?: { content: string }[];
  /** Which layers to enable. Default: all. */
  includeLayers?: string[];
  /** Which layers to skip even if includeLayers includes them */
  excludeLayers?: string[];
  /** Path to bundled agents dir (default: process.cwd() + "/.agents") */
  agentsDir?: string;
}

const DEFAULT_PRIORITIES = {
  bootstrap: 100,
  persona: 90,    // SOUL.md
  user: 80,       // USER.md
  identity: 70,   // IDENTITY.md
  tools: 60,      // TOOLS.md
  skills: 50,
  memory: 40,
  commitments: 30,
  standing: 20,
  project: 10,    // AGENTS.md
};

export class ContextEngine {
  /**
   * Find an agent's directory. Prefers user-installed agents over bundled.
   */
  async resolveAgentDir(agent: string, bundledDir?: string): Promise<string | null> {
    const userPath = path.join(os.homedir(), ".openvesper", "agents", agent);
    try {
      await fs.access(path.join(userPath, "SOUL.md"));
      return userPath;
    } catch {
      const bundlePath = path.join(bundledDir || path.join(process.cwd(), ".agents"), agent);
      try {
        await fs.access(path.join(bundlePath, "SOUL.md"));
        return bundlePath;
      } catch {
        return null;
      }
    }
  }

  /** Build the assembled system prompt for an agent invocation. */
  async build(opts: ContextBuildOptions): Promise<{ prompt: string; layers: ContextLayer[] }> {
    const agentDir = await this.resolveAgentDir(opts.agent, opts.agentsDir);
    const layers: ContextLayer[] = [];

    // Bootstrap
    layers.push({
      name: "bootstrap",
      priority: DEFAULT_PRIORITIES.bootstrap,
      enabled: this.isEnabled("bootstrap", opts),
      content: this.buildBootstrapLayer(opts.agent),
    });

    if (agentDir) {
      for (const [name, file] of [
        ["persona", "SOUL.md"],
        ["user", "USER.md"],
        ["identity", "IDENTITY.md"],
        ["tools", "TOOLS.md"],
      ] as const) {
        const content = await this.readFile(path.join(agentDir, file));
        if (content) {
          layers.push({
            name,
            priority: DEFAULT_PRIORITIES[name as keyof typeof DEFAULT_PRIORITIES],
            enabled: this.isEnabled(name, opts),
            content,
          });
        }
      }

      // Skills
      const skillsLayer = await this.buildSkillsLayer(agentDir);
      if (skillsLayer) {
        layers.push({
          name: "skills",
          priority: DEFAULT_PRIORITIES.skills,
          enabled: this.isEnabled("skills", opts),
          content: skillsLayer,
        });
      }
    }

    // Memory (active memory engine, not MEMORY.md)
    const memoryLayer = await memoryEngine.buildContext(
      opts.agent,
      opts.recentMessages || [],
      5
    );
    if (memoryLayer) {
      layers.push({
        name: "memory",
        priority: DEFAULT_PRIORITIES.memory,
        enabled: this.isEnabled("memory", opts),
        content: memoryLayer,
      });
    }

    // Commitments
    const commitmentsLayer = await commitments.getOpenCommitmentsContext(opts.sessionKey);
    if (commitmentsLayer) {
      layers.push({
        name: "commitments",
        priority: DEFAULT_PRIORITIES.commitments,
        enabled: this.isEnabled("commitments", opts),
        content: commitmentsLayer,
      });
    }

    // Standing orders
    const standingLayer = await standingOrders.getSystemPromptAugmentation(opts.agent);
    if (standingLayer) {
      layers.push({
        name: "standing",
        priority: DEFAULT_PRIORITIES.standing,
        enabled: this.isEnabled("standing", opts),
        content: standingLayer,
      });
    }

    // Project AGENTS.md (walk up from cwd)
    const projectLayer = await this.findProjectAgentsMd();
    if (projectLayer) {
      layers.push({
        name: "project",
        priority: DEFAULT_PRIORITIES.project,
        enabled: this.isEnabled("project", opts),
        content: projectLayer,
      });
    }

    // Filter + sort by priority desc
    const enabled = layers.filter((l) => l.enabled).sort((a, b) => b.priority - a.priority);
    const prompt = enabled.map((l) => l.content).filter(Boolean).join("\n\n");

    return { prompt, layers: enabled };
  }

  private isEnabled(name: string, opts: ContextBuildOptions): boolean {
    if (opts.excludeLayers?.includes(name)) return false;
    if (opts.includeLayers) return opts.includeLayers.includes(name);
    return true;
  }

  private async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  private buildBootstrapLayer(agent: string): string {
    const now = new Date();
    return [
      "## Bootstrap context",
      "",
      `- Date: ${now.toISOString()}`,
      `- Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      `- Active agent: ${agent}`,
      `- OpenVesper version: 1.7.0`,
      "",
    ].join("\n");
  }

  private async buildSkillsLayer(agentDir: string): Promise<string | null> {
    const skillsDir = path.join(agentDir, "skills");
    try {
      const skills = await fs.readdir(skillsDir, { withFileTypes: true });
      const skillDescriptions: { name: string; description: string }[] = [];

      for (const entry of skills) {
        if (!entry.isDirectory()) continue;
        const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
        try {
          const content = await fs.readFile(skillFile, "utf-8");
          // Parse frontmatter description
          const match = content.match(/^---[\s\S]*?description:\s*\|?\s*\n?([\s\S]*?)(?:\n---|\n\w+:)/);
          if (match) {
            skillDescriptions.push({
              name: entry.name,
              description: match[1].trim().replace(/\s+/g, " ").slice(0, 200),
            });
          }
        } catch {
          // skip
        }
      }

      if (skillDescriptions.length === 0) return null;
      return [
        "## Available skills",
        "",
        "You can apply these specialized instruction sets when relevant:",
        ...skillDescriptions.map((s) => `- **${s.name}**: ${s.description}`),
        "",
      ].join("\n");
    } catch {
      return null;
    }
  }

  private async findProjectAgentsMd(): Promise<string | null> {
    let dir = process.cwd();
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, "AGENTS.md");
      try {
        const content = await fs.readFile(candidate, "utf-8");
        return [
          "## Project context (from AGENTS.md)",
          "",
          content,
          "",
        ].join("\n");
      } catch {
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
    }
    return null;
  }
}

export const contextEngine = new ContextEngine();
