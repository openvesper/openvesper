// ============================================================
// 🌒 vesper pairing — manage DM allowlists for channels
//
// Subcommands:
//   list [channel]                 — show all pairings (pending + approved)
//   pending [channel]              — only show pending pairings
//   approved [channel]             — only show approved senders
//   approve <channel> <code>       — approve by 6-digit code
//   approve-direct <channel> <id>  — approve identity directly (skip code)
//   deny <channel> <identity>      — block sender permanently
//   revoke <channel> <identity>    — remove from store (re-pair from scratch)
// ============================================================

import http from "http";

const GATEWAY = process.env.OPENVESPER_GATEWAY_URL || "http://127.0.0.1:18789";

// Color helpers
const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

interface PairingEntry {
  key: string;
  channel: string;
  identity: string;
  state: "unknown" | "pending" | "approved" | "denied";
  code?: string;
  displayName?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

async function api<T>(
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<T> {
  const url = new URL(path, GATEWAY);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        headers: body
          ? { "Content-Type": "application/json" }
          : {},
      },
      (res) => {
        let buf = "";
        res.on("data", (chunk) => (buf += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(`HTTP ${res.statusCode}: ${buf.slice(0, 200)}`)
            );
            return;
          }
          try {
            resolve(JSON.parse(buf) as T);
          } catch {
            reject(new Error("Invalid JSON response"));
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function formatRelative(ts: number): string {
  if (!ts) return c.dim("(never)");
  const diffMs = Date.now() - ts;
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function formatExpiresIn(expiresAt?: number): string {
  if (!expiresAt) return "";
  const diffMs = expiresAt - Date.now();
  if (diffMs < 0) return c.red("(expired)");
  if (diffMs < 3600000) return c.amber(`expires in ${Math.floor(diffMs / 60000)}m`);
  return c.dim(`expires in ${Math.floor(diffMs / 3600000)}h`);
}

function stateBadge(state: string): string {
  switch (state) {
    case "approved":
      return c.green("● approved");
    case "pending":
      return c.amber("○ pending");
    case "denied":
      return c.red("✗ denied");
    default:
      return c.dim("· " + state);
  }
}

function printTable(entries: PairingEntry[]): void {
  if (entries.length === 0) {
    console.log(c.dim("  (no entries)"));
    return;
  }
  console.log("");
  for (const e of entries) {
    const name = e.displayName ? `${e.identity} (${e.displayName})` : e.identity;
    const codePart =
      e.state === "pending" && e.code
        ? "  " + c.bold(c.cyan(`code: ${e.code}`)) + " " + formatExpiresIn(e.expiresAt)
        : "";
    console.log(
      `  ${stateBadge(e.state)}  ${c.cyan(e.channel.padEnd(10))} ${name}${codePart}`
    );
    console.log(
      `              ${c.dim(`updated ${formatRelative(e.updatedAt)}`)}`
    );
  }
  console.log("");
}

// ── Subcommand implementations ───────────────────────────────────────

export async function pairingList(channel?: string): Promise<void> {
  const entries = await api<PairingEntry[]>("GET", `/pairing/all`);
  const filtered = channel ? entries.filter((e) => e.channel === channel) : entries;
  console.log(c.bold(`\n🌒 Pairings${channel ? ` (channel: ${channel})` : ""}`));
  printTable(filtered);
  if (filtered.length > 0) {
    const counts = { approved: 0, pending: 0, denied: 0 };
    for (const e of filtered) {
      if (e.state in counts) counts[e.state as keyof typeof counts]++;
    }
    console.log(
      c.dim(
        `  Total: ${filtered.length}  (${counts.approved} approved, ${counts.pending} pending, ${counts.denied} denied)`
      )
    );
    console.log("");
  }
}

export async function pairingPending(channel?: string): Promise<void> {
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : "";
  const entries = await api<PairingEntry[]>("GET", `/pairing/pending${qs}`);
  console.log(c.bold(`\n🌒 Pending pairings${channel ? ` (${channel})` : ""}`));
  printTable(entries);
}

export async function pairingApproved(channel?: string): Promise<void> {
  const qs = channel ? `?channel=${encodeURIComponent(channel)}` : "";
  const entries = await api<PairingEntry[]>("GET", `/pairing/approved${qs}`);
  console.log(c.bold(`\n🌒 Approved senders${channel ? ` (${channel})` : ""}`));
  printTable(entries);
}

export async function pairingApproveCode(channel: string, code: string): Promise<void> {
  try {
    const entry = await api<PairingEntry>("POST", "/pairing/approve-code", {
      channel,
      code,
    });
    console.log(c.green(`\n  ✓ Approved ${entry.channel}:${entry.identity}`));
    if (entry.displayName) {
      console.log(c.dim(`    Display name: ${entry.displayName}`));
    }
    console.log("");
  } catch (err) {
    console.error(c.red(`\n  ✗ ${err instanceof Error ? err.message : err}`));
    console.error(c.dim(`    Code may be wrong, expired, or already used.`));
    process.exit(1);
  }
}

export async function pairingApproveDirect(channel: string, identity: string): Promise<void> {
  const entry = await api<PairingEntry>("POST", "/pairing/approve", {
    channel,
    identity,
  });
  console.log(c.green(`\n  ✓ Approved ${entry.channel}:${entry.identity}`));
  console.log("");
}

export async function pairingDeny(channel: string, identity: string): Promise<void> {
  await api<PairingEntry>("POST", "/pairing/deny", { channel, identity });
  console.log(c.red(`\n  ✗ Denied ${channel}:${identity}`));
  console.log(c.dim(`    Future messages from this sender will be silently dropped.`));
  console.log("");
}

export async function pairingRevoke(channel: string, identity: string): Promise<void> {
  const { removed } = await api<{ removed: boolean }>("POST", "/pairing/revoke", {
    channel,
    identity,
  });
  if (removed) {
    console.log(c.amber(`\n  ↺ Revoked ${channel}:${identity}`));
    console.log(c.dim(`    Next message from them will trigger a new pairing code.`));
  } else {
    console.log(c.dim(`\n  ○ Nothing to revoke — not in store.`));
  }
  console.log("");
}
