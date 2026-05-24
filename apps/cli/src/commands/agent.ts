// ============================================================
// 🌒 vesper agent <subcommand>
// ============================================================
//
// Agent management:
//
//   list                    — list installed agents
//   registry                — list all available agents (bundled + installed)
//   show <mode>             — detailed info about an agent
//   install <mode>          — install agent to ~/.openvesper/agents/
//   uninstall <mode>        — remove from ~/.openvesper/agents/
//   start <mode>            — set as default + ensure gateway running
//   stop                    — stop using current agent (revert to auto)
//   run <mode> "<message>"  — one-off run, no session persistence
//   search <query>          — search agent registry by name/tag/description
//   create <mode>           — scaffold a new agent from template

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline/promises";

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function c(s: string, k: keyof typeof COLOR) {
  return `${COLOR[k]}${s}${COLOR.reset}`;
}

// ── Paths ────────────────────────────────────────────────────────────

const BUNDLED_AGENTS_DIR = path.join(process.cwd(), ".agents");
const USER_AGENTS_DIR = path.join(os.homedir(), ".openvesper", "agents");
const CONFIG_FILE = path.join(os.homedir(), ".openvesper", "config.json");

interface Config {
  defaultAgent?: string;
  installedAgents?: string[];
}

function readConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeConfig(cfg: Config): void {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

// ── Agent info loading ───────────────────────────────────────────────

interface AgentInfo {
  mode: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
  location: "bundled" | "user";
  path: string;
  hasSkills: boolean;
  skillCount: number;
  hasHeartbeat: boolean;
  heartbeatEnabled: boolean;
}

function loadAgentInfo(agentPath: string, location: "bundled" | "user"): AgentInfo | null {
  const soulPath = path.join(agentPath, "SOUL.md");
  if (!fs.existsSync(soulPath)) return null;

  const mode = path.basename(agentPath);
  let name = mode;
  let icon = "🤖";
  let description = "";
  let tags: string[] = [];

  // Parse IDENTITY.md
  const identityPath = path.join(agentPath, "IDENTITY.md");
  if (fs.existsSync(identityPath)) {
    const content = fs.readFileSync(identityPath, "utf-8");
    const nameMatch = content.match(/\*\*Name\*\*:\s*(.+)/);
    if (nameMatch) name = nameMatch[1].trim();
    const iconMatch = content.match(/\*\*Icon\*\*:\s*(.+)/);
    if (iconMatch) icon = iconMatch[1].trim();
    const descMatch = content.match(/## What I am\s*\n+(.+?)(?:\n\n|##|$)/s);
    if (descMatch) description = descMatch[1].trim().split("\n")[0];
    const tagsMatch = content.match(/## Tags\s*\n+(.+?)(?:\n\n|##|$)/s);
    if (tagsMatch) tags = tagsMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
  }

  // Skills
  const skillsDir = path.join(agentPath, "skills");
  let skillCount = 0;
  if (fs.existsSync(skillsDir)) {
    skillCount = fs
      .readdirSync(skillsDir)
      .filter((d) => fs.existsSync(path.join(skillsDir, d, "SKILL.md"))).length;
  }

  // Heartbeat
  const hbPath = path.join(agentPath, "HEARTBEAT.md");
  let hasHeartbeat = false;
  let heartbeatEnabled = false;
  if (fs.existsSync(hbPath)) {
    hasHeartbeat = true;
    const content = fs.readFileSync(hbPath, "utf-8");
    const match = content.match(/^---[\s\S]*?enabled:\s*(true|false)[\s\S]*?---/);
    heartbeatEnabled = match?.[1] === "true";
  }

  return {
    mode,
    name,
    icon,
    description,
    tags,
    location,
    path: agentPath,
    hasSkills: skillCount > 0,
    skillCount,
    hasHeartbeat,
    heartbeatEnabled,
  };
}

function listBundledAgents(): AgentInfo[] {
  if (!fs.existsSync(BUNDLED_AGENTS_DIR)) return [];
  return fs
    .readdirSync(BUNDLED_AGENTS_DIR)
    .filter((e) => fs.statSync(path.join(BUNDLED_AGENTS_DIR, e)).isDirectory())
    .map((dir) => loadAgentInfo(path.join(BUNDLED_AGENTS_DIR, dir), "bundled"))
    .filter((a): a is AgentInfo => a !== null);
}

function listUserAgents(): AgentInfo[] {
  if (!fs.existsSync(USER_AGENTS_DIR)) return [];
  return fs
    .readdirSync(USER_AGENTS_DIR)
    .filter((e) => fs.statSync(path.join(USER_AGENTS_DIR, e)).isDirectory())
    .map((dir) => loadAgentInfo(path.join(USER_AGENTS_DIR, dir), "user"))
    .filter((a): a is AgentInfo => a !== null);
}

/** Find an agent by mode in user dir first, then bundled */
function resolveAgent(mode: string): AgentInfo | null {
  const userPath = path.join(USER_AGENTS_DIR, mode);
  if (fs.existsSync(path.join(userPath, "SOUL.md"))) {
    return loadAgentInfo(userPath, "user");
  }
  const bundledPath = path.join(BUNDLED_AGENTS_DIR, mode);
  if (fs.existsSync(path.join(bundledPath, "SOUL.md"))) {
    return loadAgentInfo(bundledPath, "bundled");
  }
  return null;
}

// ── Commands ─────────────────────────────────────────────────────────

/** list — installed agents (user dir) */
export function agentList(opts: { json?: boolean; all?: boolean } = {}): void {
  const cfg = readConfig();
  const user = listUserAgents();
  const bundled = opts.all ? listBundledAgents() : [];

  if (opts.json) {
    console.log(JSON.stringify({ installed: user, bundled }, null, 2));
    return;
  }

  console.log("");

  if (user.length === 0 && !opts.all) {
    console.log(c("No agents installed yet.", "yellow"));
    console.log("");
    console.log("  See available agents:    " + c("vesper agent registry", "cyan"));
    console.log("  Install an agent:        " + c("vesper agent install <mode>", "cyan"));
    console.log("");
    return;
  }

  if (user.length > 0) {
    console.log(c("Installed agents:", "bold"));
    for (const a of user) {
      const active = cfg.defaultAgent === a.mode ? c("  ●", "green") : "  ○";
      const hb = a.heartbeatEnabled ? c(" ♥", "red") : "";
      console.log(`${active} ${a.icon}  ${c(a.mode, "cyan")}  ${a.name}${hb}`);
      if (a.description) console.log(`     ${c(a.description, "dim")}`);
    }
  }

  if (opts.all && bundled.length > 0) {
    console.log("");
    console.log(c("Bundled (not installed):", "bold"));
    const userModes = new Set(user.map((a) => a.mode));
    for (const a of bundled) {
      if (userModes.has(a.mode)) continue;
      console.log(`  ○ ${a.icon}  ${c(a.mode, "dim")}  ${c(a.name, "dim")}`);
    }
  }

  console.log("");
}

/** registry — show all bundled + installed */
export function agentRegistry(opts: { json?: boolean; query?: string } = {}): void {
  const bundled = listBundledAgents();
  const user = listUserAgents();
  const all = [...user, ...bundled.filter((b) => !user.find((u) => u.mode === b.mode))];

  let filtered = all;
  if (opts.query) {
    const q = opts.query.toLowerCase();
    filtered = all.filter(
      (a) =>
        a.mode.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log("");
  console.log(c(`Agent registry (${filtered.length} agent${filtered.length !== 1 ? "s" : ""})`, "bold"));
  if (opts.query) console.log(c(`Filter: ${opts.query}`, "dim"));
  console.log("");

  for (const a of filtered) {
    const badge = a.location === "user" ? c("[installed]", "green") : c("[bundled]", "blue");
    const hb = a.heartbeatEnabled ? c(" ♥", "red") : "";
    console.log(`  ${a.icon}  ${c(a.mode, "cyan")}  ${badge}${hb}`);
    console.log(`     ${a.name}`);
    if (a.description) console.log(`     ${c(a.description, "dim")}`);
    if (a.tags.length > 0) console.log(`     ${c(a.tags.slice(0, 5).join(" · "), "dim")}`);
    console.log("");
  }

  if (filtered.length === 0) {
    console.log(c("  No agents match your query.", "yellow"));
  }
}

/** show <mode> — detailed info */
export function agentShow(mode: string): void {
  const agent = resolveAgent(mode);
  if (!agent) {
    console.error(c(`✗ Agent not found: ${mode}`, "red"));
    console.log("  Try: " + c("vesper agent registry", "cyan"));
    process.exit(1);
    return;
  }

  console.log("");
  console.log(`${agent.icon}  ${c(agent.name, "bold")}`);
  console.log(`   ${c("mode:", "dim")} ${agent.mode}`);
  console.log(`   ${c("location:", "dim")} ${agent.location}`);
  console.log(`   ${c("path:", "dim")} ${agent.path}`);
  console.log("");
  if (agent.description) {
    console.log(`   ${agent.description}`);
    console.log("");
  }
  if (agent.tags.length > 0) {
    console.log(`   ${c("tags:", "dim")} ${agent.tags.join(", ")}`);
  }
  console.log(`   ${c("skills:", "dim")} ${agent.skillCount}`);
  if (agent.hasHeartbeat) {
    const status = agent.heartbeatEnabled ? c("enabled ♥", "green") : c("disabled", "dim");
    console.log(`   ${c("heartbeat:", "dim")} ${status}`);
  }
  console.log("");

  // Quick actions
  const cfg = readConfig();
  console.log(c("Quick actions:", "bold"));
  if (agent.location === "bundled") {
    console.log(`  ${c("vesper agent install " + agent.mode, "cyan")}   — copy to ~/.openvesper/agents/`);
  } else {
    if (cfg.defaultAgent !== agent.mode) {
      console.log(`  ${c("vesper agent start " + agent.mode, "cyan")}     — make this the default`);
    }
    console.log(`  ${c("vesper agent uninstall " + agent.mode, "cyan")}   — remove from ~/.openvesper/agents/`);
  }
  console.log(`  ${c('vesper agent run ' + agent.mode + ' "your question"', "cyan")}  — one-off run`);
  console.log("");
}

/** install <mode> — copy bundled agent to user dir */
export function agentInstall(mode: string): void {
  const bundledPath = path.join(BUNDLED_AGENTS_DIR, mode);
  if (!fs.existsSync(path.join(bundledPath, "SOUL.md"))) {
    console.error(c(`✗ Bundled agent not found: ${mode}`, "red"));
    console.log("  Try: " + c("vesper agent registry", "cyan"));
    process.exit(1);
  }

  const userPath = path.join(USER_AGENTS_DIR, mode);
  if (fs.existsSync(userPath)) {
    console.error(c(`✗ Already installed: ${mode}`, "yellow"));
    console.log("  Path: " + userPath);
    console.log("  To reinstall: " + c(`vesper agent uninstall ${mode}`, "cyan") + " first");
    process.exit(1);
  }

  // Recursive copy
  fs.mkdirSync(USER_AGENTS_DIR, { recursive: true, mode: 0o700 });
  copyDir(bundledPath, userPath);

  // Update config
  const cfg = readConfig();
  cfg.installedAgents = cfg.installedAgents || [];
  if (!cfg.installedAgents.includes(mode)) cfg.installedAgents.push(mode);
  writeConfig(cfg);

  console.log("");
  console.log(c(`✓ Installed: ${mode}`, "green"));
  console.log(`  Path: ${userPath}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  ${c('vesper agent run ' + mode + ' "test"', "cyan")}    — quick test`);
  console.log(`  ${c("vesper agent start " + mode, "cyan")}              — set as default`);
  console.log("");
}

/** uninstall <mode> — remove from user dir */
export async function agentUninstall(mode: string): Promise<void> {
  const userPath = path.join(USER_AGENTS_DIR, mode);
  if (!fs.existsSync(userPath)) {
    console.error(c(`✗ Not installed: ${mode}`, "yellow"));
    process.exit(1);
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(c(`Remove ${mode} from ${userPath}? [y/N] `, "yellow"));
  rl.close();

  if (answer.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  fs.rmSync(userPath, { recursive: true, force: true });

  // Update config
  const cfg = readConfig();
  cfg.installedAgents = (cfg.installedAgents || []).filter((m) => m !== mode);
  if (cfg.defaultAgent === mode) cfg.defaultAgent = undefined;
  writeConfig(cfg);

  console.log(c(`✓ Uninstalled: ${mode}`, "green"));
}

/** start <mode> — set as default agent */
export function agentStart(mode: string): void {
  const agent = resolveAgent(mode);
  if (!agent) {
    console.error(c(`✗ Agent not found: ${mode}`, "red"));
    console.log("  Install first: " + c(`vesper agent install ${mode}`, "cyan"));
    process.exit(1);
    return;
  }

  const cfg = readConfig();
  cfg.defaultAgent = agent.mode;
  writeConfig(cfg);

  console.log("");
  console.log(`${agent.icon}  ${c("Started:", "green")} ${c(agent.mode, "cyan")}  ${agent.name}`);
  console.log(`   Now the default agent for all queries.`);
  console.log("");
  console.log(`  Run a query:  ${c('vesper -q "your question"', "cyan")}`);
  console.log(`  Switch back:  ${c("vesper agent stop", "cyan")}`);
  console.log("");
}

/** stop — revert to "auto" agent */
export function agentStop(): void {
  const cfg = readConfig();
  const prev = cfg.defaultAgent;
  cfg.defaultAgent = undefined;
  writeConfig(cfg);

  if (prev) {
    console.log(c(`✓ Stopped: ${prev}`, "green"));
    console.log(`  Reverted to default "auto" agent.`);
  } else {
    console.log("No active agent to stop. Already using default.");
  }
}

/** run <mode> "<message>" — one-off run */
export async function agentRun(mode: string, message: string): Promise<void> {
  const agent = resolveAgent(mode);
  if (!agent) {
    console.error(c(`✗ Agent not found: ${mode}`, "red"));
    console.log("  Install first: " + c(`vesper agent install ${mode}`, "cyan"));
    process.exit(1);
    return;
  }

  console.log(`${agent.icon}  ${c(agent.mode, "cyan")}: ${message}`);
  console.log("");

  // Dynamic import of core to avoid circular dep
  try {
    const { createVesper } = (await import("@openvesper/core")) as {
      createVesper: (opts: unknown) => unknown;
    };
    const v = createVesper({ autoLoad: true }) as {
      useAgentDirectory: (dir: string) => unknown;
      run: (opts: { agent?: string; message: string }) => Promise<string>;
    };

    // Load from agent's actual location
    const agentDir = path.dirname(agent.path);
    try {
      v.useAgentDirectory(agentDir);
    } catch {
      // ignore
    }

    const reply = await v.run({ agent: agent.mode, message });
    console.log(reply);
    console.log("");
  } catch (err) {
    console.error(c("✗ Runtime error: " + (err instanceof Error ? err.message : err), "red"));
    process.exit(1);
  }
}

/** search <query> — alias for registry --query */
export function agentSearch(query: string): void {
  agentRegistry({ query });
}

/** create <mode> — scaffold new agent */
export function agentCreate(mode: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(mode)) {
    console.error(c("✗ Invalid mode name. Use lowercase letters, numbers, dashes.", "red"));
    process.exit(1);
  }

  const targetPath = path.join(USER_AGENTS_DIR, mode);
  if (fs.existsSync(targetPath)) {
    console.error(c(`✗ Already exists: ${targetPath}`, "yellow"));
    process.exit(1);
  }

  fs.mkdirSync(targetPath, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.join(targetPath, "skills"), { recursive: true });
  fs.mkdirSync(path.join(targetPath, "memory"), { recursive: true });

  // SOUL.md template
  fs.writeFileSync(
    path.join(targetPath, "SOUL.md"),
    `# ${mode}\n\nWho I am, how I think, and what I refuse to do.\n\n## Persona\n\nI am ${mode} — describe your agent's character here.\n\n## Voice\n\nDirect, helpful, concise.\n\n## Refusals\n\n- I do not ask for wallet private keys or seed phrases.\n- I do not execute transactions or move funds.\n`
  );

  // IDENTITY.md template
  fs.writeFileSync(
    path.join(targetPath, "IDENTITY.md"),
    `# Identity\n\n- **Name**: ${mode}\n- **Mode**: \`${mode}\`\n- **Icon**: 🤖\n- **Version**: 1.0.0\n\n## What I am\n\nDescribe what this agent does in one line.\n\n## Tags\n\ntag1, tag2, tag3\n\n## Recommended LLM\n\n- **Anthropic** Claude\n- **Groq** for speed\n`
  );

  // USER.md template
  fs.writeFileSync(
    path.join(targetPath, "USER.md"),
    `# About the user\n\nWhat I should know about who I'm talking to.\n\n(Edit this with details about yourself or your team.)\n`
  );

  // TOOLS.md template
  fs.writeFileSync(
    path.join(targetPath, "TOOLS.md"),
    `# Tools\n\n## Access policy\n\nFull cross-plugin access by default. List the plugins I typically use here.\n\n## Primary tools\n\n- list the tools this agent reaches for\n\n## Out of scope\n\nUse this section to list tools this agent should NOT reach for — for example, signing tools if this agent is read-only, or external posting tools if this agent should stay local.\n`
  );

  // HEARTBEAT.md template (disabled by default)
  fs.writeFileSync(
    path.join(targetPath, "HEARTBEAT.md"),
    `---\nschedule: "0 9 * * *"\nenabled: false\n---\n\n# Heartbeat — ${mode}\n\nA short checklist this agent reviews on scheduled heartbeats.\n\nDisabled by default. Set "enabled: true" to activate.\n\n## Recurring task\n\n- [ ] Add your recurring task here\n`
  );

  // MEMORY.md template
  fs.writeFileSync(
    path.join(targetPath, "MEMORY.md"),
    `# Memory\n\n(This file is rewritten by the runtime when memory is enabled.\nDefault: disabled.)\n`
  );

  console.log("");
  console.log(c(`✓ Created agent: ${mode}`, "green"));
  console.log(`  Path: ${targetPath}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Edit ${c("SOUL.md", "cyan")} to describe your agent's persona`);
  console.log(`  2. Edit ${c("IDENTITY.md", "cyan")} to set name, icon, tags`);
  console.log(`  3. Test:  ${c(`vesper agent run ${mode} "hello"`, "cyan")}`);
  console.log("");
}

// ── Utilities ────────────────────────────────────────────────────────

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true, mode: 0o700 });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}
