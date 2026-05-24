// ============================================================
// 🌒 vesper workspace + onboard
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";

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

const DEFAULT_CONFIG = {
  agent: {
    model: "anthropic/claude-opus-4-5",
    temperature: 0.5,
    max_tokens: 4096,
    max_iterations: 20,
  },
  permissions: {
    default: "ask",
    rules: {
      read: "allow_always",
      external: "allow_always",
      write: "ask",
      execute: "ask",
      trade: "ask",
    },
  },
  memory: {
    enabled: true,
    maxItems: 1000,
  },
  trading: {
    dry_run: true,
  },
};

// ── workspace init ──────────────────────────────────────────

export function initWorkspace(opts: { force?: boolean }) {
  const home = process.env.HOME || "";
  const workspaceDir = path.join(home, ".openvesper");

  if (fs.existsSync(workspaceDir) && !opts.force) {
    console.log(color(`⚠ Workspace already exists at ${workspaceDir}`, "yellow"));
    console.log(color("Use --force to overwrite.", "dim"));
    return;
  }

  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, "workspace"), { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, "agents"), { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, "skills"), { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, "logs"), { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, "workspace", "skills"), { recursive: true });

  // Write default config
  const configPath = path.join(workspaceDir, "openvesper.json");
  if (!fs.existsSync(configPath) || opts.force) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }

  // .env stub
  const envPath = path.join(workspaceDir, ".env");
  if (!fs.existsSync(envPath) || opts.force) {
    fs.writeFileSync(
      envPath,
      `# OpenVesper env vars
# Set at least one LLM provider:
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# GROQ_API_KEY=
# GEMINI_API_KEY=

# Optional crypto plugins (READ-ONLY data, no signing):
# HELIUS_API_KEY=
# BIRDEYE_API_KEY=
# ETHERSCAN_API_KEY=

# Optional channels:
# TELEGRAM_BOT_TOKEN=
# SLACK_BOT_TOKEN=

# 🚨 NOTE — No perp DEX trading bundled
# OpenVesper does not bundle Hyperliquid, Lighter, or other perpetual-DEX
# signing code by default. If you want trading from an agent, write your
# own plugin — the framework does not enforce restrictions.
# perp DEX trading. Bring your own client for that. We focus on
# read-only data, research, and orchestration — never holding
# keys that could move funds.
`
    );
    // Lock down env perms (Unix)
    if (process.platform !== "win32") {
      fs.chmodSync(envPath, 0o600);
    }
  }

  // Workspace perms (Unix)
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(workspaceDir, 0o700);
    } catch {}
  }

  console.log(color(`\n✓ Workspace initialized at ${workspaceDir}\n`, "green"));
  console.log(color("Structure:", "bold"));
  console.log(color(`  ${workspaceDir}/`, "dim"));
  console.log(color(`  ├── openvesper.json    config`, "dim"));
  console.log(color(`  ├── .env               secrets (perm 600)`, "dim"));
  console.log(color(`  ├── workspace/         active workspace`, "dim"));
  console.log(color(`  │   └── skills/        workspace skills (highest precedence)`, "dim"));
  console.log(color(`  ├── agents/            personal agents`, "dim"));
  console.log(color(`  ├── skills/            managed skills`, "dim"));
  console.log(color(`  └── logs/              audit + runtime logs`, "dim"));
  console.log();
  console.log(color("Next:", "bold"));
  console.log(color(`  1. Edit ${envPath} with your API keys`, "cyan"));
  console.log(color("  2. vesper doctor   — verify setup", "cyan"));
  console.log(color('  3. vesper agent --message "Hello"', "cyan"));
  console.log();
}

// ── onboard (interactive wizard) ────────────────────────────

export async function runOnboard(opts: { resume?: boolean; installDaemon?: boolean }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const home = process.env.HOME || "";
  const workspaceDir = path.join(home, ".openvesper");

  console.log(color(`\n🌒 Welcome to OpenVesper\n`, "cyan"));
  console.log(color(`Let's get you set up. Should take ~3 minutes.\n`, "dim"));

  // Step 1: Workspace
  console.log(color("Step 1/5: Workspace", "bold"));
  if (fs.existsSync(workspaceDir)) {
    console.log(color(`  ✓ Workspace exists at ${workspaceDir}`, "green"));
  } else {
    console.log(color(`  Creating workspace at ${workspaceDir}...`, "dim"));
    initWorkspace({ force: false });
  }

  // Step 2: LLM provider
  console.log(color("\nStep 2/5: LLM Provider", "bold"));
  console.log(color("Which provider do you want to start with?", "dim"));
  console.log("  1) Anthropic Claude (paid, best quality)");
  console.log("  2) Groq (free tier, very fast)");
  console.log("  3) Gemini (free 15 RPM)");
  console.log("  4) Ollama (local, 100% free, requires setup)");
  console.log("  5) Skip — I'll configure later");
  const choice = (await rl.question(color("\nChoice [1-5]: ", "cyan"))).trim();

  let envVar = "";
  let placeholder = "";
  if (choice === "1") {
    envVar = "ANTHROPIC_API_KEY";
    placeholder = "sk-ant-...";
    console.log(color("\n  Get key at: https://console.anthropic.com/settings/keys", "dim"));
  } else if (choice === "2") {
    envVar = "GROQ_API_KEY";
    placeholder = "gsk_...";
    console.log(color("\n  Get key at: https://console.groq.com/keys (free)", "dim"));
  } else if (choice === "3") {
    envVar = "GEMINI_API_KEY";
    placeholder = "AIza...";
    console.log(color("\n  Get key at: https://aistudio.google.com/apikey (free)", "dim"));
  } else if (choice === "4") {
    console.log(color("\n  Install: https://ollama.com", "dim"));
    console.log(color("  Run: ollama pull llama3.2", "dim"));
    envVar = "OLLAMA_HOST";
    placeholder = "http://localhost:11434";
  }

  if (envVar) {
    const key = (await rl.question(color(`\n${envVar} (${placeholder}): `, "cyan"))).trim();
    if (key) {
      const envPath = path.join(workspaceDir, ".env");
      const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      if (!existing.includes(`${envVar}=`)) {
        fs.appendFileSync(envPath, `\n${envVar}=${key}\n`);
      } else {
        const updated = existing.replace(new RegExp(`#?\\s*${envVar}=.*`, "g"), `${envVar}=${key}`);
        fs.writeFileSync(envPath, updated);
      }
      if (process.platform !== "win32") fs.chmodSync(envPath, 0o600);
      console.log(color(`  ✓ Saved to ${envPath}`, "green"));
    }
  }

  // Step 3: Channels
  console.log(color("\nStep 3/5: Channels (optional)", "bold"));
  const wantChannels = (await rl.question(color("Configure a chat channel now? (y/N): ", "cyan"))).trim().toLowerCase();
  if (wantChannels === "y") {
    console.log("  Channel setup:");
    console.log("  - Telegram:  https://t.me/BotFather → /newbot → get token");
    console.log("  - Slack:     https://api.slack.com/apps → Create New App → Bot Token");
    console.log("  - Discord:   https://discord.com/developers/applications → Bot");
    console.log(color("\n  Set channel tokens in ~/.openvesper/.env later. Skipping for now.", "dim"));
  } else {
    console.log(color("  Skipped. Configure channels later with: vesper channel add <name>", "dim"));
  }

  // Step 4: Skill bundle
  console.log(color("\nStep 4/5: Skills", "bold"));
  console.log(color(`  16 project-wide skills available (auto-loaded from ./skills/)`, "dim"));
  console.log(color(`  Will activate based on user prompts.`, "dim"));

  // Step 5: Daemon
  console.log(color("\nStep 5/5: Daemon", "bold"));
  if (opts.installDaemon) {
    console.log(color("  Daemon installation would happen here (not yet implemented).", "yellow"));
  } else {
    console.log(color("  Skipped. Use --install-daemon next time to install systemd/launchd service.", "dim"));
  }

  rl.close();

  // Summary
  console.log(color(`\n${"─".repeat(60)}`, "dim"));
  console.log(color("\n🌒 OpenVesper is ready!\n", "green"));
  console.log(color("Try:", "bold"));
  console.log(color('  vesper agent --message "Good morning, give me the brief"', "cyan"));
  console.log(color("  vesper agent list", "cyan"));
  console.log(color("  vesper skill list", "cyan"));
  console.log(color("  vesper doctor", "cyan"));
  console.log();
  console.log(color("Docs: https://openvesper.com/docs/start/getting-started", "dim"));
  console.log(color("GitHub: https://github.com/openvesper/openvesper", "dim"));
  console.log();
}

// ── memory commands ─────────────────────────────────────────

export function memoryStats() {
  const home = process.env.HOME || "";
  const workspaceDir = path.join(home, ".openvesper", "workspace");

  if (!fs.existsSync(workspaceDir)) {
    console.error(color("Workspace not initialized.", "red"));
    process.exit(1);
  }

  const memoryFile = path.join(workspaceDir, "memory.json");
  let memCount = 0;
  let memSize = 0;
  if (fs.existsSync(memoryFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
      memCount = Array.isArray(data) ? data.length : Object.keys(data).length;
      memSize = fs.statSync(memoryFile).size;
    } catch {}
  }

  // Per-agent memories
  const agentsDir = path.join(process.cwd(), ".agents");
  let agentLogs = 0;
  if (fs.existsSync(agentsDir)) {
    for (const agent of fs.readdirSync(agentsDir)) {
      const logDir = path.join(agentsDir, agent, "memory");
      if (fs.existsSync(logDir)) {
        agentLogs += fs.readdirSync(logDir).length;
      }
    }
  }

  console.log(color("\n🌒 Memory stats\n", "cyan"));
  console.log(`  Session memory: ${memCount} items (${(memSize / 1024).toFixed(1)} KB)`);
  console.log(`  Daily agent logs: ${agentLogs}`);
  console.log();
}

export function memoryCompact() {
  const home = process.env.HOME || "";
  const memoryFile = path.join(home, ".openvesper", "workspace", "memory.json");

  if (!fs.existsSync(memoryFile)) {
    console.log(color("No session memory to compact.", "dim"));
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
    if (!Array.isArray(data)) {
      console.error(color("Memory file is not an array.", "red"));
      return;
    }
    const before = data.length;
    // Keep last 500 items (configurable later)
    const compacted = data.slice(-500);
    fs.writeFileSync(memoryFile, JSON.stringify(compacted, null, 2));
    console.log(color(`\n✓ Compacted memory: ${before} → ${compacted.length} items\n`, "green"));
  } catch (e: any) {
    console.error(color(`Failed: ${e.message}`, "red"));
  }
}
