// ============================================================
// 🌒 vesper doctor — health check
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function color(s: string, c: keyof typeof COLOR) {
  return `${COLOR[c]}${s}${COLOR.reset}`;
}

type Status = "ok" | "warn" | "fail";

interface Check {
  name: string;
  status: Status;
  message?: string;
  remedy?: string;
}

function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function checkNode(): Check {
  const version = tryExec("node --version");
  if (!version) {
    return {
      name: "Node.js",
      status: "fail",
      message: "Not installed",
      remedy: "Install Node.js 18+ from https://nodejs.org",
    };
  }
  const major = parseInt(version.replace("v", "").split(".")[0]);
  if (major < 18) {
    return {
      name: "Node.js",
      status: "warn",
      message: `${version} (need 18+)`,
      remedy: "Upgrade to Node 18 or higher",
    };
  }
  return { name: "Node.js", status: "ok", message: version };
}

function checkPnpm(): Check {
  const version = tryExec("pnpm --version");
  if (!version) {
    return {
      name: "pnpm",
      status: "warn",
      message: "Not installed (npm fallback works)",
      remedy: "npm install -g pnpm",
    };
  }
  return { name: "pnpm", status: "ok", message: version };
}

function checkWorkspace(): Check {
  const home = process.env.HOME || "";
  const workspace = path.join(home, ".openvesper");
  if (!fs.existsSync(workspace)) {
    return {
      name: "Workspace",
      status: "warn",
      message: `Not initialized at ${workspace}`,
      remedy: "vesper onboard",
    };
  }
  return { name: "Workspace", status: "ok", message: workspace };
}

function checkConfig(): Check {
  const home = process.env.HOME || "";
  const configPath = path.join(home, ".openvesper", "openvesper.json");
  if (!fs.existsSync(configPath)) {
    return {
      name: "Config",
      status: "warn",
      message: "No config (using defaults)",
      remedy: `Create ${configPath} or run 'vesper onboard'`,
    };
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!config.agent?.model) {
      return {
        name: "Config",
        status: "warn",
        message: "No agent.model set",
        remedy: 'Add { "agent": { "model": "anthropic/claude-opus-4-5" } }',
      };
    }
    return { name: "Config", status: "ok", message: configPath };
  } catch (e: any) {
    return {
      name: "Config",
      status: "fail",
      message: `Invalid JSON: ${e.message}`,
      remedy: "Fix syntax in openvesper.json",
    };
  }
}

function checkEnvFile(): Check {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.env.HOME || "", ".openvesper", ".env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { name: ".env file", status: "ok", message: p };
    }
  }
  return {
    name: ".env file",
    status: "warn",
    message: "Not found (env vars must be in shell)",
    remedy: "Create .env in cwd or ~/.openvesper/.env",
  };
}

function checkLLMProviders(): Check {
  const providers = {
    ANTHROPIC_API_KEY: "Anthropic",
    OPENAI_API_KEY: "OpenAI",
    GROQ_API_KEY: "Groq",
    GEMINI_API_KEY: "Gemini",
    GROK_API_KEY: "Grok",
    DEEPSEEK_API_KEY: "DeepSeek",
    MISTRAL_API_KEY: "Mistral",
    TOGETHER_API_KEY: "Together",
    OPENROUTER_API_KEY: "OpenRouter",
    PERPLEXITY_API_KEY: "Perplexity",
    OLLAMA_HOST: "Ollama (local)",
    LM_STUDIO_HOST: "LM Studio (local)",
  };

  const configured = Object.entries(providers)
    .filter(([key]) => process.env[key])
    .map(([, name]) => name);

  if (configured.length === 0) {
    return {
      name: "LLM Providers",
      status: "fail",
      message: "No LLM provider configured",
      remedy: "Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY (free)",
    };
  }
  return {
    name: "LLM Providers",
    status: "ok",
    message: `${configured.length} configured: ${configured.join(", ")}`,
  };
}

function checkAgentsDir(): Check {
  const dir = path.join(process.cwd(), ".agents");
  if (!fs.existsSync(dir)) {
    return {
      name: "Agents dir",
      status: "warn",
      message: "No .agents/ in cwd",
      remedy: "vesper agent create",
    };
  }
  const agents = fs.readdirSync(dir).filter((e) => {
    const p = path.join(dir, e);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "SOUL.md"));
  });
  return { name: "Agents dir", status: "ok", message: `${agents.length} agents in ${dir}` };
}

function checkSkillsDir(): Check {
  const dir = path.join(process.cwd(), "skills");
  if (!fs.existsSync(dir)) {
    return { name: "Skills dir", status: "warn", message: "No skills/ in cwd" };
  }
  const skills = fs.readdirSync(dir).filter((e) => {
    const p = path.join(dir, e);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "SKILL.md"));
  });
  return { name: "Skills dir", status: "ok", message: `${skills.length} skills in ${dir}` };
}

function checkPort(port: number, name: string): Check {
  // Simple port check via net.createServer is tricky; check via shell command
  if (process.platform === "win32") {
    const result = tryExec(`netstat -an | findstr :${port}`);
    if (result) {
      return {
        name: `Port ${port}`,
        status: "warn",
        message: `${name} port appears in use`,
        remedy: `Change gateway port: vesper gateway --port ${port + 1}`,
      };
    }
  } else {
    const result = tryExec(`lsof -i :${port}`);
    if (result) {
      return {
        name: `Port ${port}`,
        status: "warn",
        message: `${name} port appears in use`,
        remedy: `Change gateway port: vesper gateway --port ${port + 1}`,
      };
    }
  }
  return { name: `Port ${port}`, status: "ok", message: `${name} port free` };
}

function checkPermissions(): Check {
  const home = process.env.HOME || "";
  const workspace = path.join(home, ".openvesper");
  if (!fs.existsSync(workspace)) {
    return { name: "Workspace perms", status: "ok", message: "n/a (workspace not initialized)" };
  }
  try {
    const stat = fs.statSync(workspace);
    const mode = (stat.mode & 0o777).toString(8);
    if (process.platform !== "win32" && mode !== "700" && mode !== "750") {
      return {
        name: "Workspace perms",
        status: "warn",
        message: `Workspace is ${mode} (recommend 700)`,
        remedy: `chmod 700 ${workspace}`,
      };
    }
    return { name: "Workspace perms", status: "ok", message: mode };
  } catch {
    return { name: "Workspace perms", status: "warn", message: "Could not check" };
  }
}

function checkDiskSpace(): Check {
  // POSIX-only via df. Windows skips gracefully.
  if (process.platform === "win32") {
    return { name: "Disk space", status: "ok", message: "(skipped on Windows)" };
  }
  try {
    const home = process.env.HOME || ".";
    const out = tryExec(`df -k "${home}" | tail -1`);
    if (!out) {
      return { name: "Disk space", status: "warn", message: "Could not run df" };
    }
    const parts = out.trim().split(/\s+/);
    // df -k columns: filesystem, 1K-blocks, used, available, use%, mount
    const available1K = parseInt(parts[3], 10);
    if (Number.isNaN(available1K)) {
      return { name: "Disk space", status: "warn", message: "Could not parse df output" };
    }
    const availMB = Math.floor(available1K / 1024);
    if (availMB < 100) {
      return {
        name: "Disk space",
        status: "fail",
        message: `Only ${availMB} MB free on $HOME`,
        remedy: "Free up disk space — sessions, audit logs, and memory all write here.",
      };
    }
    if (availMB < 1024) {
      return {
        name: "Disk space",
        status: "warn",
        message: `${availMB} MB free on $HOME`,
        remedy: "Consider freeing space before running long-lived sessions.",
      };
    }
    const availGB = (availMB / 1024).toFixed(1);
    return { name: "Disk space", status: "ok", message: `${availGB} GB free` };
  } catch {
    return { name: "Disk space", status: "warn", message: "Check failed" };
  }
}

function checkOAuthTokens(): Check {
  const tokenDir = path.join(os.homedir(), ".openvesper", "tokens");
  if (!fs.existsSync(tokenDir)) {
    return { name: "OAuth tokens", status: "ok", message: "(no tokens stored yet)" };
  }
  try {
    const files = fs.readdirSync(tokenDir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
      return { name: "OAuth tokens", status: "ok", message: "(no tokens stored)" };
    }
    let expired = 0;
    let expiringSoon = 0;
    const ONE_DAY_MS = 86_400_000;
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(tokenDir, f), "utf-8"));
        const exp = data.expires_at || data.expiresAt;
        if (typeof exp !== "number") continue;
        const remainMs = exp - Date.now();
        if (remainMs < 0) expired++;
        else if (remainMs < 7 * ONE_DAY_MS) expiringSoon++;
      } catch {
        // ignore malformed token files
      }
    }
    if (expired > 0) {
      return {
        name: "OAuth tokens",
        status: "warn",
        message: `${expired} expired, ${expiringSoon} expiring within 7d (${files.length} total)`,
        remedy: "Re-authenticate: vesper oauth login <provider>",
      };
    }
    if (expiringSoon > 0) {
      return {
        name: "OAuth tokens",
        status: "warn",
        message: `${expiringSoon} expiring within 7d (${files.length} total)`,
      };
    }
    return { name: "OAuth tokens", status: "ok", message: `${files.length} valid` };
  } catch {
    return { name: "OAuth tokens", status: "warn", message: "Could not read token directory" };
  }
}

function checkCronSyntax(): Check {
  const cronPath = path.join(os.homedir(), ".openvesper", "cron.yaml");
  if (!fs.existsSync(cronPath)) {
    return { name: "Cron jobs", status: "ok", message: "(no cron.yaml — feature unused)" };
  }
  try {
    const content = fs.readFileSync(cronPath, "utf-8");
    // Very loose YAML-ish parser: just look for `schedule:` lines and validate them.
    const lines = content.split("\n");
    const schedules: { line: number; expr: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*schedule:\s*["']?([^"'#\n]+)["']?\s*$/);
      if (m) schedules.push({ line: i + 1, expr: m[1].trim() });
    }
    if (schedules.length === 0) {
      return { name: "Cron jobs", status: "ok", message: "(cron.yaml empty or no schedules)" };
    }
    // Cron expressions: 5 fields (m h dom mon dow) — validate by counting whitespace-separated parts.
    // Field characters: digits, *, /, -, ,, and a small set of names. We don't fully parse.
    const bad: string[] = [];
    for (const s of schedules) {
      const parts = s.expr.split(/\s+/);
      if (parts.length !== 5 && parts.length !== 6) {
        bad.push(`line ${s.line}: "${s.expr}" — expected 5 fields, got ${parts.length}`);
        continue;
      }
      if (!parts.every((p) => /^[\d\*\/\-\,a-zA-Z]+$/.test(p))) {
        bad.push(`line ${s.line}: "${s.expr}" — contains unexpected characters`);
      }
    }
    if (bad.length > 0) {
      return {
        name: "Cron jobs",
        status: "fail",
        message: `${bad.length} invalid expression${bad.length !== 1 ? "s" : ""}`,
        remedy: bad[0] + (bad.length > 1 ? ` (+${bad.length - 1} more)` : ""),
      };
    }
    return { name: "Cron jobs", status: "ok", message: `${schedules.length} valid schedule${schedules.length !== 1 ? "s" : ""}` };
  } catch (err) {
    return { name: "Cron jobs", status: "warn", message: `Could not parse: ${err instanceof Error ? err.message : err}` };
  }
}

export function runDoctor(opts: { fix?: boolean }) {
  console.log(color(`\n🌒 OpenVesper Doctor\n`, "cyan"));
  console.log(color(`Running checks...`, "dim"));
  console.log();

  const checks: Check[] = [
    checkNode(),
    checkPnpm(),
    checkWorkspace(),
    checkConfig(),
    checkEnvFile(),
    checkLLMProviders(),
    checkAgentsDir(),
    checkSkillsDir(),
    checkPort(18789, "Gateway"),
    checkPermissions(),
    checkDiskSpace(),
    checkOAuthTokens(),
    checkCronSyntax(),
  ];

  let okCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const icon = check.status === "ok" ? color("✓", "green") : check.status === "warn" ? color("⚠", "yellow") : color("✗", "red");
    const name = check.name.padEnd(20);
    const message = check.message || "";
    console.log(`${icon} ${color(name, "bold")} ${color(message, "dim")}`);
    if (check.remedy && check.status !== "ok") {
      console.log(`  ${color("→", "dim")} ${color(check.remedy, "cyan")}`);
    }
    if (check.status === "ok") okCount++;
    else if (check.status === "warn") warnCount++;
    else failCount++;
  }

  console.log();
  console.log(color("─".repeat(60), "dim"));

  if (failCount === 0 && warnCount === 0) {
    console.log(color(`✓ All ${okCount} checks passed.`, "green"));
  } else {
    const summary: string[] = [];
    if (okCount > 0) summary.push(color(`${okCount} OK`, "green"));
    if (warnCount > 0) summary.push(color(`${warnCount} warning${warnCount !== 1 ? "s" : ""}`, "yellow"));
    if (failCount > 0) summary.push(color(`${failCount} error${failCount !== 1 ? "s" : ""}`, "red"));
    console.log(summary.join("  ·  "));
  }
  console.log();

  if (failCount > 0) {
    console.log(color("Action required: fix the errors above before running agents.", "red"));
    process.exit(1);
  }
}
