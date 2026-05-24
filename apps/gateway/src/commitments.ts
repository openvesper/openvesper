// ============================================================
// 🌒 Commitments — Track what the agent promised
// ============================================================
//
// When an agent says "I'll get back to you in an hour" or "I'll check
// this tomorrow", that's a commitment. OpenClaw tracks them so the agent
// doesn't forget its own promises.
//
// Two kinds:
//   - explicit: user explicitly asked agent to remember something
//                ("remind me about X in 1 hour")
//   - inferred: agent's response contained a promise the system detected
//                ("I'll let you know when..." → inferred commitment)
//
// PRIVACY: Commitments live in ~/.openvesper/commitments.json (mode 0600).

import fs from "fs/promises";
import path from "path";
import os from "os";

export type CommitmentKind = "explicit" | "inferred";
export type CommitmentStatus = "open" | "fulfilled" | "expired" | "cancelled";

export interface Commitment {
  id: string;
  kind: CommitmentKind;
  sessionKey: string;
  agent: string;
  /** What the agent committed to */
  promise: string;
  /** Original message text where commitment was made (for context) */
  originalContext?: string;
  /** When agent promised to act (if specified) */
  dueAt?: number;
  status: CommitmentStatus;
  createdAt: number;
  fulfilledAt?: number;
  /** Optional related task ID if this commitment scheduled a background task */
  linkedTaskId?: string;
}

const COMMITMENTS_FILE = path.join(os.homedir(), ".openvesper", "commitments.json");

/** Patterns that suggest the agent is making a commitment */
const COMMITMENT_PATTERNS = [
  /\bi'?ll\s+(let you know|get back to you|check|remind|follow up|update you|report back)/i,
  /\bi'?ll\s+(send|message|notify|alert|ping) you/i,
  /\bi will (remind|notify|let you know|get back)/i,
  /\bgive me (\d+) (minute|hour|day|week)s? and i'?ll/i,
  /\bcheck back in (\d+) (minute|hour|day)s?/i,
  /\bwhen.+(?:happens|occurs|reaches), i'?ll/i,
];

const TIME_PATTERNS = [
  { regex: /in\s+(\d+)\s+minute/i, mult: 60 * 1000 },
  { regex: /in\s+(\d+)\s+hour/i, mult: 60 * 60 * 1000 },
  { regex: /in\s+(\d+)\s+day/i, mult: 24 * 60 * 60 * 1000 },
  { regex: /tomorrow/i, mult: 24 * 60 * 60 * 1000, fixed: 1 },
  { regex: /next week/i, mult: 7 * 24 * 60 * 60 * 1000, fixed: 1 },
];

export class CommitmentManager {
  private commitments: Commitment[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(COMMITMENTS_FILE, "utf-8");
      this.commitments = JSON.parse(raw);
    } catch {
      this.commitments = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(COMMITMENTS_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(COMMITMENTS_FILE, JSON.stringify(this.commitments, null, 2), { mode: 0o600 });
  }

  async create(input: Omit<Commitment, "id" | "createdAt" | "status">): Promise<Commitment> {
    await this.load();
    const c: Commitment = {
      ...input,
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      status: "open",
    };
    this.commitments.push(c);
    await this.save();
    return c;
  }

  async list(filter?: { sessionKey?: string; agent?: string; status?: CommitmentStatus }): Promise<Commitment[]> {
    await this.load();
    return this.commitments
      .filter((c) => {
        if (filter?.sessionKey && c.sessionKey !== filter.sessionKey) return false;
        if (filter?.agent && c.agent !== filter.agent) return false;
        if (filter?.status && c.status !== filter.status) return false;
        return true;
      })
      .sort((a, b) => (a.dueAt || a.createdAt) - (b.dueAt || b.createdAt));
  }

  async fulfill(id: string): Promise<boolean> {
    await this.load();
    const c = this.commitments.find((x) => x.id === id);
    if (!c) return false;
    c.status = "fulfilled";
    c.fulfilledAt = Date.now();
    await this.save();
    return true;
  }

  async cancel(id: string): Promise<boolean> {
    await this.load();
    const c = this.commitments.find((x) => x.id === id);
    if (!c) return false;
    c.status = "cancelled";
    await this.save();
    return true;
  }

  /**
   * Auto-detect commitments in an agent reply. Returns inferred commitments
   * but does NOT save them — caller decides whether to persist (often you
   * want to wait until the agent has reviewed them).
   */
  inferFromReply(reply: string, sessionKey: string, agent: string): Omit<Commitment, "id" | "createdAt" | "status">[] {
    const inferred: Omit<Commitment, "id" | "createdAt" | "status">[] = [];

    for (const pattern of COMMITMENT_PATTERNS) {
      const match = reply.match(pattern);
      if (!match) continue;

      // Extract surrounding sentence
      const start = reply.lastIndexOf(".", match.index || 0) + 1;
      const end = reply.indexOf(".", (match.index || 0) + match[0].length);
      const sentence = reply
        .slice(start, end > 0 ? end + 1 : undefined)
        .trim();

      // Try to extract a due time
      let dueAt: number | undefined;
      for (const tp of TIME_PATTERNS) {
        const m = sentence.match(tp.regex);
        if (!m) continue;
        const n = tp.fixed ?? parseInt(m[1] || "1", 10);
        dueAt = Date.now() + n * tp.mult;
        break;
      }

      inferred.push({
        kind: "inferred",
        sessionKey,
        agent,
        promise: sentence,
        originalContext: reply.slice(Math.max(0, (match.index || 0) - 50), (match.index || 0) + 100),
        dueAt,
      });
    }

    return inferred;
  }

  /**
   * Get the system prompt augmentation reminding the agent of open commitments.
   * Useful to inject before each LLM call so agents don't forget their promises.
   */
  async getOpenCommitmentsContext(sessionKey: string): Promise<string> {
    const open = await this.list({ sessionKey, status: "open" });
    if (open.length === 0) return "";

    return [
      "",
      "## Your open commitments to this user",
      "",
      "You previously made these promises. Stay aware of them:",
      ...open.map((c) => {
        const due = c.dueAt ? ` (due ${new Date(c.dueAt).toLocaleString()})` : "";
        return `- ${c.promise}${due}`;
      }),
      "",
    ].join("\n");
  }

  status(): { total: number; open: number; fulfilled: number } {
    return {
      total: this.commitments.length,
      open: this.commitments.filter((c) => c.status === "open").length,
      fulfilled: this.commitments.filter((c) => c.status === "fulfilled").length,
    };
  }
}

export const commitments = new CommitmentManager();
