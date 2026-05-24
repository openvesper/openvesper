// ============================================================
// 🌒 vesper onboard — Interactive setup wizard
//
// Walks a new user through the bare-minimum setup:
//   1. Create workspace at ~/.openvesper
//   2. Pick LLM provider, store API key in .env
//   3. (Optional) Pick a default agent
//   4. (Optional) Test connection with a small "hello" query
//   5. (Optional) Install daemon for auto-start
//
// Idempotent — safe to re-run. Existing values are shown and offered
// to keep or overwrite.
// ============================================================

import fs from "fs/promises";
import path from "path";
import os from "os";
import readline from "readline";
import { PROVIDER_INFO, ProviderName, PROVIDERS } from "@openvesper/core";

// ── Color helpers (lightweight, no chalk dep) ───────────────────────

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

// ── Prompt helpers ──────────────────────────────────────────────────

function makeRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

async function askYesNo(rl: readline.Interface, q: string, defaultYes = true): Promise<boolean> {
  const tag = defaultYes ? "[Y/n]" : "[y/N]";
  const ans = (await ask(rl, `${q} ${c.dim(tag)} `)).toLowerCase();
  if (!ans) return defaultYes;
  return ans === "y" || ans === "yes";
}

async function askChoice<T extends string>(
  rl: readline.Interface,
  q: string,
  choices: { value: T; label: string; hint?: string }[],
  defaultValue?: T
): Promise<T> {
  console.log(`\n${q}\n`);
  choices.forEach((ch, i) => {
    const def = ch.value === defaultValue ? c.amber("(default)") : "";
    const hint = ch.hint ? c.dim(` — ${ch.hint}`) : "";
    console.log(`  ${c.cyan(String(i + 1).padStart(2))} ${ch.label}${hint} ${def}`);
  });
  while (true) {
    const ans = await ask(rl, `\nChoose [1-${choices.length}]: `);
    if (!ans && defaultValue) return defaultValue;
    const idx = parseInt(ans, 10) - 1;
    if (idx >= 0 && idx < choices.length) return choices[idx].value;
    console.log(c.red("  Invalid choice — try again."));
  }
}

// ── Workspace setup ─────────────────────────────────────────────────

const HOME = os.homedir();
const WORKSPACE_ROOT = path.join(HOME, ".openvesper");
const CONFIG_FILE = path.join(WORKSPACE_ROOT, "config.json");
const ENV_FILE = path.join(process.cwd(), ".env");

async function ensureWorkspace(): Promise<{ created: boolean }> {
  let created = false;
  try {
    await fs.access(WORKSPACE_ROOT);
  } catch {
    await fs.mkdir(WORKSPACE_ROOT, { recursive: true, mode: 0o700 });
    created = true;
  }
  for (const sub of ["workspace/sessions", "agents", "tokens", "tasks", "audit", "plugins"]) {
    await fs.mkdir(path.join(WORKSPACE_ROOT, sub), { recursive: true, mode: 0o700 });
  }
  return { created };
}

async function readConfig(): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function writeConfig(cfg: Record<string, unknown>): Promise<void> {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(ENV_FILE, "utf-8");
    const out: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

async function writeEnvFile(env: Record<string, string>): Promise<void> {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  // Preserve existing comments / order if file exists by appending only new keys
  let existing = "";
  try {
    existing = await fs.readFile(ENV_FILE, "utf-8");
  } catch {
    // new file
  }
  const existingKeys = new Set<string>();
  for (const line of existing.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (m) existingKeys.add(m[1]);
  }
  const newLines: string[] = [];
  for (const [k, v] of Object.entries(env)) {
    if (existingKeys.has(k)) {
      // Replace in place
      existing = existing.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`);
    } else {
      newLines.push(`${k}=${v}`);
    }
  }
  const final =
    existing.trim() +
    (newLines.length ? "\n\n# Added by `vesper onboard`\n" + newLines.join("\n") : "") +
    "\n";
  await fs.writeFile(ENV_FILE, final.trimStart(), { mode: 0o600 });
}

// ── Provider selection ─────────────────────────────────────────────

const PROVIDER_CHOICES = [
  { value: "anthropic" as const, label: "Anthropic Claude", hint: "best tool-use, paid" },
  { value: "openai" as const, label: "OpenAI", hint: "strong all-around, paid" },
  { value: "gemini" as const, label: "Google Gemini", hint: "generous free tier" },
  { value: "groq" as const, label: "Groq", hint: "fastest, free tier" },
  { value: "deepseek" as const, label: "DeepSeek", hint: "10× cheaper than GPT-4" },
  { value: "openrouter" as const, label: "OpenRouter", hint: "one key, 200+ models" },
  { value: "ollama" as const, label: "Ollama (local)", hint: "free, runs on your machine" },
  { value: "lmstudio" as const, label: "LM Studio (local)", hint: "free, local OpenAI-compat server" },
];

async function pickProvider(rl: readline.Interface, currentProvider?: string): Promise<ProviderName> {
  const choice = await askChoice<ProviderName>(
    rl,
    c.bold("Pick your default LLM provider:"),
    PROVIDER_CHOICES,
    (currentProvider as ProviderName) || "anthropic"
  );
  return choice;
}

async function setupApiKey(rl: readline.Interface, provider: ProviderName): Promise<boolean> {
  const info = PROVIDER_INFO[provider];
  const env = await readEnvFile();
  const existing = env[info.envKey] || process.env[info.envKey];

  if (provider === "ollama") {
    console.log(c.green("\n  ✓ Ollama needs no API key. Just make sure `ollama serve` is running."));
    return true;
  }
  if (provider === "lmstudio") {
    console.log(c.green("\n  ✓ LM Studio needs no API key. Start the local server in LM Studio."));
    return true;
  }

  if (existing) {
    console.log(c.dim(`\n  ${info.envKey} is already set (ending in ...${existing.slice(-4)}).`));
    const keep = await askYesNo(rl, "  Keep the existing key?");
    if (keep) return true;
  }

  console.log(`\n${c.bold("Get an API key:")} ${c.cyan(info.signupUrl)}`);
  const key = await ask(rl, `${info.envKey}: `);
  if (!key) {
    console.log(c.amber("  Skipped. You can run `vesper onboard` again later."));
    return false;
  }
  env[info.envKey] = key;
  await writeEnvFile(env);
  console.log(c.green(`  ✓ Saved to ${ENV_FILE}`));
  return true;
}

// ── Default agent ───────────────────────────────────────────────────

async function pickDefaultAgent(rl: readline.Interface, cfg: Record<string, unknown>): Promise<string> {
  console.log(
    `\n${c.bold("Default agent")} controls which persona handles a message when the router doesn't override.`
  );
  console.log(c.dim('You can change this anytime with `vesper agent start <mode>`.'));
  const choice = await askChoice(
    rl,
    "Pick the default:",
    [
      { value: "auto", label: "auto", hint: "router picks best specialist" },
      { value: "code-reviewer", label: "code-reviewer", hint: "for development work" },
      { value: "bags-hunter", label: "bags-hunter", hint: "Solana memecoin research" },
      { value: "productivity-coach", label: "productivity-coach", hint: "general assistant" },
    ],
    (cfg.defaultAgent as string) || "auto"
  );
  cfg.defaultAgent = choice;
  await writeConfig(cfg);
  return choice;
}

// ── Test connection ─────────────────────────────────────────────────

async function testConnection(provider: ProviderName): Promise<boolean> {
  const p = PROVIDERS[provider];
  if (!p.isAvailable()) {
    console.log(c.red("\n  ✗ Provider not available — API key missing or local server not running."));
    return false;
  }
  console.log(c.dim("\n  Sending a small test message..."));
  try {
    const res = await p.call({
      messages: [{ role: "user", content: 'Reply with just the word "ok".' }],
      maxTokens: 10,
    });
    const text = res.content.map((b) => b.text || "").join("").trim();
    if (text.length > 0) {
      console.log(c.green(`  ✓ Reply: "${text.slice(0, 30)}"`));
      console.log(
        c.dim(`    Model: ${res.model || p.defaultModel}, tokens in/out: ${res.usage?.inputTokens || "?"}/${res.usage?.outputTokens || "?"}`)
      );
      return true;
    }
    console.log(c.amber("  ⚠ Empty response — provider may have rejected the request"));
    return false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(c.red(`  ✗ Call failed: ${msg.slice(0, 200)}`));
    return false;
  }
}

// ── Daemon install hint ─────────────────────────────────────────────

async function offerDaemonInstall(rl: readline.Interface): Promise<void> {
  console.log(`\n${c.bold("Run gateway as a daemon?")} (Optional)`);
  console.log(c.dim("  This will start the gateway automatically when you log in."));
  const want = await askYesNo(rl, "  Install daemon now?", false);
  if (!want) {
    console.log(c.dim("  Skipped. You can install later with: vesper gateway install-daemon"));
    return;
  }
  console.log(c.cyan("\n  Run: ") + c.bold("vesper gateway install-daemon"));
  console.log(c.dim("  (Daemon install runs as a separate command — onboard does not require it.)"));
}

// ── Main wizard ─────────────────────────────────────────────────────

export async function runOnboard(opts: { skipTest?: boolean; provider?: string } = {}): Promise<void> {
  console.log("");
  console.log(c.cyan(c.bold("  🌒 OpenVesper Onboard")));
  console.log(c.dim("     Walks you through the basics: workspace, provider, default agent, test."));
  console.log("");

  const rl = makeRl();
  try {
    // Step 1: workspace
    const { created } = await ensureWorkspace();
    if (created) {
      console.log(c.green(`  ✓ Created workspace at ${WORKSPACE_ROOT}`));
    } else {
      console.log(c.dim(`  ✓ Workspace already exists at ${WORKSPACE_ROOT}`));
    }

    // Step 2: provider + key
    const cfg = await readConfig();
    const provider = opts.provider
      ? (opts.provider as ProviderName)
      : await pickProvider(rl, cfg.defaultProvider as string);
    cfg.defaultProvider = provider;
    await writeConfig(cfg);

    const haveKey = await setupApiKey(rl, provider);

    // Step 3: default agent
    const agent = await pickDefaultAgent(rl, cfg);
    console.log(c.green(`  ✓ Default agent: ${agent}`));

    // Step 4: test
    if (haveKey && !opts.skipTest) {
      const wantTest = await askYesNo(rl, "\nRun a quick connection test?", true);
      if (wantTest) {
        await testConnection(provider);
      }
    }

    // Step 5: daemon
    await offerDaemonInstall(rl);

    console.log("");
    console.log(c.green(c.bold("  ✓ Onboarding complete!")));
    console.log("");
    console.log("  Next steps:");
    console.log(c.cyan("    vesper gateway start") + c.dim("      # start the gateway"));
    console.log(c.cyan('    vesper -q "Hello"') + c.dim("       # send a test message"));
    console.log(c.cyan("    vesper agent list") + c.dim("         # see installed agents"));
    console.log(c.cyan("    vesper doctor") + c.dim("             # health check"));
    console.log("");
  } finally {
    rl.close();
  }
}

// ── Command registration ────────────────────────────────────────────
// Registered manually in apps/cli/src/index.ts (the CLI uses a manual
// switch-case dispatcher, not commander). Just export runOnboard.
