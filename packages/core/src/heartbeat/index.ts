// ============================================================
// 🌒 @openvesper/core — Heartbeat Manager
// ============================================================
// Per-agent autonomous checklist execution.
// Reads HEARTBEAT.md from each agent's workspace.
// Runs the checklist as a scheduled prompt.
// ============================================================

import * as fs from "fs";
import * as path from "path";

export interface HeartbeatItem {
  agent: string;          // agent mode
  checklist: string;      // raw HEARTBEAT.md body
  schedule: string;       // default daily: "0 9 * * *"
  enabled: boolean;
}

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

/**
 * Parse simple YAML frontmatter from HEARTBEAT.md.
 * Supports `schedule`, `enabled` keys.
 */
function parseFrontmatter(content: string): {
  schedule?: string;
  enabled?: boolean;
  body: string;
} {
  const m = content.match(FRONTMATTER_REGEX);
  if (!m) return { body: content };

  const fm = m[1];
  const scheduleMatch = fm.match(/^schedule:\s*["']?(.+?)["']?\s*$/m);
  const enabledMatch = fm.match(/^enabled:\s*(true|false)\s*$/m);

  return {
    schedule: scheduleMatch?.[1]?.trim(),
    enabled: enabledMatch ? enabledMatch[1] === "true" : undefined,
    body: content.replace(FRONTMATTER_REGEX, "").trim(),
  };
}

/**
 * Load a single agent's heartbeat config.
 */
export function loadHeartbeat(agentDir: string): HeartbeatItem | null {
  const heartbeatPath = path.join(agentDir, "HEARTBEAT.md");
  if (!fs.existsSync(heartbeatPath)) return null;

  const agent = path.basename(agentDir);
  const content = fs.readFileSync(heartbeatPath, "utf8");
  const { schedule, enabled, body } = parseFrontmatter(content);

  // Default: disabled. Heartbeats are opt-in via frontmatter or via
  // CLI activation. We never auto-enable scheduled jobs.
  return {
    agent,
    checklist: body,
    schedule: schedule || "0 9 * * *",  // 9 AM daily default
    enabled: enabled ?? false,
  };
}

/**
 * Load all heartbeats from .agents/ directory.
 */
export function loadAllHeartbeats(agentsDir: string): HeartbeatItem[] {
  if (!fs.existsSync(agentsDir)) return [];

  const items: HeartbeatItem[] = [];
  for (const entry of fs.readdirSync(agentsDir)) {
    if (entry.startsWith(".") || entry.startsWith("_")) continue;
    const subDir = path.join(agentsDir, entry);
    if (!fs.statSync(subDir).isDirectory()) continue;
    const item = loadHeartbeat(subDir);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Build the prompt to send to the agent when its heartbeat fires.
 */
export function buildHeartbeatPrompt(item: HeartbeatItem): string {
  return `It's your scheduled heartbeat check-in. Review your HEARTBEAT.md checklist below and act on any items that need attention. Be concise — log what you did, flag anything that needs the user's attention.

---

${item.checklist}

---

Today is ${new Date().toISOString().split("T")[0]}.`;
}
