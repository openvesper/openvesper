// ============================================================
// 🌒 Multi-Agent Routing — Auto-select the best specialist
// ============================================================
//
// User sends a message. Instead of always running the default agent, the
// router examines the message and picks the most appropriate specialist.
//
// OpenClaw calls these "specialist lanes". A single conversation can
// invisibly route different messages to different agents.
//
// PRIVACY: Routing decisions happen in the user's gateway process. No
// data leaves the machine except the prompt to the user's chosen LLM.

import fs from "fs/promises";
import path from "path";

export interface AgentRoute {
  mode: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
  /** Keywords that strongly suggest this agent (case-insensitive) */
  keywords: string[];
}

export class AgentRouter {
  private routes: AgentRoute[] = [];
  private agentsDirs: string[] = [];

  /** Add a directory to scan for agents */
  addAgentsDir(dir: string): void {
    if (!this.agentsDirs.includes(dir)) {
      this.agentsDirs.push(dir);
    }
  }

  /** Load all known agents from registered dirs */
  async load(): Promise<void> {
    this.routes = [];
    for (const dir of this.agentsDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const agentPath = path.join(dir, entry.name);
          const route = await this.loadRoute(agentPath, entry.name);
          if (route) this.routes.push(route);
        }
      } catch {
        // skip unreadable dirs
      }
    }
  }

  private async loadRoute(agentPath: string, mode: string): Promise<AgentRoute | null> {
    const identityPath = path.join(agentPath, "IDENTITY.md");
    let name = mode;
    let icon = "🤖";
    let description = "";
    let tags: string[] = [];

    try {
      const content = await fs.readFile(identityPath, "utf-8");
      const nameMatch = content.match(/\*\*Name\*\*:\s*(.+)/);
      if (nameMatch) name = nameMatch[1].trim();
      const iconMatch = content.match(/\*\*Icon\*\*:\s*(.+)/);
      if (iconMatch) icon = iconMatch[1].trim();
      const descMatch = content.match(/## What I am\s*\n+(.+?)(?:\n\n|##|$)/s);
      if (descMatch) description = descMatch[1].trim().split("\n")[0];
      const tagsMatch = content.match(/## Tags\s*\n+(.+?)(?:\n\n|##|$)/s);
      if (tagsMatch) tags = tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
    } catch {
      return null;
    }

    // Derive keywords from name + description + tags
    const keywords = this.extractKeywords([name, description, ...tags].join(" "));

    return { mode, name, icon, description, tags, keywords };
  }

  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    return Array.from(new Set(words));
  }

  /**
   * Route a message — return the best matching agent.
   * Falls back to "auto" if no specialist matches strongly.
   */
  route(message: string, currentAgent = "auto"): { mode: string; score: number; reason: string } {
    const lower = message.toLowerCase();

    let bestScore = 0;
    let bestRoute: AgentRoute | null = null;
    const matchedKeywords: string[] = [];

    for (const route of this.routes) {
      let score = 0;
      const matched: string[] = [];

      // Exact tag match
      for (const tag of route.tags) {
        if (lower.includes(tag.toLowerCase())) {
          score += 5;
          matched.push(tag);
        }
      }

      // Keyword match
      for (const kw of route.keywords) {
        if (lower.includes(kw)) {
          score += 1;
          matched.push(kw);
        }
      }

      // Exact mode name match in message (e.g. "ask defi-strategist about X")
      if (lower.includes(route.mode)) {
        score += 10;
        matched.push(route.mode);
      }

      if (score > bestScore) {
        bestScore = score;
        bestRoute = route;
        matchedKeywords.length = 0;
        matchedKeywords.push(...matched);
      }
    }

    // Threshold: need at least 2 to beat current
    if (bestScore < 2 || !bestRoute) {
      return { mode: currentAgent, score: 0, reason: "no strong match" };
    }

    return {
      mode: bestRoute.mode,
      score: bestScore,
      reason: `matched: ${matchedKeywords.slice(0, 5).join(", ")}`,
    };
  }

  listRoutes(): AgentRoute[] {
    return [...this.routes];
  }
}

const STOPWORDS = new Set([
  "with",
  "this",
  "that",
  "from",
  "they",
  "have",
  "what",
  "when",
  "where",
  "would",
  "could",
  "should",
  "about",
  "into",
  "your",
  "their",
  "them",
  "than",
  "then",
  "some",
  "more",
  "most",
  "just",
  "like",
  "also",
  "only",
  "over",
  "such",
  "even",
  "very",
  "much",
  "many",
  "well",
  "make",
  "made",
  "take",
  "took",
  "give",
  "gave",
  "find",
  "found",
  "good",
  "best",
  "back",
  "down",
  "after",
  "before",
  "between",
  "while",
  "during",
  "still",
  "again",
  "agent",
  "agents",
]);

export const agentRouter = new AgentRouter();
