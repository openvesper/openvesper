// ============================================================
// 🌒 Standing Orders — Persistent user-defined rules
// ============================================================
//
// Standing orders are rules the user gives once and agents must follow
// going forward. Examples:
//   - "Always tell me when BTC crosses $100k"
//   - "Never recommend tokens with less than $50k liquidity"
//   - "Every morning at 9 AM, send me a market briefing"
//
// Unlike heartbeats (which run on schedule), standing orders modify how
// agents respond. Unlike tasks (one-shot), standing orders are persistent
// constraints/triggers.
//
// Two kinds:
//   - constraint: injected into system prompt for an agent
//   - trigger:    background watch that fires when condition met
//
// PRIVACY: All standing orders stored in ~/.openvesper/standing-orders.json
// (mode 0600). Never transmitted off your machine.

import fs from "fs/promises";
import path from "path";
import os from "os";

export type StandingOrderKind = "constraint" | "trigger";

export interface StandingOrder {
  id: string;
  kind: StandingOrderKind;
  /** Which agent this applies to (or "*" for all) */
  agent: string;
  /** Plain-text rule the user wrote */
  rule: string;
  /** For triggers: a description of when to fire */
  triggerWhen?: string;
  /** For triggers: what to do when fired (prompt for agent) */
  triggerAction?: string;
  createdAt: number;
  enabled: boolean;
  lastFiredAt?: number;
  fireCount?: number;
}

const ORDERS_FILE = path.join(os.homedir(), ".openvesper", "standing-orders.json");

export class StandingOrderManager {
  private orders: StandingOrder[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(ORDERS_FILE, "utf-8");
      this.orders = JSON.parse(raw);
    } catch {
      this.orders = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(this.orders, null, 2), { mode: 0o600 });
  }

  async create(input: Omit<StandingOrder, "id" | "createdAt" | "enabled" | "fireCount">): Promise<StandingOrder> {
    await this.load();
    const order: StandingOrder = {
      ...input,
      id: `so_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      enabled: true,
      fireCount: 0,
    };
    this.orders.push(order);
    await this.save();
    return order;
  }

  async list(filter?: { agent?: string; kind?: StandingOrderKind; enabled?: boolean }): Promise<StandingOrder[]> {
    await this.load();
    return this.orders.filter((o) => {
      if (filter?.agent && o.agent !== filter.agent && o.agent !== "*") return false;
      if (filter?.kind && o.kind !== filter.kind) return false;
      if (filter?.enabled !== undefined && o.enabled !== filter.enabled) return false;
      return true;
    });
  }

  async remove(id: string): Promise<boolean> {
    await this.load();
    const idx = this.orders.findIndex((o) => o.id === id);
    if (idx < 0) return false;
    this.orders.splice(idx, 1);
    await this.save();
    return true;
  }

  async toggle(id: string): Promise<StandingOrder | null> {
    await this.load();
    const order = this.orders.find((o) => o.id === id);
    if (!order) return null;
    order.enabled = !order.enabled;
    await this.save();
    return order;
  }

  async markFired(id: string): Promise<void> {
    await this.load();
    const order = this.orders.find((o) => o.id === id);
    if (!order) return;
    order.lastFiredAt = Date.now();
    order.fireCount = (order.fireCount || 0) + 1;
    await this.save();
  }

  /**
   * Get the system prompt augmentation for a given agent.
   * Constraint-type orders are concatenated and injected into agent's system prompt.
   */
  async getSystemPromptAugmentation(agent: string): Promise<string> {
    const constraints = await this.list({ agent, kind: "constraint", enabled: true });
    const globalConstraints = await this.list({ agent: "*", kind: "constraint", enabled: true });
    const all = [...constraints, ...globalConstraints];
    if (all.length === 0) return "";

    return [
      "",
      "## Standing orders from the user",
      "",
      "These are persistent rules the user has set. Follow them in every response:",
      ...all.map((o) => `- ${o.rule}`),
      "",
    ].join("\n");
  }

  async getTriggers(agent: string): Promise<StandingOrder[]> {
    const local = await this.list({ agent, kind: "trigger", enabled: true });
    const global = await this.list({ agent: "*", kind: "trigger", enabled: true });
    return [...local, ...global];
  }
}

export const standingOrders = new StandingOrderManager();
