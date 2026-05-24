// ============================================================
// 🌒 DM Pairing Store
// ============================================================
//
// When OpenVesper exposes the gateway to channels with untrusted senders
// (Telegram, Discord DMs, WhatsApp, etc.), incoming messages from unknown
// identities are NOT processed automatically. Instead:
//
//   1. Sender gets a short pairing code (4-6 digits)
//   2. Code + sender identity are stored as "pending"
//   3. User approves via `vesper pairing approve <channel> <code>`
//   4. Future messages from that identity flow normally (allowlist)
//
// Three states per identity:
//   - "unknown"   — never seen, will get a code on first contact
//   - "pending"   — pairing code issued, awaiting user approval
//   - "approved"  — allowlisted, messages flow normally
//   - "denied"    — explicitly rejected, messages dropped silently
//
// Channel-level policy controls behavior:
//   - "pairing" (default): unknown senders get code + pending state
//   - "open":              all senders allowed (NOT recommended)
//   - "closed":            only pre-approved allowlist, no pairing flow
//
// PRIVACY: All pairing data lives at ~/.openvesper/pairings.json (mode 0600).
// No remote endpoint, no telemetry.
// ============================================================

import fs from "fs/promises";
import path from "path";
import os from "os";

const PAIRINGS_FILE = path.join(os.homedir(), ".openvesper", "pairings.json");

export type PairingPolicy = "pairing" | "open" | "closed";
export type PairingState = "unknown" | "pending" | "approved" | "denied";

export interface PairingEntry {
  /** channel:identity composite key, e.g. "telegram:12345" */
  key: string;
  channel: string;
  identity: string;
  state: PairingState;
  /** Active pairing code (only set when state === "pending") */
  code?: string;
  /** Optional display name (e.g. Telegram username) */
  displayName?: string;
  createdAt: number;
  updatedAt: number;
  /** Code expiry time in ms (24h default) */
  expiresAt?: number;
}

function generateCode(): string {
  // 6-digit numeric code — easy to read aloud / paste
  return String(Math.floor(100000 + Math.random() * 900000));
}

const DEFAULT_CODE_EXPIRY_MS = 24 * 60 * 60 * 1000;

export class PairingStore {
  private entries = new Map<string, PairingEntry>();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = JSON.parse(await fs.readFile(PAIRINGS_FILE, "utf-8"));
      if (Array.isArray(data)) {
        for (const e of data) this.entries.set(e.key, e);
      }
    } catch {
      // No file yet, fresh state
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(PAIRINGS_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(
      PAIRINGS_FILE,
      JSON.stringify([...this.entries.values()], null, 2),
      { mode: 0o600 }
    );
  }

  private makeKey(channel: string, identity: string): string {
    return `${channel}:${identity}`;
  }

  /**
   * Check the current state of a sender. Returns the entry (creating an
   * empty "unknown" view if none exists).
   */
  async lookup(channel: string, identity: string): Promise<PairingEntry> {
    await this.load();
    const key = this.makeKey(channel, identity);
    const existing = this.entries.get(key);
    if (existing) {
      // Check expiry on pending codes
      if (
        existing.state === "pending" &&
        existing.expiresAt &&
        Date.now() > existing.expiresAt
      ) {
        existing.state = "unknown";
        existing.code = undefined;
        existing.expiresAt = undefined;
        existing.updatedAt = Date.now();
        await this.save();
      }
      return existing;
    }
    return {
      key,
      channel,
      identity,
      state: "unknown",
      createdAt: 0,
      updatedAt: 0,
    };
  }

  /**
   * Issue a new pairing code for an unknown sender. Idempotent if a
   * pending code already exists.
   */
  async issueCode(
    channel: string,
    identity: string,
    displayName?: string
  ): Promise<{ entry: PairingEntry; isNew: boolean }> {
    await this.load();
    const key = this.makeKey(channel, identity);
    const existing = this.entries.get(key);

    if (existing && existing.state === "pending" && existing.code) {
      // Still valid? Return same code.
      if (!existing.expiresAt || Date.now() < existing.expiresAt) {
        return { entry: existing, isNew: false };
      }
    }

    if (existing && existing.state === "approved") {
      // Already approved — no code needed
      return { entry: existing, isNew: false };
    }

    if (existing && existing.state === "denied") {
      // Denied sender — don't reissue
      return { entry: existing, isNew: false };
    }

    const now = Date.now();
    const entry: PairingEntry = {
      key,
      channel,
      identity,
      state: "pending",
      code: generateCode(),
      displayName: displayName || existing?.displayName,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      expiresAt: now + DEFAULT_CODE_EXPIRY_MS,
    };
    this.entries.set(key, entry);
    await this.save();
    return { entry, isNew: true };
  }

  /**
   * Approve a pending sender by code. Returns the entry on success, or null
   * if the code is not found, expired, or already used.
   */
  async approveByCode(channel: string, code: string): Promise<PairingEntry | null> {
    await this.load();
    for (const entry of this.entries.values()) {
      if (entry.channel !== channel) continue;
      if (entry.state !== "pending") continue;
      if (entry.code !== code) continue;
      if (entry.expiresAt && Date.now() > entry.expiresAt) continue;

      entry.state = "approved";
      entry.code = undefined;
      entry.expiresAt = undefined;
      entry.updatedAt = Date.now();
      await this.save();
      return entry;
    }
    return null;
  }

  /** Explicit approve by identity (no code lookup) */
  async approve(channel: string, identity: string): Promise<PairingEntry> {
    await this.load();
    const key = this.makeKey(channel, identity);
    const now = Date.now();
    const existing = this.entries.get(key);
    const entry: PairingEntry = {
      key,
      channel,
      identity,
      state: "approved",
      displayName: existing?.displayName,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.entries.set(key, entry);
    await this.save();
    return entry;
  }

  /** Reject a sender permanently. */
  async deny(channel: string, identity: string): Promise<PairingEntry> {
    await this.load();
    const key = this.makeKey(channel, identity);
    const now = Date.now();
    const existing = this.entries.get(key);
    const entry: PairingEntry = {
      key,
      channel,
      identity,
      state: "denied",
      displayName: existing?.displayName,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.entries.set(key, entry);
    await this.save();
    return entry;
  }

  /** Remove an entry entirely — caller can re-pair from scratch. */
  async revoke(channel: string, identity: string): Promise<boolean> {
    await this.load();
    const key = this.makeKey(channel, identity);
    const had = this.entries.has(key);
    this.entries.delete(key);
    await this.save();
    return had;
  }

  /** List all pending pairings (across channels). */
  async listPending(channel?: string): Promise<PairingEntry[]> {
    await this.load();
    const out: PairingEntry[] = [];
    for (const e of this.entries.values()) {
      if (e.state !== "pending") continue;
      if (channel && e.channel !== channel) continue;
      if (e.expiresAt && Date.now() > e.expiresAt) continue;
      out.push(e);
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** List all approved senders. */
  async listApproved(channel?: string): Promise<PairingEntry[]> {
    await this.load();
    const out: PairingEntry[] = [];
    for (const e of this.entries.values()) {
      if (e.state !== "approved") continue;
      if (channel && e.channel !== channel) continue;
      out.push(e);
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** List all entries (any state). */
  async listAll(): Promise<PairingEntry[]> {
    await this.load();
    return [...this.entries.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

// ── Gate function — what channels call before processing a message ──

/**
 * Given a policy and the current pairing state, decide what to do with
 * an incoming message.
 *
 * Returns:
 *   - `{ action: "process" }` — message proceeds to the agent
 *   - `{ action: "reply-with-code", code }` — channel should reply with the code
 *   - `{ action: "drop" }` — silently discard (denied)
 *   - `{ action: "reject" }` — closed channel, unknown sender — politely reject
 */
export type GateDecision =
  | { action: "process" }
  | { action: "reply-with-code"; code: string; firstTime: boolean }
  | { action: "drop" }
  | { action: "reject" };

export async function decideGate(
  store: PairingStore,
  channel: string,
  identity: string,
  policy: PairingPolicy,
  displayName?: string
): Promise<GateDecision> {
  if (policy === "open") {
    return { action: "process" };
  }

  const entry = await store.lookup(channel, identity);

  if (entry.state === "approved") {
    return { action: "process" };
  }
  if (entry.state === "denied") {
    return { action: "drop" };
  }

  // unknown or pending
  if (policy === "closed") {
    return { action: "reject" };
  }

  // policy === "pairing"
  const { entry: issued, isNew } = await store.issueCode(channel, identity, displayName);
  return {
    action: "reply-with-code",
    code: issued.code!,
    firstTime: isNew,
  };
}

// Singleton — used by gateway
export const pairingStore = new PairingStore();
