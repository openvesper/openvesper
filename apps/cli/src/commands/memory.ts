// ============================================================
// 🌒 vesper memory <write|list|search|delete|clear>
// ============================================================
//
// Manage active memory entries for an agent.
//
//   vesper memory write <agent> "<content>" [--tag X --ttl-hours N]
//   vesper memory list <agent> [--tag X]
//   vesper memory search <agent> "<query>"
//   vesper memory delete <agent> <id>
//   vesper memory clear <agent>
//
// PRIVACY: All memory entries stored in .agents/<agent>/memory/<id>.json
// (user-installed) or ~/.openvesper/agents/<agent>/memory/. Mode 0600.

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};
function c(s: string, k: keyof typeof COLOR) {
  return `${COLOR[k]}${s}${COLOR.reset}`;
}

interface MemoryEntry {
  id: string;
  agent: string;
  content: string;
  tags?: string[];
  sessionKey?: string;
  expiresAt?: number;
  createdAt: number;
  lastAccessedAt: number;
}

function resolveDir(agent: string): string {
  const userDir = path.join(os.homedir(), ".openvesper", "agents", agent, "memory");
  const userAgentSoul = path.join(os.homedir(), ".openvesper", "agents", agent, "SOUL.md");
  if (fs.existsSync(userAgentSoul)) return userDir;
  return path.join(process.cwd(), ".agents", agent, "memory");
}

function ensureDir(agent: string): string {
  const dir = resolveDir(agent);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

function loadAll(agent: string): MemoryEntry[] {
  const dir = resolveDir(agent);
  if (!fs.existsSync(dir)) return [];
  const entries: MemoryEntry[] = [];
  const now = Date.now();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const e: MemoryEntry = JSON.parse(raw);
      if (e.expiresAt && e.expiresAt < now) {
        fs.unlinkSync(path.join(dir, file));
        continue;
      }
      entries.push(e);
    } catch {
      // skip
    }
  }
  return entries.sort((a, b) => b.createdAt - a.createdAt);
}

export function memoryWrite(agent: string, content: string, opts: { tags?: string[]; ttlHours?: number }): void {
  const dir = ensureDir(agent);
  const entry: MemoryEntry = {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    agent,
    content,
    tags: opts.tags,
    expiresAt: opts.ttlHours ? Date.now() + opts.ttlHours * 60 * 60 * 1000 : undefined,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
  };
  fs.writeFileSync(path.join(dir, `${entry.id}.json`), JSON.stringify(entry, null, 2), { mode: 0o600 });
  console.log(c(`✓ Wrote memory entry: ${entry.id}`, "green"));
  console.log(`  Agent: ${agent}`);
  if (opts.tags?.length) console.log(`  Tags:  ${opts.tags.join(", ")}`);
  if (entry.expiresAt) console.log(`  TTL:   expires ${new Date(entry.expiresAt).toLocaleString()}`);
}

export function memoryList(agent: string, opts: { tag?: string; json?: boolean } = {}): void {
  let entries = loadAll(agent);
  if (opts.tag) {
    entries = entries.filter((e) => e.tags && e.tags.includes(opts.tag!));
  }

  if (opts.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  console.log("");
  if (entries.length === 0) {
    console.log(c(`○ No memory entries for ${agent}`, "yellow"));
    return;
  }

  console.log(c(`Memory entries for ${agent} (${entries.length}):`, "bold"));
  for (const e of entries) {
    const date = new Date(e.createdAt).toLocaleDateString();
    const tags = e.tags?.length ? ` [${e.tags.join(", ")}]` : "";
    console.log(`  ${c(e.id, "dim")}  ${c(date, "dim")}${c(tags, "cyan")}`);
    console.log(`     ${e.content.slice(0, 120)}${e.content.length > 120 ? "..." : ""}`);
  }
  console.log("");
}

export function memorySearch(agent: string, query: string, limit = 10): void {
  const entries = loadAll(agent);
  const lower = query.toLowerCase();

  const matched = entries
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
    .slice(0, limit);

  console.log("");
  if (matched.length === 0) {
    console.log(c(`○ No matches for "${query}" in ${agent}'s memory`, "yellow"));
    return;
  }

  console.log(c(`Matches for "${query}" in ${agent}'s memory (${matched.length}):`, "bold"));
  for (const { entry, score } of matched) {
    const date = new Date(entry.createdAt).toLocaleDateString();
    console.log(`  ${c(entry.id, "dim")}  ${c(date, "dim")}  ${c(`score=${score}`, "green")}`);
    console.log(`     ${entry.content.slice(0, 150)}${entry.content.length > 150 ? "..." : ""}`);
  }
}

export function memoryDelete(agent: string, id: string): void {
  const dir = resolveDir(agent);
  const filePath = path.join(dir, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(c(`✗ Entry not found: ${id}`, "red"));
    process.exit(1);
  }
  fs.unlinkSync(filePath);
  console.log(c(`✓ Deleted: ${id}`, "green"));
}

export function memoryClear(agent: string): void {
  const dir = resolveDir(agent);
  if (!fs.existsSync(dir)) {
    console.log(c(`○ No memory dir for ${agent}`, "yellow"));
    return;
  }
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".json")) {
      fs.unlinkSync(path.join(dir, file));
      count++;
    }
  }
  console.log(c(`✓ Cleared ${count} memory entries for ${agent}`, "green"));
}
