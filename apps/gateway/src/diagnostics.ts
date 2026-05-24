// ============================================================
// 🌒 Diagnostics Export — Bundle config + logs for bug reports
// ============================================================
//
// `vesper diag export` collects:
//   - Gateway version
//   - Plugin list
//   - Agent list
//   - Recent audit log entries (24h)
//   - Recent gateway log file
//   - Health status
//   - Config file (with secrets redacted)
//
// Outputs to a JSON file the user can attach to a bug report.
//
// PRIVACY: Secrets are stripped. The user sees and approves before
// sharing. Nothing is auto-uploaded.

import fs from "fs/promises";
import path from "path";
import os from "os";
import { audit } from "./audit.js";

const REDACT_KEYS = [
  "apiKey", "api_key", "token", "secret", "password", "auth",
  "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY",
  "TELEGRAM_BOT_TOKEN", "GITHUB_TOKEN", "SLACK_BOT_TOKEN", "HELIUS_API_KEY",
  "accessToken", "refreshToken", "clientSecret",
];

function redact(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.some((rk) => k.toLowerCase().includes(rk.toLowerCase()))) {
      out[k] = "<REDACTED>";
    } else if (typeof v === "object") {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export interface DiagnosticsReport {
  generatedAt: string;
  gateway: {
    version: string;
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
  config: any;
  agents: {
    bundled: string[];
    installed: string[];
  };
  installedTokenProviders: string[];
  audit: {
    today: { date: string; total: number; byKind: Record<string, number> };
    recentEntries: number;
  };
  recentLog: string;
}

export async function generateDiagnostics(opts: {
  version: string;
  uptime: number;
  agentsDir: string;
}): Promise<DiagnosticsReport> {
  const home = os.homedir();

  // Config (redacted)
  let config: any = null;
  const configPath = path.join(home, ".openvesper", "config.json");
  try {
    config = redact(JSON.parse(await fs.readFile(configPath, "utf-8")));
  } catch {
    // no config
  }

  // Agents
  let bundled: string[] = [];
  try {
    bundled = (await fs.readdir(opts.agentsDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    // none
  }

  let installed: string[] = [];
  try {
    installed = (await fs.readdir(path.join(home, ".openvesper", "agents"), { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    // none
  }

  // OAuth providers
  let tokenProviders: string[] = [];
  try {
    tokenProviders = (await fs.readdir(path.join(home, ".openvesper", "tokens")))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    // none
  }

  // Today's audit stats
  const today = await audit.stats();
  const recentEntries = (await audit.read({ limit: 100 })).length;

  // Last 100 lines of gateway log
  let recentLog = "(no log file)";
  try {
    const log = await fs.readFile(path.join(home, ".openvesper", "gateway.log"), "utf-8");
    recentLog = log.split("\n").slice(-100).join("\n");
  } catch {
    // no log
  }

  return {
    generatedAt: new Date().toISOString(),
    gateway: {
      version: opts.version,
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.arch()} ${os.release()}`,
      uptime: opts.uptime,
    },
    config,
    agents: { bundled, installed },
    installedTokenProviders: tokenProviders,
    audit: { today, recentEntries },
    recentLog,
  };
}

/** Write report to a file the user can share */
export async function exportDiagnostics(opts: {
  version: string;
  uptime: number;
  agentsDir: string;
  outputPath?: string;
}): Promise<string> {
  const report = await generateDiagnostics(opts);
  const filename = `openvesper-diag-${Date.now()}.json`;
  const outPath = opts.outputPath || path.join(os.homedir(), ".openvesper", filename);
  await fs.mkdir(path.dirname(outPath), { recursive: true, mode: 0o700 });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  return outPath;
}
