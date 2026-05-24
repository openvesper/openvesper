// ============================================================
// 🌒 @openvesper/core — Conversation Persistence
// ============================================================
// PRIVACY POLICY:
// - Conversation persistence is OPT-IN. Default `persist: false`.
//   When persist=false, conversations are kept in memory only and
//   discarded when the process exits.
// - When persist=true, conversations are saved EXCLUSIVELY to the
//   user's local disk under `<workspacePath>/conversations/<id>.json`.
//   Nothing is ever transmitted to OpenVesper servers or third parties.
// - Files are written with mode 0600 on POSIX (owner-only read/write).
// - The user can delete conversations at any time via .delete(id) or
//   by removing the conversations/ directory.
// ============================================================

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { LLMMessage } from "../types";

export interface Conversation {
  id: string;
  agent: string;
  llmProvider: string;
  llmModel: string;
  createdAt: number;
  updatedAt: number;
  messages: LLMMessage[];
  metadata: {
    totalTokens?: number;
    title?: string;
    pinned?: boolean;
  };
}

export interface ConversationManagerOptions {
  /**
   * Enable disk persistence. **Defaults to false.**
   * When false, conversations live in memory only.
   */
  persist?: boolean;

  /**
   * Workspace path. Required if persist=true.
   * Conversations are saved at <workspacePath>/conversations/<id>.json.
   */
  workspacePath?: string;
}

export class ConversationManager {
  private dir: string;
  private active: Map<string, Conversation> = new Map();
  private persist: boolean;

  constructor(workspacePathOrOptions: string | ConversationManagerOptions) {
    // Backward compat: if called with a string, treat as legacy mode
    // (workspace path, but with persist=false by default — opt-in)
    if (typeof workspacePathOrOptions === "string") {
      this.dir = path.join(workspacePathOrOptions, "conversations");
      this.persist = false; // PRIVACY: default opt-in
    } else {
      const opts = workspacePathOrOptions;
      this.persist = opts.persist ?? false;
      this.dir = opts.workspacePath
        ? path.join(opts.workspacePath, "conversations")
        : "";

      if (this.persist && !this.dir) {
        // Misconfiguration: disable persistence rather than write to cwd
        this.persist = false;
        // eslint-disable-next-line no-console
        console.warn(
          "[conversations] persist=true but no workspacePath — persistence disabled."
        );
      }
    }

    if (this.persist && this.dir && !fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Create a new conversation.
   */
  create(agent: string, llmProvider: string, llmModel: string): Conversation {
    const id = crypto.randomBytes(8).toString("hex");
    const conv: Conversation = {
      id,
      agent,
      llmProvider,
      llmModel,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      metadata: {},
    };
    this.active.set(id, conv);
    this.save(conv);
    return conv;
  }

  /**
   * Load a conversation by ID.
   */
  load(id: string): Conversation | null {
    if (this.active.has(id)) return this.active.get(id)!;
    if (!this.persist || !this.dir) return null;
    const filePath = path.join(this.dir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const conv = JSON.parse(fs.readFileSync(filePath, "utf8")) as Conversation;
      this.active.set(id, conv);
      return conv;
    } catch {
      return null;
    }
  }

  /**
   * Append a message to a conversation.
   */
  addMessage(id: string, message: LLMMessage): void {
    const conv = this.active.get(id);
    if (!conv) return;
    conv.messages.push(message);
    conv.updatedAt = Date.now();
    if (!conv.metadata.title && message.role === "user") {
      const text = typeof message.content === "string" ? message.content : "";
      conv.metadata.title = text.slice(0, 50);
    }
    this.save(conv);
  }

  /**
   * Save conversation to disk (only if persistence is enabled).
   */
  save(conv: Conversation): void {
    if (!this.persist || !this.dir) return;
    try {
      const filePath = path.join(this.dir, `${conv.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(conv, null, 2));
      // Lock down file permissions on POSIX
      if (process.platform !== "win32") {
        try {
          fs.chmodSync(filePath, 0o600);
        } catch {
          /* best effort */
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to save conversation:", e);
    }
  }

  /**
   * List all conversations (metadata only).
   */
  list(): Array<{ id: string; agent: string; title: string; updatedAt: number; messageCount: number }> {
    // In-memory conversations first
    const inMemory = Array.from(this.active.values()).map((conv) => ({
      id: conv.id,
      agent: conv.agent,
      title: conv.metadata?.title || "Untitled",
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
    }));

    // Then disk-persisted ones (if enabled)
    if (!this.persist || !this.dir || !fs.existsSync(this.dir)) {
      return inMemory.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    const files = fs.readdirSync(this.dir).filter((f) => f.endsWith(".json"));
    const onDisk = files
      .map((f) => {
        try {
          const conv = JSON.parse(fs.readFileSync(path.join(this.dir, f), "utf8")) as Conversation;
          return {
            id: conv.id,
            agent: conv.agent,
            title: conv.metadata?.title || "Untitled",
            updatedAt: conv.updatedAt,
            messageCount: conv.messages.length,
          };
        } catch {
          return null;
        }
      })
      .filter((c) => c !== null) as Array<{
        id: string;
        agent: string;
        title: string;
        updatedAt: number;
        messageCount: number;
      }>;

    // Merge, dedupe by id (in-memory wins)
    const seen = new Set(inMemory.map((c) => c.id));
    const merged = [...inMemory, ...onDisk.filter((c) => !seen.has(c.id))];
    return merged.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Permanently delete a conversation, both from memory and disk.
   */
  delete(id: string): boolean {
    this.active.delete(id);
    if (!this.persist || !this.dir) return true;
    const filePath = path.join(this.dir, `${id}.json`);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  /**
   * Pin/unpin conversation.
   */
  setPinned(id: string, pinned: boolean): boolean {
    const conv = this.load(id);
    if (!conv) return false;
    conv.metadata.pinned = pinned;
    this.save(conv);
    return true;
  }

  /**
   * Search conversations by content.
   */
  search(query: string): Array<{ id: string; title: string; preview: string; updatedAt: number }> {
    const list = this.list();
    const q = query.toLowerCase();
    return list
      .map((meta) => {
        const conv = this.load(meta.id);
        if (!conv) return null;
        const allText = conv.messages
          .map((m) => (typeof m.content === "string" ? m.content : ""))
          .join("\n")
          .toLowerCase();
        if (!allText.includes(q)) return null;
        const idx = allText.indexOf(q);
        const preview = allText.slice(Math.max(0, idx - 30), idx + 100);
        return { id: conv.id, title: meta.title, preview, updatedAt: meta.updatedAt };
      })
      .filter((c) => c !== null) as Array<{
        id: string;
        title: string;
        preview: string;
        updatedAt: number;
      }>;
  }

  /**
   * Get whether persistence is enabled.
   */
  isPersistent(): boolean {
    return this.persist;
  }
}
