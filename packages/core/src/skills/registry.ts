// ============================================================
// 🌒 @openvesper/core — Skills System
// OpenVesper/Anthropic Skills-inspired capability bundles
// ============================================================

import { SkillDefinition } from "../types";

export class SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Auto-detect relevant skills based on prompt keywords.
   * Returns up to `limit` matching skills sorted by relevance.
   */
  detectFromPrompt(prompt: string, limit = 3): SkillDefinition[] {
    const lower = prompt.toLowerCase();
    const scored: { skill: SkillDefinition; score: number }[] = [];

    for (const skill of this.skills.values()) {
      let score = 0;
      for (const kw of skill.keywords || []) {
        if (lower.includes(kw.toLowerCase())) score += 2;
      }
      const descWords = skill.description.toLowerCase().split(/\s+/);
      for (const word of descWords) {
        if (word.length > 4 && lower.includes(word)) score += 1;
      }
      if (score > 0) scored.push({ skill, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.skill);
  }

  /**
   * Build a context block from skill definitions, to inject into system prompt.
   */
  buildContext(skillIds: string[]): string {
    const skills = skillIds.map((id) => this.skills.get(id)).filter((s): s is SkillDefinition => Boolean(s));
    if (!skills.length) return "";

    return "\n\n<active_skills>\n" + skills.map((s) =>
      `## Skill: ${s.name}\n\n${s.body}\n`
    ).join("\n---\n") + "\n</active_skills>\n";
  }
}
