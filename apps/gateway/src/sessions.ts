// ============================================================
// 🌒 SessionStore — Shared state across channels
// ============================================================
//
// In OpenClaw style, a session is keyed by user identity, not by channel.
// The same conversation can be continued from Telegram, then CLI, then
// VSCode — they all hit the same session if the user resolves to the
// same sessionKey.
//
// Persistence: file-backed JSON at ~/.openvesper/workspace/sessions/
// Memory cache: LRU, max 100 active sessions

import fs from "fs/promises";
import path from "path";
import os from "os";

export interface SessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  channel?: string;  // telegram, slack, cli, web, vscode
}

export interface Session {
  id: string;
  sessionKey: string;  // user identity (phone, chat_id, cli_user)
  agent: string;       // current active agent
  messages: SessionMessage[];
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

const SESSION_DIR = path.join(os.homedir(), ".openvesper", "workspace", "sessions");
const MAX_CACHE = 100;
const MAX_MESSAGES = 200;  // per session

class SessionStore {
  private cache = new Map<string, Session>();

  async ensureDir(): Promise<void> {
    await fs.mkdir(SESSION_DIR, { recursive: true, mode: 0o700 });
  }

  /** Get session by key, creating if doesn't exist */
  async getOrCreate(sessionKey: string, defaultAgent = "auto"): Promise<Session> {
    // Hash-safe filename
    const safeKey = sessionKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cached = this.cache.get(safeKey);
    if (cached) return cached;

    // Try disk
    const filePath = path.join(SESSION_DIR, `${safeKey}.json`);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const session = JSON.parse(raw) as Session;
      this.cache.set(safeKey, session);
      return session;
    } catch {
      // Doesn't exist — create new
      const session: Session = {
        id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        sessionKey,
        agent: defaultAgent,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {},
      };
      this.cache.set(safeKey, session);
      await this.save(session);
      return session;
    }
  }

  /** Add a message to session and persist */
  async appendMessage(sessionKey: string, msg: SessionMessage): Promise<Session> {
    const session = await this.getOrCreate(sessionKey);
    session.messages.push({ ...msg, timestamp: msg.timestamp || Date.now() });
    // Cap messages to avoid runaway growth
    if (session.messages.length > MAX_MESSAGES) {
      session.messages = session.messages.slice(-MAX_MESSAGES);
    }
    session.updatedAt = Date.now();
    await this.save(session);
    return session;
  }

  /** Set active agent for session */
  async setAgent(sessionKey: string, agent: string): Promise<void> {
    const session = await this.getOrCreate(sessionKey);
    session.agent = agent;
    session.updatedAt = Date.now();
    await this.save(session);
  }

  /** Clear session messages but keep metadata */
  async reset(sessionKey: string): Promise<void> {
    const session = await this.getOrCreate(sessionKey);
    session.messages = [];
    session.updatedAt = Date.now();
    await this.save(session);
  }

  /** Save to disk + cache */
  private async save(session: Session): Promise<void> {
    await this.ensureDir();
    const safeKey = session.sessionKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    this.cache.set(safeKey, session);
    if (this.cache.size > MAX_CACHE) {
      // Evict oldest by updatedAt
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.updatedAt < oldestTime) {
          oldestTime = v.updatedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    const filePath = path.join(SESSION_DIR, `${safeKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), { mode: 0o600 });
  }

  /** List all sessions (from cache, not disk) */
  list(): Session[] {
    return Array.from(this.cache.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Fork a session at the current point. Creates a new session with the same
   * messages so far. The original keeps its messages — both can diverge from here.
   */
  async fork(sessionKey: string, newSessionKey: string): Promise<Session> {
    const parent = await this.getOrCreate(sessionKey);
    const safeKey = newSessionKey.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Check if target already exists
    const existing = this.cache.get(safeKey);
    if (existing) throw new Error(`Target session already exists: ${newSessionKey}`);

    const fork: Session = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionKey: newSessionKey,
      agent: parent.agent,
      messages: [...parent.messages],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        ...parent.metadata,
        forkedFrom: sessionKey,
        forkedAt: Date.now(),
      },
    };

    await this.save(fork);
    return fork;
  }

  /**
   * Branch at a specific message index. Creates a new session with messages
   * up to and including `messageIndex` (0-based).
   */
  async branchAt(sessionKey: string, newSessionKey: string, messageIndex: number): Promise<Session> {
    const parent = await this.getOrCreate(sessionKey);
    if (messageIndex < 0 || messageIndex >= parent.messages.length) {
      throw new Error(`Invalid messageIndex: ${messageIndex}`);
    }

    const safeKey = newSessionKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    const existing = this.cache.get(safeKey);
    if (existing) throw new Error(`Target session already exists: ${newSessionKey}`);

    const branch: Session = {
      id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionKey: newSessionKey,
      agent: parent.agent,
      messages: parent.messages.slice(0, messageIndex + 1),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        ...parent.metadata,
        branchedFrom: sessionKey,
        branchedAt: Date.now(),
        branchedAtMessage: messageIndex,
      },
    };

    await this.save(branch);
    return branch;
  }
}

export const sessionStore = new SessionStore();
