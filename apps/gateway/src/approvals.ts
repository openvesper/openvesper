// ============================================================
// 🌒 Approvals — Manual confirmation for sensitive tool calls
// ============================================================
//
// When an agent wants to run a tool with `permission: "mutation"` (send
// messages, delete files, etc.), the gateway can require user approval
// before execution.
//
// Flow:
//   1. Agent calls tool
//   2. Gateway checks: is auto-approve allowed? (config rules)
//   3. If not, pending approval queue gets entry
//   4. Channel notifies user (Telegram: "yes/no" buttons, CLI prompt)
//   5. User decides → tool runs or is rejected
//
// PRIVACY: All approval state local. ~/.openvesper/approvals.json (0600).

import fs from "fs/promises";
import path from "path";
import os from "os";
import { EventEmitter } from "events";

export type ApprovalDecision = "allow" | "deny" | "allow-and-remember";

export interface ApprovalRequest {
  id: string;
  sessionKey: string;
  agent: string;
  channel: string;
  toolName: string;
  toolInput: unknown;
  permission: string;
  reason?: string;
  createdAt: number;
  /** Auto-deny after timeout (default 5 min) */
  expiresAt: number;
}

export interface ApprovalDecisionRecord {
  requestId: string;
  decision: ApprovalDecision;
  decidedAt: number;
  decidedBy?: string;
}

export interface ApprovalRule {
  /** Wildcard match against tool name: "*" or "telegram_*" */
  toolPattern: string;
  /** Agent name or "*" */
  agent: string;
  /** "auto-allow", "auto-deny", "prompt" */
  policy: "auto-allow" | "auto-deny" | "prompt";
  /** Optional reason for record */
  reason?: string;
}

const APPROVALS_FILE = path.join(os.homedir(), ".openvesper", "approvals.json");
const RULES_FILE = path.join(os.homedir(), ".openvesper", "approval-rules.json");

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export class ApprovalManager extends EventEmitter {
  private pending = new Map<string, ApprovalRequest>();
  private decisions: ApprovalDecisionRecord[] = [];
  private rules: ApprovalRule[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(RULES_FILE, "utf-8");
      this.rules = JSON.parse(raw);
    } catch {
      this.rules = [];
    }
    try {
      const raw = await fs.readFile(APPROVALS_FILE, "utf-8");
      this.decisions = JSON.parse(raw);
    } catch {
      this.decisions = [];
    }
    this.loaded = true;
  }

  /**
   * Request approval for a tool call. Returns:
   *   - true if auto-approved
   *   - false if auto-denied
   *   - Promise<boolean> that resolves when user decides
   */
  async request(input: Omit<ApprovalRequest, "id" | "createdAt" | "expiresAt">): Promise<boolean> {
    await this.load();

    // Check rules
    const matched = this.matchRule(input.toolName, input.agent);
    if (matched?.policy === "auto-allow") {
      console.log(`[approval] auto-allow ${input.toolName} (rule: ${matched.reason || "matched"})`);
      return true;
    }
    if (matched?.policy === "auto-deny") {
      console.log(`[approval] auto-deny ${input.toolName} (rule: ${matched.reason || "matched"})`);
      return false;
    }

    // Need user prompt
    const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const request: ApprovalRequest = {
      ...input,
      id,
      createdAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_TIMEOUT_MS,
    };
    this.pending.set(id, request);
    this.emit("requested", request);

    // Wait for decision or timeout
    return new Promise<boolean>((resolve) => {
      const onDecide = (record: ApprovalDecisionRecord) => {
        if (record.requestId !== id) return;
        cleanup();
        resolve(record.decision === "allow" || record.decision === "allow-and-remember");
      };
      const timer = setTimeout(() => {
        cleanup();
        this.pending.delete(id);
        this.emit("timeout", request);
        console.warn(`[approval] timeout on ${input.toolName} — denying`);
        resolve(false);
      }, DEFAULT_TIMEOUT_MS);
      const cleanup = () => {
        clearTimeout(timer);
        this.off("decided", onDecide);
      };
      this.on("decided", onDecide);
    });
  }

  async decide(requestId: string, decision: ApprovalDecision, decidedBy?: string): Promise<boolean> {
    await this.load();
    const req = this.pending.get(requestId);
    if (!req) return false;

    this.pending.delete(requestId);
    const record: ApprovalDecisionRecord = {
      requestId,
      decision,
      decidedAt: Date.now(),
      decidedBy,
    };
    this.decisions.push(record);

    // "allow-and-remember" → add auto-allow rule
    if (decision === "allow-and-remember") {
      this.rules.push({
        toolPattern: req.toolName,
        agent: req.agent,
        policy: "auto-allow",
        reason: `user approved permanently on ${new Date().toISOString()}`,
      });
      await fs.writeFile(RULES_FILE, JSON.stringify(this.rules, null, 2), { mode: 0o600 });
    }

    await fs.writeFile(APPROVALS_FILE, JSON.stringify(this.decisions.slice(-1000), null, 2), { mode: 0o600 });
    this.emit("decided", record);
    return true;
  }

  listPending(): ApprovalRequest[] {
    const now = Date.now();
    return Array.from(this.pending.values()).filter((r) => r.expiresAt > now);
  }

  async listRules(): Promise<ApprovalRule[]> {
    await this.load();
    return [...this.rules];
  }

  async addRule(rule: ApprovalRule): Promise<void> {
    await this.load();
    this.rules.push(rule);
    await fs.mkdir(path.dirname(RULES_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(RULES_FILE, JSON.stringify(this.rules, null, 2), { mode: 0o600 });
  }

  async removeRule(index: number): Promise<boolean> {
    await this.load();
    if (index < 0 || index >= this.rules.length) return false;
    this.rules.splice(index, 1);
    await fs.writeFile(RULES_FILE, JSON.stringify(this.rules, null, 2), { mode: 0o600 });
    return true;
  }

  private matchRule(toolName: string, agent: string): ApprovalRule | null {
    for (const rule of this.rules) {
      if (rule.agent !== "*" && rule.agent !== agent) continue;
      if (rule.toolPattern === "*" || rule.toolPattern === toolName) return rule;
      if (rule.toolPattern.endsWith("*")) {
        const prefix = rule.toolPattern.slice(0, -1);
        if (toolName.startsWith(prefix)) return rule;
      }
    }
    return null;
  }
}

export const approvals = new ApprovalManager();
