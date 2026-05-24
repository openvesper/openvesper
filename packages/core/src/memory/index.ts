// ============================================================
// 🌒 @openvesper/core — Memory System
// ============================================================
// PRIVACY POLICY:
// - Memory is OPT-IN. Default `enabled: false`. The caller must
//   explicitly set `enabled: true` to enable persistence.
// - When enabled, data is stored EXCLUSIVELY on the user's local
//   disk at the path the caller provides. Nothing is ever sent to
//   OpenVesper servers, telemetry, or any third party.
// - Prompts and responses are stored TRUNCATED to 500 chars each.
//   This is for context retrieval only, not full transcripts.
// - The caller is responsible for choosing where to store the file.
//   By convention we recommend `~/.openvesper/workspace/memory.json`
//   with file permissions 0600 on POSIX systems.
// - The user can clear all memory at any time via `memory.clear()`
//   or `vesper memory compact` from the CLI.
// ============================================================

import * as fs from "fs";
import * as path from "path";
import { MemoryItem } from "../types";

export interface MemoryOptions {
  /**
   * Enable memory persistence. **Defaults to false.**
   * When false, memory operates in-memory only and is discarded
   * when the process exits. Set to true ONLY if the user has
   * explicitly opted in to local persistent memory.
   */
  enabled?: boolean;

  /**
   * Absolute path to the memory file. Required if enabled=true.
   * The directory must be writable. Recommended:
   * ~/.openvesper/workspace/memory.json with chmod 0600.
   */
  file?: string;

  /**
   * Max items retained. Older items are evicted FIFO.
   * Defaults to 100 (small, conservative).
   */
  maxItems?: number;
}

export class MemoryManager {
  private items: MemoryItem[] = [];
  private filePath: string;
  private maxItems: number;
  private enabled: boolean;

  constructor(options: MemoryOptions = {}) {
    // PRIVACY: enabled defaults to FALSE. Memory only persists if
    // the caller explicitly opts in. This is intentional — we never
    // assume the user wants their prompts persisted.
    this.enabled = options.enabled ?? false;
    this.filePath = options.file || "";
    this.maxItems = options.maxItems || 100;

    if (this.enabled && !this.filePath) {
      // Misconfiguration: enabled without a path. Disable to be safe.
      this.enabled = false;
      // eslint-disable-next-line no-console
      console.warn(
        "[memory] enabled=true but no file path provided — memory disabled. " +
          "Pass options.file to enable persistence."
      );
      return;
    }

    if (this.enabled) {
      this.load();
    }
  }

  private load(): void {
    if (!this.enabled || !this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.items = parsed;
      } else {
        // Corrupted file — start fresh
        this.items = [];
      }
    } catch {
      this.items = [];
    }
  }

  private save(): void {
    if (!this.enabled || !this.filePath) return;
    try {
      const dir = path.dirname(this.filePath);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.items, null, 2));
      // Lock down file permissions on POSIX (best-effort).
      // This prevents other local users from reading the memory file.
      if (process.platform !== "win32") {
        try {
          fs.chmodSync(this.filePath, 0o600);
        } catch {
          /* permissions may not be settable on some filesystems */
        }
      }
    } catch {
      /* fail silently — never crash the runtime over a memory save */
    }
  }

  add(
    type: string,
    prompt: string,
    response: string,
    tags: string[] = [],
    toolsUsed: string[] = []
  ): void {
    if (!this.enabled) return;
    const item: MemoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      type,
      // Truncate to 500 chars. We're storing summaries, not full transcripts.
      prompt: prompt.slice(0, 500),
      response: response.slice(0, 500),
      tags,
      toolsUsed,
    };
    this.items.unshift(item);
    if (this.items.length > this.maxItems) {
      this.items = this.items.slice(0, this.maxItems);
    }
    this.save();
  }

  search(query: string, limit = 5): MemoryItem[] {
    if (!this.enabled) return [];
    const q = query.toLowerCase();
    return this.items
      .filter(
        (i) =>
          i.prompt.toLowerCase().includes(q) ||
          i.response.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, limit);
  }

  buildContext(query: string): string {
    if (!this.enabled || this.items.length === 0) return "";
    const relevant = this.search(query, 3);
    if (!relevant.length) return "";
    const context = relevant
      .map(
        (i) =>
          `[${i.type} | ${new Date(i.timestamp).toISOString().split("T")[0]}] ${
            i.prompt
          } → ${i.response.slice(0, 150)}`
      )
      .join("\n");
    return `\n\n<memory>Previous related context:\n${context}\n</memory>`;
  }

  /**
   * Permanently delete all memory items, both in-memory and on disk.
   * Cannot be undone.
   */
  clear(): void {
    this.items = [];
    if (this.enabled && this.filePath && fs.existsSync(this.filePath)) {
      try {
        fs.unlinkSync(this.filePath);
      } catch {
        // Fall back to overwriting with empty array
        this.save();
      }
    }
  }

  getStats() {
    const byType: Record<string, number> = {};
    for (const i of this.items) byType[i.type] = (byType[i.type] || 0) + 1;
    return {
      total: this.items.length,
      byType,
      maxItems: this.maxItems,
      enabled: this.enabled,
      // Don't leak the actual path — just whether persistence is configured
      persisted: this.enabled && !!this.filePath,
    };
  }

  getAll(): MemoryItem[] {
    if (!this.enabled) return [];
    return [...this.items];
  }
}
