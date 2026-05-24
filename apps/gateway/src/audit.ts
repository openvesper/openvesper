// ============================================================
// 🌒 Audit Logs — Append-only record of tool/agent activity
// ============================================================
//
// Captures every mutation, every approval decision, every commitment.
// Append-only, rotated daily. Lives in ~/.openvesper/audit/.
//
// What gets logged:
//   - Every tool invocation (read + mutation)
//   - Every approval decision
//   - Every commitment created/fulfilled
//   - Every task created/run/error
//   - Every standing order added/triggered
//
// PRIVACY: Local file only. ~/.openvesper/audit/YYYY-MM-DD.jsonl (mode 0600).
// Never sent anywhere.

import fs from "fs/promises";
import path from "path";
import os from "os";

const AUDIT_DIR = path.join(os.homedir(), ".openvesper", "audit");

export type AuditEvent =
  | { kind: "tool-call"; sessionKey: string; agent: string; tool: string; input?: unknown; permission?: string }
  | { kind: "tool-result"; sessionKey: string; agent: string; tool: string; success: boolean; durationMs?: number }
  | { kind: "approval"; requestId: string; tool: string; agent: string; decision: string; decidedBy?: string }
  | { kind: "commitment-created"; commitmentId: string; sessionKey: string; agent: string; promise: string }
  | { kind: "commitment-fulfilled"; commitmentId: string }
  | { kind: "task-created"; taskId: string; sessionKey: string; agentTask: string }
  | { kind: "task-complete"; taskId: string; success: boolean }
  | { kind: "standing-order"; action: "create" | "remove" | "toggle" | "fired"; orderId: string }
  | { kind: "session-reset"; sessionKey: string; cause?: string }
  | { kind: "compaction"; sessionKey: string; before: number; after: number }
  | { kind: "agent-switch"; sessionKey: string; from: string; to: string }
  | { kind: "error"; source: string; message: string };

export interface AuditEntry {
  timestamp: number;
  isoTime: string;
  event: AuditEvent;
}

class AuditLogger {
  private writeQueue: AuditEntry[] = [];
  private flushing = false;
  private inited = false;

  async init(): Promise<void> {
    if (this.inited) return;
    await fs.mkdir(AUDIT_DIR, { recursive: true, mode: 0o700 });
    this.inited = true;
  }

  /** Record an event. Async fire-and-forget. */
  log(event: AuditEvent): void {
    const entry: AuditEntry = {
      timestamp: Date.now(),
      isoTime: new Date().toISOString(),
      event,
    };
    this.writeQueue.push(entry);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushing) return;
    this.flushing = true;
    setImmediate(() => void this.flush());
  }

  private async flush(): Promise<void> {
    if (!this.inited) await this.init();

    const batch = this.writeQueue.splice(0);
    if (batch.length === 0) {
      this.flushing = false;
      return;
    }

    // Group by day
    const byDay: Record<string, AuditEntry[]> = {};
    for (const entry of batch) {
      const day = entry.isoTime.slice(0, 10);
      byDay[day] = byDay[day] || [];
      byDay[day].push(entry);
    }

    // Write each day's batch
    for (const [day, entries] of Object.entries(byDay)) {
      const filePath = path.join(AUDIT_DIR, `${day}.jsonl`);
      const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
      try {
        await fs.appendFile(filePath, lines, { mode: 0o600 });
      } catch (err) {
        console.error("[audit] failed to write log:", err);
      }
    }

    this.flushing = false;
    if (this.writeQueue.length > 0) this.scheduleFlush();
  }

  /** Read entries from a date range (inclusive) */
  async read(opts: { fromDate?: string; toDate?: string; limit?: number } = {}): Promise<AuditEntry[]> {
    await this.init();
    const files = (await fs.readdir(AUDIT_DIR)).filter((f) => f.endsWith(".jsonl")).sort();

    const from = opts.fromDate || files[0]?.replace(".jsonl", "") || "";
    const to = opts.toDate || files[files.length - 1]?.replace(".jsonl", "") || "9999-12-31";

    const matchingFiles = files.filter((f) => {
      const day = f.replace(".jsonl", "");
      return day >= from && day <= to;
    });

    const entries: AuditEntry[] = [];
    for (const file of matchingFiles) {
      try {
        const content = await fs.readFile(path.join(AUDIT_DIR, file), "utf-8");
        for (const line of content.split("\n")) {
          if (!line.trim()) continue;
          try {
            entries.push(JSON.parse(line));
          } catch {
            // skip bad lines
          }
        }
      } catch {
        // skip unreadable files
      }
    }

    if (opts.limit) return entries.slice(-opts.limit);
    return entries;
  }

  async availableDates(): Promise<string[]> {
    await this.init();
    return (await fs.readdir(AUDIT_DIR))
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(".jsonl", ""))
      .sort();
  }

  async stats(date?: string): Promise<{ date: string; total: number; byKind: Record<string, number> }> {
    const day = date || new Date().toISOString().slice(0, 10);
    const entries = await this.read({ fromDate: day, toDate: day });
    const byKind: Record<string, number> = {};
    for (const e of entries) {
      const k = e.event.kind;
      byKind[k] = (byKind[k] || 0) + 1;
    }
    return { date: day, total: entries.length, byKind };
  }
}

export const audit = new AuditLogger();
