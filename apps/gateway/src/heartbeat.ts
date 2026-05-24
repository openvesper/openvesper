// ============================================================
// 🌒 Heartbeat Daemon — Proactive agent loop (OpenClaw-style)
// ============================================================
//
// For each enabled agent (HEARTBEAT.md has `enabled: true`), this daemon
// periodically wakes the agent and asks: "is there anything to do?"
//
// The agent reads its HEARTBEAT.md checklist and either:
//   - takes action (calls tools, sends a message via deliverHook)
//   - returns "HEARTBEAT_OK" — suppressed, never delivered to user
//
// This is what makes OpenClaw feel proactive rather than reactive.

import fs from "fs/promises";
import path from "path";
import { agentLoop } from "./agent-loop.js";

const HEARTBEAT_OK = "HEARTBEAT_OK";

export interface HeartbeatAgent {
  mode: string;
  schedule: string;     // cron expression (informational, real check uses interval)
  intervalMs: number;
  lastRun: number;
  enabled: boolean;
}

export type DeliverHook = (channel: string, sessionKey: string, message: string) => Promise<void>;

/**
 * Parse YAML frontmatter from HEARTBEAT.md
 * (Lightweight, no yaml library needed for this small subset)
 */
function parseFrontmatter(content: string): Record<string, string | boolean> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string | boolean> = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (value === "true") result[m[1]] = true;
      else if (value === "false") result[m[1]] = false;
      else result[m[1]] = value;
    }
  }
  return result;
}

/** Naive cron → ms conversion for common patterns */
function cronToInterval(cron: string): number {
  // "*/5 * * * *" = every 5 min
  const m = cron.match(/^\*\/(\d+)\s+\*/);
  if (m) return parseInt(m[1]) * 60 * 1000;
  // "0 9 * * *" = daily at 9 AM → check hourly
  if (/^0\s+\d+\s+\*\s+\*\s+\*$/.test(cron)) return 60 * 60 * 1000;
  // "0 9 * * MON" = weekly → check daily
  if (/^0\s+\d+\s+\*\s+\*\s+(MON|TUE|WED|THU|FRI|SAT|SUN)$/i.test(cron)) {
    return 24 * 60 * 60 * 1000;
  }
  // Default fallback
  return 60 * 60 * 1000;  // hourly
}

export class HeartbeatDaemon {
  private agents: HeartbeatAgent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private deliverHook?: DeliverHook;
  private agentsDir: string;

  constructor(agentsDir: string, deliverHook?: DeliverHook) {
    this.agentsDir = agentsDir;
    this.deliverHook = deliverHook;
  }

  /** Scan .agents/ directory for HEARTBEAT.md files with enabled: true */
  async loadEnabledAgents(): Promise<void> {
    const entries = await fs.readdir(this.agentsDir, { withFileTypes: true });
    this.agents = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const hbPath = path.join(this.agentsDir, entry.name, "HEARTBEAT.md");
      try {
        const content = await fs.readFile(hbPath, "utf-8");
        const fm = parseFrontmatter(content);
        if (fm.enabled === true) {
          const schedule = (fm.schedule as string) || "0 9 * * *";
          this.agents.push({
            mode: entry.name,
            schedule,
            intervalMs: cronToInterval(schedule),
            lastRun: 0,
            enabled: true,
          });
        }
      } catch {
        // No HEARTBEAT.md or read failed — skip
      }
    }

    console.log(`[heartbeat] Loaded ${this.agents.length} enabled agent(s)`);
  }

  /** Start the heartbeat daemon */
  start(checkIntervalMs = 60 * 1000): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(console.error), checkIntervalMs);
    console.log(`[heartbeat] Daemon started (check every ${checkIntervalMs / 1000}s)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Check each agent — run its heartbeat if interval elapsed */
  private async tick(): Promise<void> {
    const now = Date.now();
    for (const agent of this.agents) {
      if (now - agent.lastRun < agent.intervalMs) continue;
      agent.lastRun = now;
      await this.runHeartbeat(agent);
    }
  }

  /** Execute one heartbeat cycle for an agent */
  private async runHeartbeat(agent: HeartbeatAgent): Promise<void> {
    const sessionKey = `heartbeat:${agent.mode}`;
    try {
      const result = await agentLoop.run({
        sessionKey,
        message: `Heartbeat for ${new Date().toISOString()}. Read your HEARTBEAT.md checklist. If any items need action right now, perform them and respond with the result. If nothing needs doing, respond with exactly: ${HEARTBEAT_OK}`,
        channel: "heartbeat",
        agent: agent.mode,
      });

      // OpenClaw-style suppression
      if (result.reply.trim() === HEARTBEAT_OK) {
        console.log(`[heartbeat] ${agent.mode}: ${HEARTBEAT_OK} (suppressed)`);
        return;
      }

      // Deliver to user via configured channel
      if (this.deliverHook) {
        await this.deliverHook("telegram", sessionKey, result.reply);
        console.log(`[heartbeat] ${agent.mode}: delivered (${result.reply.length} chars)`);
      } else {
        console.log(`[heartbeat] ${agent.mode}: ${result.reply.slice(0, 100)}...`);
      }
    } catch (err) {
      console.error(`[heartbeat] ${agent.mode} failed:`, err);
    }
  }

  status(): { running: boolean; agentCount: number; agents: HeartbeatAgent[] } {
    return {
      running: !!this.timer,
      agentCount: this.agents.length,
      agents: this.agents.map((a) => ({ ...a })),
    };
  }
}
