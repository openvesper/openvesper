// ============================================================
// 🌒 vesper monitor — terminal live dashboard
// ============================================================
//
// Polls the gateway every 2 seconds and renders:
//   - Gateway health (uptime, version)
//   - Active sessions (count, last activity per session)
//   - Pending approvals (count + top 3)
//   - Pending pairings (count + top 3)
//   - Recent tasks (last 5)
//   - Recent audit events (last 5)
//
// Uses raw ANSI escapes — no Ink dependency. Resize-aware.
// Exit with q, Q, or Ctrl-C.
// ============================================================

import * as http from "node:http";
import * as readline from "node:readline";

const GATEWAY_URL = process.env.OPENVESPER_GATEWAY_URL || "http://127.0.0.1:18789";

// ── ANSI helpers ───────────────────────────────────────────────────

const ESC = "\x1b[";
const ANSI = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  cyan: `${ESC}36m`,
  green: `${ESC}32m`,
  red: `${ESC}31m`,
  amber: `${ESC}33m`,
  clearScreen: `${ESC}2J`,
  cursorHome: `${ESC}H`,
  cursorHide: `${ESC}?25l`,
  cursorShow: `${ESC}?25h`,
  alternativeScreen: `${ESC}?1049h`,
  mainScreen: `${ESC}?1049l`,
};

function c(s: string, ...codes: string[]): string {
  return codes.join("") + s + ANSI.reset;
}

// ── Gateway client ─────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T | null> {
  return new Promise((resolve) => {
    const url = new URL(path, GATEWAY_URL);
    const req = http.request(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        timeout: 1500,
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

interface HealthResponse {
  status: string;
  version?: string;
  uptime?: number;
  sessions?: number;
}

interface Snapshot {
  health: HealthResponse | null;
  approvals: any[];
  pairings: any[];
  sessions: any[];
  audit: any[];
}

async function snapshot(): Promise<Snapshot> {
  const [health, approvals, pairings, sessions, audit] = await Promise.all([
    apiGet<HealthResponse>("/health"),
    apiGet<any[]>("/approvals/pending").then((d) => d ?? []),
    apiGet<any[]>("/pairing/pending").then((d) => d ?? []),
    apiGet<any[]>("/sessions").then((d) => d ?? []),
    apiGet<any[]>("/audit/recent?limit=5").then((d) => d ?? []),
  ]);
  return {
    health,
    approvals: approvals as any[],
    pairings: pairings as any[],
    sessions: sessions as any[],
    audit: audit as any[],
  };
}

// ── Rendering ──────────────────────────────────────────────────────

function fmtTime(ms?: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function fmtUptime(seconds?: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function render(snap: Snapshot, width: number): string {
  const lines: string[] = [];
  const hr = c("─".repeat(width), ANSI.dim);

  // Header
  lines.push("");
  const title = c("  🌒 OpenVesper Monitor", ANSI.cyan, ANSI.bold);
  const refresh = c(`  refresh every 2s · q to quit`, ANSI.dim);
  lines.push(title + " ".repeat(Math.max(1, width - 25 - 32)) + refresh);
  lines.push(hr);

  // Health row
  if (!snap.health) {
    lines.push(c("  ✗ Gateway unreachable", ANSI.red));
    lines.push(c(`    at ${GATEWAY_URL}`, ANSI.dim));
    lines.push(c("    start with: vesper gateway start -d", ANSI.dim));
    lines.push("");
    return lines.join("\n");
  }

  const status =
    snap.health.status === "ok" || snap.health.status === "healthy"
      ? c("● online", ANSI.green)
      : c(`○ ${snap.health.status}`, ANSI.amber);

  lines.push(
    `  Gateway: ${status}  ` +
      c(`v${snap.health.version || "?"}`, ANSI.dim) +
      c(`  uptime ${fmtUptime(snap.health.uptime)}`, ANSI.dim)
  );
  lines.push("");

  // Counters row
  const counters = [
    `${c(String(snap.sessions.length), ANSI.bold)} sessions`,
    `${c(String(snap.approvals.length), snap.approvals.length > 0 ? ANSI.amber : ANSI.dim)} approvals pending`,
    `${c(String(snap.pairings.length), snap.pairings.length > 0 ? ANSI.amber : ANSI.dim)} pairings pending`,
  ];
  lines.push("  " + counters.join("    "));
  lines.push("");

  // Pending approvals
  lines.push(c("  Approvals", ANSI.bold));
  if (snap.approvals.length === 0) {
    lines.push(c("    (none)", ANSI.dim));
  } else {
    for (const a of snap.approvals.slice(0, 3)) {
      const tool = (a.toolName || a.tool || "?").padEnd(20);
      const reqAt = fmtTime(a.requestedAt);
      lines.push(`    ${c("○", ANSI.amber)} ${tool} ${c(reqAt, ANSI.dim)}`);
    }
    if (snap.approvals.length > 3) {
      lines.push(c(`    +${snap.approvals.length - 3} more`, ANSI.dim));
    }
  }
  lines.push("");

  // Pending pairings
  lines.push(c("  Pairings", ANSI.bold));
  if (snap.pairings.length === 0) {
    lines.push(c("    (none)", ANSI.dim));
  } else {
    for (const p of snap.pairings.slice(0, 3)) {
      const who = `${p.channel}:${p.identity}`.padEnd(20);
      const code = c(p.code || "?", ANSI.cyan);
      lines.push(`    ${c("○", ANSI.amber)} ${who} ${code}`);
    }
    if (snap.pairings.length > 3) {
      lines.push(c(`    +${snap.pairings.length - 3} more`, ANSI.dim));
    }
  }
  lines.push("");

  // Recent audit
  lines.push(c("  Recent activity", ANSI.bold));
  if (snap.audit.length === 0) {
    lines.push(c("    (none)", ANSI.dim));
  } else {
    for (const e of snap.audit.slice(0, 5)) {
      const when = fmtTime(e.timestamp || e.at).padEnd(12);
      const what = (e.event || e.type || e.action || "?").slice(0, 30).padEnd(30);
      const detail = (e.detail || e.tool || e.session || "").slice(0, width - 50);
      lines.push(`    ${c(when, ANSI.dim)} ${what} ${c(detail, ANSI.dim)}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

// ── Main loop ──────────────────────────────────────────────────────

export async function runMonitor(): Promise<void> {
  process.stdout.write(ANSI.alternativeScreen + ANSI.cursorHide);

  const restore = () => {
    process.stdout.write(ANSI.cursorShow + ANSI.mainScreen);
  };

  // Quit on q, Q, Ctrl-C
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_str, key) => {
    if (!key) return;
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      restore();
      process.exit(0);
    }
  });
  process.on("SIGINT", () => {
    restore();
    process.exit(0);
  });
  process.on("exit", restore);

  let last = "";

  const tick = async () => {
    const snap = await snapshot();
    const width = process.stdout.columns || 80;
    const frame = ANSI.clearScreen + ANSI.cursorHome + render(snap, width);
    if (frame !== last) {
      process.stdout.write(frame);
      last = frame;
    }
  };

  await tick();
  setInterval(tick, 2000);
}
