// ============================================================
// 🌒 Active Memory Engine
// ============================================================
//
// Beyond MEMORY.md as a static file, this engine treats memory as a live
// store of notes. Agents can:
//   - Query memory ("what do I know about user X")
//   - Add notes during conversations
//   - Tag/categorize entries
//   - Expire entries with TTL
//
// PRIVACY: All memory lives at .agents/<mode>/memory/ or
// ~/.openvesper/agents/<mode>/memory/ depending on install location.
// Each entry is a JSON file (mode 0600). Never transmitted off-machine.

import fs from "fs/promises";
import path from "path";
import os from "os";

export interface MemoryEntry {
  id: string;
  agent: string;
  /** Free-text content */
  content: string;
  /** Optional tags */
  tags?: string[];
  /** Optional session this note came from */
  sessionKey?: string;
  /** Optional expiry epoch ms */
  expiresAt?: number;
  /** When written */
  createdAt: number;
  /** Last seen / used */
  lastAccessedAt: number;
}

function userAgentMemoryDir(agent: string): string {
  return path.join(os.homedir(), ".openvesper", "agents", agent, "memory");
}

function bundledAgentMemoryDir(agent: string, cwd: string): string {
  return path.join(cwd, ".agents", agent, "memory");
}

/** Resolve which memory dir to use, preferring user dir if agent installed */
async function resolveMemoryDir(agent: string): Promise<string> {
  const userDir = userAgentMemoryDir(agent);
  try {
    await fs.access(path.join(os.homedir(), ".openvesper", "agents", agent, "SOUL.md"));
    return userDir;
  } catch {
    return bundledAgentMemoryDir(agent, process.cwd());
  }
}

export class MemoryEngine {
  /** Add a new memory entry */
  async write(agent: string, content: string, opts: { tags?: string[]; sessionKey?: string; ttlMs?: number } = {}): Promise<MemoryEntry> {
    const dir = await resolveMemoryDir(agent);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });

    const entry: MemoryEntry = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agent,
      content,
      tags: opts.tags,
      sessionKey: opts.sessionKey,
      expiresAt: opts.ttlMs ? Date.now() + opts.ttlMs : undefined,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    const filePath = path.join(dir, `${entry.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), { mode: 0o600 });
    return entry;
  }

  /** List all entries for an agent */
  async list(agent: string, opts: { tag?: string; sessionKey?: string } = {}): Promise<MemoryEntry[]> {
    const dir = await resolveMemoryDir(agent);
    let files: string[] = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
      return [];
    }

    const entries: MemoryEntry[] = [];
    const now = Date.now();
    for (const file of files) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        const entry: MemoryEntry = JSON.parse(raw);
        if (entry.expiresAt && entry.expiresAt < now) {
          // Expired — delete and skip
          await fs.unlink(path.join(dir, file)).catch(() => {});
          continue;
        }
        if (opts.tag && (!entry.tags || !entry.tags.includes(opts.tag))) continue;
        if (opts.sessionKey && entry.sessionKey !== opts.sessionKey) continue;
        entries.push(entry);
      } catch {
        // skip corrupted entries
      }
    }

    return entries.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Keyword search through memory */
  async search(agent: string, query: string, limit = 10): Promise<MemoryEntry[]> {
    const all = await this.list(agent);
    const lower = query.toLowerCase();
    const matched = all
      .map((entry) => {
        let score = 0;
        if (entry.content.toLowerCase().includes(lower)) score += 10;
        for (const word of lower.split(/\s+/).filter((w) => w.length > 3)) {
          if (entry.content.toLowerCase().includes(word)) score += 1;
        }
        for (const tag of entry.tags || []) {
          if (tag.toLowerCase().includes(lower)) score += 5;
        }
        return { entry, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => {
        // Update last accessed
        r.entry.lastAccessedAt = Date.now();
        return r.entry;
      });

    // Persist last-accessed updates
    for (const entry of matched) {
      const dir = await resolveMemoryDir(agent);
      const filePath = path.join(dir, `${entry.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2), { mode: 0o600 }).catch(() => {});
    }

    return matched;
  }

  async delete(agent: string, id: string): Promise<boolean> {
    const dir = await resolveMemoryDir(agent);
    try {
      await fs.unlink(path.join(dir, `${id}.json`));
      return true;
    } catch {
      return false;
    }
  }

  async clear(agent: string): Promise<number> {
    const all = await this.list(agent);
    let count = 0;
    for (const entry of all) {
      if (await this.delete(agent, entry.id)) count++;
    }
    return count;
  }

  /** Get a relevance-ranked context snippet for the LLM */
  async buildContext(agent: string, recentMessages: { content: string }[], maxEntries = 5): Promise<string> {
    // Combine recent messages into a single query
    const query = recentMessages
      .slice(-3)
      .map((m) => m.content)
      .join(" ");

    const relevant = await this.search(agent, query, maxEntries);
    if (relevant.length === 0) return "";

    return [
      "",
      "## Relevant memory entries",
      "",
      "These are notes from previous interactions you have access to:",
      ...relevant.map((e) => {
        const tags = e.tags && e.tags.length > 0 ? ` [${e.tags.join(", ")}]` : "";
        return `- ${e.content}${tags}`;
      }),
      "",
    ].join("\n");
  }
}

export const memoryEngine = new MemoryEngine();
