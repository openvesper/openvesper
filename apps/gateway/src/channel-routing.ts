// ============================================================
// 🌒 Channel Routing + Access Groups
// ============================================================
//
// Channel routing: "messages from Telegram chat_id X → defi-strategist"
// Access groups:   "Only these identities can talk to bags-hunter"
//
// PRIVACY: All routes/access rules stored locally:
//   ~/.openvesper/channel-routes.json
//   ~/.openvesper/access.json
//
// File mode 0600. Never transmitted off your machine.

import fs from "fs/promises";
import path from "path";
import os from "os";

const ROUTES_FILE = path.join(os.homedir(), ".openvesper", "channel-routes.json");
const ACCESS_FILE = path.join(os.homedir(), ".openvesper", "access.json");

// ── Channel Routes ──────────────────────────────────────────────────

export interface ChannelRoute {
  /** Pattern to match against `${channel}:${identity}` */
  pattern: string;
  /** Which agent to route this match to */
  agent: string;
  /** Optional priority — higher wins on multi-match */
  priority?: number;
  /** Human label for this rule */
  label?: string;
}

export class ChannelRouter {
  private routes: ChannelRoute[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      this.routes = JSON.parse(await fs.readFile(ROUTES_FILE, "utf-8"));
    } catch {
      this.routes = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(ROUTES_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(ROUTES_FILE, JSON.stringify(this.routes, null, 2), { mode: 0o600 });
  }

  async add(route: ChannelRoute): Promise<void> {
    await this.load();
    this.routes.push(route);
    await this.save();
  }

  async remove(index: number): Promise<boolean> {
    await this.load();
    if (index < 0 || index >= this.routes.length) return false;
    this.routes.splice(index, 1);
    await this.save();
    return true;
  }

  async list(): Promise<ChannelRoute[]> {
    await this.load();
    return [...this.routes];
  }

  /**
   * Find best matching agent for an incoming message identity.
   * Returns null if no route matches.
   */
  async resolve(channel: string, identity: string): Promise<string | null> {
    await this.load();
    const target = `${channel}:${identity}`;

    const matches: ChannelRoute[] = [];
    for (const r of this.routes) {
      if (matchPattern(r.pattern, target)) matches.push(r);
    }

    if (matches.length === 0) return null;
    // Highest priority wins
    matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return matches[0].agent;
  }
}

// ── Access Groups ───────────────────────────────────────────────────

export interface AccessRule {
  /** Agent or "*" */
  agent: string;
  /** Allow list (channel:identity patterns). If empty, allow all by default. */
  allow?: string[];
  /** Deny list — takes precedence over allow */
  deny?: string[];
  label?: string;
}

export class AccessGroups {
  private rules: AccessRule[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      this.rules = JSON.parse(await fs.readFile(ACCESS_FILE, "utf-8"));
    } catch {
      this.rules = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(ACCESS_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(ACCESS_FILE, JSON.stringify(this.rules, null, 2), { mode: 0o600 });
  }

  async add(rule: AccessRule): Promise<void> {
    await this.load();
    this.rules.push(rule);
    await this.save();
  }

  async remove(index: number): Promise<boolean> {
    await this.load();
    if (index < 0 || index >= this.rules.length) return false;
    this.rules.splice(index, 1);
    await this.save();
    return true;
  }

  async list(): Promise<AccessRule[]> {
    await this.load();
    return [...this.rules];
  }

  /**
   * Check whether a given identity is allowed to talk to an agent.
   * Default-allow unless a deny rule matches. If an allow list exists
   * for that agent, identity must match it.
   */
  async check(agent: string, channel: string, identity: string): Promise<{ allowed: boolean; reason: string }> {
    await this.load();
    const target = `${channel}:${identity}`;

    // First check explicit deny
    for (const r of this.rules) {
      if (r.agent !== agent && r.agent !== "*") continue;
      if (r.deny) {
        for (const p of r.deny) {
          if (matchPattern(p, target)) {
            return { allowed: false, reason: `denied by rule "${r.label || p}"` };
          }
        }
      }
    }

    // Check allow lists
    for (const r of this.rules) {
      if (r.agent !== agent && r.agent !== "*") continue;
      if (r.allow && r.allow.length > 0) {
        let ok = false;
        for (const p of r.allow) {
          if (matchPattern(p, target)) {
            ok = true;
            break;
          }
        }
        if (!ok) {
          return { allowed: false, reason: `not in allow list for "${r.label || agent}"` };
        }
      }
    }

    return { allowed: true, reason: "no matching deny / matches allow" };
  }
}

// ── Pattern matcher ──────────────────────────────────────────────────
// Supports * wildcards. "telegram:*" matches "telegram:123".
function matchPattern(pattern: string, target: string): boolean {
  if (pattern === "*") return true;
  if (pattern === target) return true;
  if (!pattern.includes("*")) return false;
  const regex = "^" + pattern.split("*").map(escapeRegex).join(".*") + "$";
  return new RegExp(regex).test(target);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const channelRouter = new ChannelRouter();
export const accessGroups = new AccessGroups();
