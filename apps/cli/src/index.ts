#!/usr/bin/env node
// ============================================================
// 🌒 OpenVesper CLI
// 51 plugins, 26 agents, 15 LLM providers
// ============================================================

import "dotenv/config";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { program } from "commander";
import { createVesper, PROVIDER_INFO, getProvider, ProviderName } from "@openvesper/core";

// Read CLI version from package.json (single source of truth)
const __cli_filename = fileURLToPath(import.meta.url);
const __cli_dirname = path.dirname(__cli_filename);
let CLI_VERSION = "unknown";
try {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__cli_dirname, "..", "package.json"), "utf-8")
  );
  CLI_VERSION = String(pkg.version || "unknown");
} catch {
  // version stays "unknown"
}

// All built-in plugins
import bagsfmPlugin from "@openvesper/plugin-bagsfm";
import pumpfunPlugin from "@openvesper/plugin-pumpfun";
import solanaPlugin from "@openvesper/plugin-solana";
import solanaDevPlugin from "@openvesper/plugin-solana-dev";
import baseMemePlugin from "@openvesper/plugin-base-meme";
import cryptoPlugin from "@openvesper/plugin-crypto";
import strategiesPlugin from "@openvesper/plugin-strategies";
import securityPlugin from "@openvesper/plugin-security";
import researchPlugin from "@openvesper/plugin-research";
import defiPlugin from "@openvesper/plugin-defi";
import twitterPlugin from "@openvesper/plugin-twitter";
import onchainPlugin from "@openvesper/plugin-onchain";
import whalePlugin from "@openvesper/plugin-whale";
import githubPlugin from "@openvesper/plugin-github";
import telegramPlugin from "@openvesper/plugin-telegram";
import macroPlugin from "@openvesper/plugin-macro";
import derivativesPlugin from "@openvesper/plugin-derivatives";
import airdropPlugin from "@openvesper/plugin-airdrop";
import memescanPlugin from "@openvesper/plugin-memescan";
import skillWorkshopPlugin from "@openvesper/plugin-skill-workshop";

// Display
const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  white: (s: string) => `\x1b[37m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  purple: (s: string) => `\x1b[35m${s}${RESET}`,
};

function banner() {
  console.log(c.cyan(c.bold(`
   ____                    _____      _                    
  / __ \\___  ___ ___      /__   \\__ _| | ___  _ __  ___    
 | |  | |  \\/ -_) _ \\ _____ / /\\/ _\` | |/ _ \\| '_ \\/ __|   
 | |__| |   |\\___|  ./|_____/ /\\| (_| | | (_) | | | \\__ \\   
  \\____/|_|        |_|       \\/  \\__,_|_|\\___/|_| |_|___/   
`)));
  console.log(c.dim("       Open-source AI agent framework • Crypto-first • Multi-LLM\n"));
}

program.name("vesper").description("🌒 OpenVesper CLI").version(CLI_VERSION)
  .option("-a, --agent <mode>", "Agent mode", "auto")
  .option("-p, --provider <provider>", "LLM provider")
  .option("--model <model>", "Model name")
  .option("-q, --query <query>", "Single query mode")
  .option("--list-providers", "List LLM providers")
  .option("--list-agents", "List agents")
  .option("--list-tools", "List tools")
  .option("--list-skills", "List markdown skills")
  .option("--validate", "Validate all agents (check tool + skill references)");

// ── Subcommand routing (before .parse()) ────────────────────
// Routes: vesper <command> <subcommand> ...
async function routeSubcommands(): Promise<boolean> {
  const args = process.argv.slice(2);
  if (args.length === 0) return false;

  const cmd = args[0];
  const sub = args[1];
  const rest = args.slice(2);

  // vesper doctor
  if (cmd === "doctor") {
    const { runDoctor } = await import("./commands/doctor.js");
    runDoctor({ fix: rest.includes("--fix") });
    return true;
  }

  // vesper onboard
  if (cmd === "onboard") {
    const { runOnboard } = await import("./commands/onboard.js");
    const providerIdx = rest.indexOf("--provider");
    const providerArg = providerIdx >= 0 && rest[providerIdx + 1] ? rest[providerIdx + 1] : undefined;
    await runOnboard({
      skipTest: rest.includes("--skip-test"),
      provider: providerArg,
    });
    return true;
  }

  // vesper init <template>
  if (cmd === "init") {
    const { initTemplate, listTemplates } = await import("./commands/init.js");
    if (!sub) {
      listTemplates();
      return true;
    }
    initTemplate(sub, { force: rest.includes("--force") });
    return true;
  }

  // vesper repl
  if (cmd === "repl") {
    const { runRepl } = await import("./commands/repl.js");
    const aIdx = rest.indexOf("--agent");
    const pIdx = rest.indexOf("--provider");
    const mIdx = rest.indexOf("--model");
    await runRepl({
      agent: aIdx >= 0 ? rest[aIdx + 1] : undefined,
      provider: pIdx >= 0 ? rest[pIdx + 1] : undefined,
      model: mIdx >= 0 ? rest[mIdx + 1] : undefined,
    });
    return true;
  }

  // vesper monitor
  if (cmd === "monitor") {
    const { runMonitor } = await import("./commands/monitor.js");
    await runMonitor();
    return true;
  }

  // vesper migrate [--dry-run]
  if (cmd === "migrate") {
    const { runMigrate } = await import("./commands/migrate.js");
    // --dry-run may land in sub or rest depending on arg parsing
    const dryRun = sub === "--dry-run" || rest.includes("--dry-run");
    await runMigrate({ dryRun });
    return true;
  }

  // vesper update [--force] [--channel stable|dev]
  if (cmd === "update") {
    const { runUpdate } = await import("./commands/lifecycle.js");
    const cIdx = rest.indexOf("--channel");
    const channel = cIdx >= 0 ? rest[cIdx + 1] : undefined;
    await runUpdate({ force: rest.includes("--force"), channel });
    return true;
  }

  // vesper uninstall [--purge] [--yes]
  if (cmd === "uninstall") {
    const { runUninstall } = await import("./commands/lifecycle.js");
    await runUninstall({
      purge: rest.includes("--purge") || sub === "--purge",
      yes: rest.includes("--yes") || rest.includes("-y") || sub === "--yes" || sub === "-y",
    });
    return true;
  }

  // vesper secret <backend|list|get|set|rm>
  if (cmd === "secret" && sub) {
    const mod = await import("./commands/secret.js");
    if (sub === "backend") {
      await mod.secretBackend();
      return true;
    }
    if (sub === "list" || sub === "ls") {
      await mod.secretList();
      return true;
    }
    if (sub === "get") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper secret get <NAME>");
        process.exit(1);
      }
      await mod.secretGet(name);
      return true;
    }
    if (sub === "set") {
      const name = rest[0];
      const value = rest[1];
      if (!name) {
        console.error("Usage: vesper secret set <NAME> [value]");
        console.error("  If value is omitted, you'll be prompted.");
        process.exit(1);
      }
      await mod.secretSet(name, value);
      return true;
    }
    if (sub === "rm" || sub === "delete") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper secret rm <NAME>");
        process.exit(1);
      }
      await mod.secretRm(name);
      return true;
    }
    console.error("Unknown secret subcommand: " + sub);
    console.error("Available: backend, list, get, set, rm");
    process.exit(1);
  }

  // vesper workspace init
  if (cmd === "workspace") {
    const { initWorkspace } = await import("./commands/workspace.js");
    if (sub === "init") {
      initWorkspace({ force: rest.includes("--force") });
      return true;
    }
    console.error("Unknown workspace subcommand: " + sub);
    console.error("Available: init");
    process.exit(1);
  }

  // vesper memory <stats|compact|write|list|search|delete|clear>
  if (cmd === "memory") {
    const wsmod = await import("./commands/workspace.js");
    if (sub === "stats") {
      wsmod.memoryStats();
      return true;
    }
    if (sub === "compact") {
      wsmod.memoryCompact();
      return true;
    }
    const memMod = await import("./commands/memory.js");
    if (sub === "write" || sub === "add") {
      const agent = rest[0];
      const content = rest.slice(1).join(" ").replace(/^["']|["']$/g, "");
      if (!agent || !content) {
        console.error('Usage: vesper memory write <agent> "<content>" [--tag X --ttl-hours N]');
        process.exit(1);
      }
      const tagIdx = rest.indexOf("--tag");
      const ttlIdx = rest.indexOf("--ttl-hours");
      const tags = tagIdx >= 0 ? rest[tagIdx + 1].split(",") : undefined;
      const ttlHours = ttlIdx >= 0 ? parseInt(rest[ttlIdx + 1] || "0", 10) : undefined;
      // Strip the flag pairs from content
      const contentClean = rest
        .slice(1)
        .filter((arg, i, arr) => {
          if (arg.startsWith("--")) return false;
          if (i > 0 && arr[i - 1].startsWith("--")) return false;
          return true;
        })
        .join(" ")
        .replace(/^["']|["']$/g, "");
      memMod.memoryWrite(agent, contentClean, { tags, ttlHours });
      return true;
    }
    if (sub === "list" || sub === "ls") {
      const agent = rest[0];
      if (!agent) { console.error("Usage: vesper memory list <agent> [--tag X]"); process.exit(1); }
      const tagIdx = rest.indexOf("--tag");
      const tag = tagIdx >= 0 ? rest[tagIdx + 1] : undefined;
      const json = rest.includes("--json");
      memMod.memoryList(agent, { tag, json });
      return true;
    }
    if (sub === "search") {
      const agent = rest[0];
      const query = rest.slice(1).filter((r) => !r.startsWith("--")).join(" ").replace(/^["']|["']$/g, "");
      if (!agent || !query) {
        console.error('Usage: vesper memory search <agent> "<query>"');
        process.exit(1);
      }
      memMod.memorySearch(agent, query);
      return true;
    }
    if (sub === "delete" || sub === "rm") {
      const agent = rest[0];
      const id = rest[1];
      if (!agent || !id) { console.error("Usage: vesper memory delete <agent> <id>"); process.exit(1); }
      memMod.memoryDelete(agent, id);
      return true;
    }
    if (sub === "clear") {
      const agent = rest[0];
      if (!agent) { console.error("Usage: vesper memory clear <agent>"); process.exit(1); }
      memMod.memoryClear(agent);
      return true;
    }
    console.error("Unknown memory subcommand: " + sub);
    console.error("Available: stats, compact, write, list, search, delete, clear");
    process.exit(1);
  }

  // vesper agent <list|registry|show|install|uninstall|start|stop|run|search|create>
  if (cmd === "agent" && sub && !sub.startsWith("--")) {
    const mod = await import("./commands/agent.js");

    if (sub === "list" || sub === "ls") {
      const json = rest.includes("--json");
      const all = rest.includes("--all") || rest.includes("-a");
      mod.agentList({ json, all });
      return true;
    }
    if (sub === "registry") {
      const json = rest.includes("--json");
      const qIdx = rest.indexOf("--query");
      const query = qIdx >= 0 ? rest[qIdx + 1] : undefined;
      mod.agentRegistry({ json, query });
      return true;
    }
    if (sub === "show" || sub === "info") {
      const mode = rest[0];
      if (!mode) { console.error("Usage: vesper agent show <mode>"); process.exit(1); }
      mod.agentShow(mode);
      return true;
    }
    if (sub === "install" || sub === "add") {
      const mode = rest[0];
      if (!mode) { console.error("Usage: vesper agent install <mode>"); process.exit(1); }
      mod.agentInstall(mode);
      return true;
    }
    if (sub === "uninstall" || sub === "remove" || sub === "rm") {
      const mode = rest[0];
      if (!mode) { console.error("Usage: vesper agent uninstall <mode>"); process.exit(1); }
      await mod.agentUninstall(mode);
      return true;
    }
    if (sub === "start" || sub === "use") {
      const mode = rest[0];
      if (!mode) { console.error("Usage: vesper agent start <mode>"); process.exit(1); }
      mod.agentStart(mode);
      return true;
    }
    if (sub === "stop") {
      mod.agentStop();
      return true;
    }
    if (sub === "run") {
      const mode = rest[0];
      const message = rest.slice(1).join(" ").replace(/^["']|["']$/g, "");
      if (!mode || !message) {
        console.error('Usage: vesper agent run <mode> "<message>"');
        process.exit(1);
      }
      await mod.agentRun(mode, message);
      return true;
    }
    if (sub === "search") {
      const query = rest.join(" ");
      if (!query) { console.error("Usage: vesper agent search <query>"); process.exit(1); }
      mod.agentSearch(query);
      return true;
    }
    if (sub === "create") {
      const mode = rest[0];
      if (!mode) { console.error("Usage: vesper agent create <mode>"); process.exit(1); }
      mod.agentCreate(mode);
      return true;
    }

    console.error(`Unknown agent subcommand: ${sub}`);
    console.error("Available: list, registry, show, install, uninstall, start, stop, run, search, create");
    process.exit(1);
  }

  // vesper cron <list|add|remove|toggle|run|status>
  if (cmd === "cron" && sub) {
    const mod = await import("./commands/cron.js");
    if (sub === "list") {
      mod.listJobs({ json: rest.includes("--json") });
      return true;
    }
    if (sub === "status") {
      mod.cronStatus();
      return true;
    }
    if (sub === "add") {
      // Parse --key value pairs
      const args: Record<string, string> = {};
      for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith("--")) {
          args[rest[i].slice(2)] = rest[i + 1] || "";
          i++;
        } else if (!args.id) {
          args.id = rest[i];
        }
      }
      mod.addJob(args);
      return true;
    }
    if (sub === "remove" || sub === "rm") {
      const id = rest[0];
      if (!id) { console.error("Usage: vesper cron remove <id>"); process.exit(1); }
      mod.removeJob(id);
      return true;
    }
    if (sub === "toggle") {
      const id = rest[0];
      if (!id) { console.error("Usage: vesper cron toggle <id>"); process.exit(1); }
      mod.toggleJob(id);
      return true;
    }
    if (sub === "run") {
      const id = rest[0];
      if (!id) { console.error("Usage: vesper cron run <id>"); process.exit(1); }
      await mod.runJobNow(id);
      return true;
    }
    console.error("Unknown cron subcommand: " + sub);
    console.error("Available: list, add, remove, toggle, run, status");
    process.exit(1);
  }

  // vesper gateway <start|stop|status|logs>
  if (cmd === "gateway" && sub) {
    const mod = await import("./commands/gateway.js");
    if (sub === "start") {
      const detach = rest.includes("-d") || rest.includes("--detach");
      await mod.gatewayStart({ detach });
      return true;
    }
    if (sub === "stop") {
      await mod.gatewayStop();
      return true;
    }
    if (sub === "status") {
      await mod.gatewayStatus();
      return true;
    }
    if (sub === "logs") {
      const lIdx = rest.indexOf("--lines");
      const lines = lIdx >= 0 ? parseInt(rest[lIdx + 1] || "50", 10) : 50;
      mod.gatewayLogs({ lines });
      return true;
    }
    if (sub === "install-daemon") {
      await mod.gatewayInstallDaemon({ quiet: rest.includes("--quiet") });
      return true;
    }
    if (sub === "uninstall-daemon") {
      await mod.gatewayUninstallDaemon({ quiet: rest.includes("--quiet") });
      return true;
    }
    console.error("Unknown gateway subcommand: " + sub);
    console.error("Available: start [-d], stop, status, logs [--lines N], install-daemon, uninstall-daemon");
    process.exit(1);
  }

  // vesper oauth <login|list|logout>
  if (cmd === "oauth" && sub) {
    const mod = await import("./commands/oauth.js");
    if (sub === "login") {
      const provider = rest[0];
      if (!provider) {
        console.error("Usage: vesper oauth login <provider> --client-id <id> [--client-secret <s>]");
        process.exit(1);
      }
      const cidIdx = rest.indexOf("--client-id");
      const csIdx = rest.indexOf("--client-secret");
      const scopesIdx = rest.indexOf("--scopes");
      await mod.oauthLogin(provider, {
        clientId: cidIdx >= 0 ? rest[cidIdx + 1] : undefined,
        clientSecret: csIdx >= 0 ? rest[csIdx + 1] : undefined,
        scopes: scopesIdx >= 0 ? rest[scopesIdx + 1].split(",") : undefined,
      });
      return true;
    }
    if (sub === "list" || sub === "ls") {
      mod.oauthList();
      return true;
    }
    if (sub === "logout") {
      const provider = rest[0];
      if (!provider) {
        console.error("Usage: vesper oauth logout <provider>");
        process.exit(1);
      }
      mod.oauthLogout(provider);
      return true;
    }
    console.error("Unknown oauth subcommand: " + sub);
    console.error("Available: login, list, logout");
    process.exit(1);
  }

  // vesper plugin <list|info|install|uninstall|search>
  if (cmd === "plugin" && sub) {
    const mod = await import("./commands/plugin.js");
    if (sub === "list" || sub === "ls") {
      const json = rest.includes("--json");
      const all = rest.includes("--all") || rest.includes("-a");
      mod.pluginList({ json, all });
      return true;
    }
    if (sub === "info" || sub === "show") {
      const name = rest[0];
      if (!name) { console.error("Usage: vesper plugin info <name>"); process.exit(1); }
      mod.pluginInfo(name);
      return true;
    }
    if (sub === "install" || sub === "add") {
      const source = rest[0];
      if (!source) { console.error("Usage: vesper plugin install <path-to-plugin-dir>"); process.exit(1); }
      await mod.pluginInstall(source);
      return true;
    }
    if (sub === "uninstall" || sub === "remove" || sub === "rm") {
      const name = rest[0];
      if (!name) { console.error("Usage: vesper plugin uninstall <name>"); process.exit(1); }
      await mod.pluginUninstall(name);
      return true;
    }
    if (sub === "search") {
      const query = rest.join(" ");
      if (!query) { console.error("Usage: vesper plugin search <query>"); process.exit(1); }
      mod.pluginSearch(query);
      return true;
    }
    if (sub === "scaffold") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper plugin scaffold <name>");
        process.exit(1);
      }
      mod.pluginScaffold(name);
      return true;
    }
    console.error("Unknown plugin subcommand: " + sub);
    console.error("Available: list, info, install, uninstall, search, scaffold");
    process.exit(1);
  }

  // vesper pairing <list|pending|approved|approve|approve-direct|deny|revoke>
  if (cmd === "pairing" && sub) {
    const mod = await import("./commands/pairing.js");
    if (sub === "list") {
      await mod.pairingList(rest[0]);
      return true;
    }
    if (sub === "pending") {
      await mod.pairingPending(rest[0]);
      return true;
    }
    if (sub === "approved") {
      await mod.pairingApproved(rest[0]);
      return true;
    }
    if (sub === "approve") {
      const [channel, code] = rest;
      if (!channel || !code) {
        console.error("Usage: vesper pairing approve <channel> <code>");
        process.exit(1);
      }
      await mod.pairingApproveCode(channel, code);
      return true;
    }
    if (sub === "approve-direct") {
      const [channel, identity] = rest;
      if (!channel || !identity) {
        console.error("Usage: vesper pairing approve-direct <channel> <identity>");
        process.exit(1);
      }
      await mod.pairingApproveDirect(channel, identity);
      return true;
    }
    if (sub === "deny") {
      const [channel, identity] = rest;
      if (!channel || !identity) {
        console.error("Usage: vesper pairing deny <channel> <identity>");
        process.exit(1);
      }
      await mod.pairingDeny(channel, identity);
      return true;
    }
    if (sub === "revoke") {
      const [channel, identity] = rest;
      if (!channel || !identity) {
        console.error("Usage: vesper pairing revoke <channel> <identity>");
        process.exit(1);
      }
      await mod.pairingRevoke(channel, identity);
      return true;
    }
    console.error("Unknown pairing subcommand: " + sub);
    console.error("Available: list, pending, approved, approve, approve-direct, deny, revoke");
    process.exit(1);
  }

  // vesper skill <list|info|install>  (legacy singular)
  if (cmd === "skill" && sub) {
    const mod = await import("./commands/skill.js");
    if (sub === "list") {
      const json = rest.includes("--json");
      const sIdx = rest.indexOf("--source");
      const source = sIdx >= 0 ? rest[sIdx + 1] : undefined;
      mod.listSkills({ json, source });
      return true;
    }
    if (sub === "info") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper skill info <name>");
        process.exit(1);
      }
      mod.skillInfo(name);
      return true;
    }
    if (sub === "install") {
      const source = rest[0];
      if (!source) {
        console.error("Usage: vesper skill install <source>");
        console.error("Source: github:user/repo, npm:package, or /local/path");
        process.exit(1);
      }
      const dIdx = rest.indexOf("--dest");
      const dest = dIdx >= 0 ? rest[dIdx + 1] : undefined;
      await mod.installSkill(source, { dest });
      return true;
    }
  }

  // vesper skills <list|info|install|update|uninstall|sources>   (preferred plural)
  if (cmd === "skills" && sub) {
    const mod = await import("./commands/skills.js");
    if (sub === "list" || sub === "ls") {
      mod.skillsList({ all: rest.includes("--all") });
      return true;
    }
    if (sub === "info") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper skills info <name>");
        process.exit(1);
      }
      mod.skillsInfo(name);
      return true;
    }
    if (sub === "sources") {
      mod.skillsSources();
      return true;
    }
    if (sub === "install") {
      const source = rest[0];
      if (!source) {
        console.error("Usage: vesper skills install <git:owner/repo | ./path | https://...> [--as name] [--global]");
        process.exit(1);
      }
      const aIdx = rest.indexOf("--as");
      const asName = aIdx >= 0 ? rest[aIdx + 1] : undefined;
      const global = rest.includes("--global");
      await mod.skillsInstall(source, { as: asName, global });
      return true;
    }
    if (sub === "update") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper skills update <name>");
        process.exit(1);
      }
      await mod.skillsUpdate(name);
      return true;
    }
    if (sub === "uninstall" || sub === "remove" || sub === "rm") {
      const name = rest[0];
      if (!name) {
        console.error("Usage: vesper skills uninstall <name>");
        process.exit(1);
      }
      mod.skillsUninstall(name);
      return true;
    }
    console.error(`Unknown skills subcommand: ${sub}`);
    console.error("Available: list, info, sources, install, update, uninstall");
    process.exit(1);
  }

  return false; // Not handled — fall through to legacy options
}

// Run subcommand routing first; if not matched, fall through to main()
const subcommandHandled = await routeSubcommands();
if (subcommandHandled) {
  process.exit(0);
}

program.parse(process.argv);

const opts = program.opts();

// Permission handler for "ask" prompts
async function permissionHandler(req: { toolName: string; level: string; input?: Record<string, unknown> }): Promise<boolean> {
  console.log("\n" + c.amber(`  ⚠ Tool '${req.toolName}' wants to execute (${req.level} permission)`));
  console.log(c.dim(`    Input: ${JSON.stringify(req.input).slice(0, 100)}`));
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(c.amber("    Approve? [y/N] "), (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "y");
    });
  });
}

// Build Vesper
const vesper = createVesper({
  llm: { provider: opts.provider as ProviderName, model: opts.model },
  permissions: { handler: permissionHandler as any },
})
  .use(bagsfmPlugin).use(pumpfunPlugin).use(solanaPlugin).use(solanaDevPlugin).use(baseMemePlugin)
  .use(cryptoPlugin).use(strategiesPlugin).use(securityPlugin).use(researchPlugin)
  .use(defiPlugin).use(twitterPlugin).use(onchainPlugin).use(whalePlugin).use(githubPlugin)
  .use(telegramPlugin).use(macroPlugin).use(derivativesPlugin).use(airdropPlugin).use(memescanPlugin)
  .use(skillWorkshopPlugin);


// Validation
if (opts.validate) {
  const result = vesper.validateAll();
  console.log("\n  🌒 Agent Validation\n");
  console.log(`  Total agents: ${c.cyan(String(result.agents))}`);
  console.log(`  Valid:        ${c.green(String(result.valid))}`);
  console.log(`  With issues:  ${result.invalid.length > 0 ? c.amber(String(result.invalid.length)) : c.green("0")}`);
  if (result.invalid.length) {
    console.log("\n  " + c.bold("Issues:"));
    for (const inv of result.invalid) {
      console.log("\n  " + c.amber("⚠ " + inv.agent));
      if (inv.missingTools.length) {
        console.log(c.dim(`    Missing tools:  ${inv.missingTools.join(", ")}`));
      }
      if (inv.missingSkills.length) {
        console.log(c.dim(`    Missing skills: ${inv.missingSkills.join(", ")}`));
      }
    }
  } else {
    console.log("\n  " + c.green("  ✓ All agents validated"));
  }
  console.log();
  process.exit(result.invalid.length > 0 ? 1 : 0);
}

if (opts.listSkills) {
  const skills = vesper.listSkills();
  console.log("\n  🌒 Skills (" + skills.length + " total):\n");
  for (const s of skills) {
    console.log(`  ${c.cyan(s.id.padEnd(40))} ${c.dim(s.description.slice(0, 60))}`);
  }
  console.log();
  process.exit(0);
}

// Info commands
if (opts.listProviders) {
  console.log("\n  🌒 LLM Providers:\n");
  (Object.keys(PROVIDER_INFO) as ProviderName[]).forEach((p) => {
    const info = PROVIDER_INFO[p];
    const available = getProvider(p).isAvailable();
    console.log(`  ${available ? c.green("●") : c.dim("○")} ${c.cyan(p.padEnd(12))} ${c.white(info.name.padEnd(30))} ${c.dim(info.pricing)}`);
    if (!available) console.log(`     ${c.dim("→ " + info.envKey)}`);
  });
  console.log();
  process.exit(0);
}

if (opts.listAgents) {
  console.log("\n  🌒 Available Agents (" + vesper.listAgents().length + "):\n");
  for (const agent of vesper.listAgents()) {
    console.log(`  ${agent.icon || "🛸"} ${c.cyan(agent.mode.padEnd(14))} ${c.white(agent.name || "")}`);
  }
  console.log();
  process.exit(0);
}

if (opts.listTools) {
  console.log("\n  🌒 Tools (" + vesper.listTools().length + " total):\n");
  for (const tool of vesper.listTools()) {
    console.log(`  ${c.cyan(tool.name.padEnd(28))} ${c.dim(tool.description.slice(0, 60))}`);
  }
  console.log();
  process.exit(0);
}

// Check provider availability
const llm = vesper.getDefaultLLM();
const llmProvider = getProvider(llm.provider);
if (!llmProvider.isAvailable()) {
  console.error("\n" + c.red(`  ✗ Provider ${llm.provider} not configured.\n`));
  console.log(c.dim("  Set one in .env:\n"));
  console.log(c.amber("    ANTHROPIC_API_KEY    (Claude — best)"));
  console.log(c.amber("    GEMINI_API_KEY       (free)"));
  console.log(c.amber("    GROQ_API_KEY         (free + fast)"));
  console.log(c.amber("    DEEPSEEK_API_KEY     (cheap)"));
  console.log(c.dim("\n  Or run 'vesper --list-providers' for all options\n"));
  process.exit(1);
}

const ICONS: Record<string, string> = {
  auto: "🛸", chat: "🤖", research: "🔍", crypto: "📈", trading: "📊",
  bagsfm: "🎒", pumpfun: "🚀", solana: "☀️", soldev: "🛠", base: "🔷",
  defi: "🏦", security: "🛡", onchain: "⛓", whale: "🐋", twitter: "🐦",
  github: "🐙", telegram: "📱", macro: "🔮", derivatives: "📉",
  airdrop: "🪂", memescan: "🐸", quant: "🧮",
};

async function main(): Promise<void> {
  banner();

  // If user didn't explicitly pass -a, check config for an active agent
  // (set via `vesper agent start <mode>`)
  let mode = opts.agent as string;
  const agentFlagGiven = process.argv.some((a) => a === "-a" || a === "--agent");
  if (!agentFlagGiven) {
    try {
      const os = await import("node:os");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const configPath = path.join(os.homedir(), ".openvesper", "config.json");
      if (fs.existsSync(configPath)) {
        const cfg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (cfg.defaultAgent) {
          mode = cfg.defaultAgent;
          console.log(c.dim(`  Active agent: `) + c.cyan(mode) + c.dim(" (from config)"));
        }
      }
    } catch {
      // ignore config read errors
    }
  }

  console.log(c.dim(`  Active LLM: `) + c.cyan(llm.provider) + c.dim(" → ") + c.amber(llm.model || llmProvider.defaultModel));
  console.log(c.dim(`  Plugins:    ${vesper.listPlugins().length}  •  Tools: ${vesper.listTools().length}  •  Agents: ${vesper.listAgents().length}`));
  console.log();

  if (opts.query) {
    await runQuery(mode, opts.query);
    process.exit(0);
  }

  // Show agent grid
  console.log(c.bold(c.white("  🌒 22 Agents:\n")));
  const agents = vesper.listAgents();
  const cols = 2;
  for (let i = 0; i < agents.length; i += cols) {
    const row = agents.slice(i, i + cols);
    const cells = row.map((a) => `${a.icon || "🛸"} ${c.cyan(("@" + a.mode).padEnd(13))} ${c.dim((a.name || a.mode).padEnd(22))}`);
    console.log("  " + cells.join("  "));
  }
  console.log();
  console.log(c.dim("  Commands: ") + c.amber("/llm /agents /tools /providers /skills /perms /clear exit"));
  console.log(c.dim("  Prefix:   ") + c.amber("@bagsfm @solana @trading @twitter @whale @github ..."));
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const ask = (): Promise<string> => new Promise((res) => {
    const icon = ICONS[mode] || "🛸";
    process.stdout.write(c.purple(c.bold(`\n  [${icon} ${mode} | ${vesper.getDefaultLLM().provider}] `)) + c.white("› "));
    rl.once("line", (l) => res(l.trim()));
  });

  while (true) {
    let input: string;
    try { input = await ask(); } catch { break; }
    if (!input) continue;

    if (["exit", "quit", "bye"].includes(input.toLowerCase())) {
      console.log("\n" + c.green("  OpenVesper signing off. 🌒\n"));
      rl.close();
      process.exit(0);
    }

    // Slash commands
    if (input.startsWith("/llm ")) {
      const parts = input.split(/\s+/);
      const newProvider = parts[1] as ProviderName;
      const newModel = parts[2];
      if (!PROVIDER_INFO[newProvider]) {
        console.log(c.red(`  ✗ Unknown provider: ${newProvider}`));
        continue;
      }
      if (!getProvider(newProvider).isAvailable()) {
        console.log(c.red(`  ✗ ${newProvider} not configured. Set ${PROVIDER_INFO[newProvider].envKey}`));
        continue;
      }
      vesper.setLLM(newProvider, newModel);
      console.log(c.green(`  ✓ Now using ${newProvider}${newModel ? " (" + newModel + ")" : ""}`));
      continue;
    }

    if (input === "/agents") {
      console.log("\n  " + c.bold("Agents:"));
      for (const agent of vesper.listAgents()) {
        console.log(`  ${agent.icon || "🛸"} ${c.cyan(("@" + agent.mode).padEnd(14))} ${c.dim(agent.name || agent.mode)}`);
      }
      continue;
    }

    if (input === "/tools") {
      console.log("\n  " + c.bold("Tools (" + vesper.listTools().length + "):"));
      for (const tool of vesper.listTools()) {
        console.log(`  ${c.cyan(tool.name.padEnd(28))}  ${c.dim(tool.description.slice(0, 60))}`);
      }
      continue;
    }

    if (input === "/providers" || input === "/list") {
      (Object.keys(PROVIDER_INFO) as ProviderName[]).forEach((p) => {
        const available = getProvider(p).isAvailable();
        console.log(`  ${available ? c.green("●") : c.dim("○")} ${c.cyan(p.padEnd(12))} ${PROVIDER_INFO[p].name}`);
      });
      continue;
    }

    if (input === "/plugins") {
      console.log("\n  " + c.bold("Plugins (" + vesper.listPlugins().length + "):"));
      for (const p of vesper.listPlugins()) {
        console.log(`  ${c.cyan(p.name)} ${c.dim("v" + p.version)} — ${c.white(p.description || "")}`);
      }
      continue;
    }

    if (input === "/clear") { console.clear(); banner(); continue; }
    if (input === "/help") {
      console.log(c.dim("\n  /llm /agents /tools /plugins /providers /clear /help exit"));
      console.log(c.dim("  Or use @<agent> prefix: @bagsfm find trending tokens"));
      continue;
    }

    // Agent prefix parsing
    let query = input;
    const allModes = vesper.listAgents().map((a) => a.mode).join("|");
    const re = new RegExp(`^@(${allModes})\\s+(.+)`, "i");
    const m = input.match(re);
    if (m) { mode = m[1].toLowerCase(); query = m[2]; }

    await runQuery(mode, query);
  }
}

async function runQuery(mode: string, query: string): Promise<void> {
  console.log("\n" + c.dim("  ────────────────────────────────────────────────"));
  console.log(c.amber("  ◆ ") + c.white(query));
  console.log(c.dim("  ────────────────────────────────────────────────"));

  // Slash command interception — handle locally without LLM call
  if (query.trim().startsWith("/")) {
    const reply = await handleSlashCommand(mode, query.trim());
    if (reply !== null) {
      console.log("\n" + c.white(reply));
      return;
    }
  }

  const spinner = setInterval(() => process.stdout.write(c.dim(".")), 500);
  try {
    const task = vesper.task({ agent: mode === "auto" ? undefined : mode, prompt: query });
    task.on("tool_call", (e: any) => {
      process.stdout.write("\n");
      clearInterval(spinner as any);
      console.log(c.cyan("  ⚙ ") + c.dim(`${e.name}`));
    });
    task.on("tool_result", (e: any) => {
      const status = e.result.success ? c.green("✓") : c.red("✗");
      console.log(`  ${status} ${c.dim(e.name)}`);
    });
    const result = await task.run();
    clearInterval(spinner as any);
    process.stdout.write("\n");
    if (result.output) console.log("\n" + c.white(result.output));
    else if (result.error) console.log("\n" + c.red("  ✗ " + result.error));
    if (result.usage) console.log(c.dim(`\n  Tokens: ${result.usage.totalInputTokens} in / ${result.usage.totalOutputTokens} out`));
  } catch (e: any) {
    clearInterval(spinner as any);
    console.log("\n" + c.red("  ✗ " + e.message));
  }
  console.log(c.dim("  ────────────────────────────────────────────────"));
}

main().catch((e) => { console.error(c.red("\n  ✗ " + e.message + "\n")); process.exit(1); });

/**
 * Handle slash commands locally without going to the LLM.
 * Returns the reply text, or null if not a recognized slash command.
 */
async function handleSlashCommand(mode: string, query: string): Promise<string | null> {
  const parts = query.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "/help":
    case "/?":
      return [
        "🌒 OpenVesper slash commands",
        "",
        "  /new                  — start a fresh session",
        "  /reset                — clear current session",
        "  /status               — show session info",
        "  /agent <mode>         — switch active agent",
        "  /compact [hint]       — summarize old messages",
        "  /stop                 — abort current run",
        "  /help                 — this message",
        "",
        "Note: /agent, /compact, /stop only work when gateway is running.",
        "      Otherwise use: vesper agent start <mode>, vesper gateway start",
      ].join("\n");

    case "/status": {
      // Show local CLI status
      const lines = [
        `🌒 OpenVesper CLI status`,
        ``,
        `  Active agent: ${mode}`,
        `  Plugins:      ${vesper.listPlugins().length}`,
        `  Tools:        ${vesper.listTools().length}`,
        `  Agents:       ${vesper.listAgents().length}`,
      ];

      // Try gateway health check
      try {
        const port = parseInt(process.env.OPENVESPER_GATEWAY_PORT || "18789", 10);
        const r = await fetch(`http://127.0.0.1:${port}/health`).then((r) => (r.ok ? r.json() : null));
        if (r) {
          lines.push(``, `  Gateway:      running (uptime ${Math.floor(r.uptime)}s)`);
        } else {
          lines.push(``, `  Gateway:      not responding`);
        }
      } catch {
        lines.push(``, `  Gateway:      not running`);
      }
      return lines.join("\n");
    }

    case "/agent": {
      const newMode = args[0];
      if (!newMode) return "Usage: /agent <mode>";
      // Persist to config
      const os = await import("node:os");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const configPath = path.join(os.homedir(), ".openvesper", "config.json");
      try {
        const cfg = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf-8")) : {};
        cfg.defaultAgent = newMode;
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
        return `🌒 Default agent → ${newMode}. New queries will route there.`;
      } catch (e: any) {
        return `Failed to switch agent: ${e.message}`;
      }
    }

    case "/new":
    case "/reset":
    case "/compact":
    case "/stop": {
      // These require the gateway. Forward if running, else explain.
      try {
        const port = parseInt(process.env.OPENVESPER_GATEWAY_PORT || "18789", 10);
        const r = await fetch(`http://127.0.0.1:${port}/agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionKey: process.env.USER || "cli",
            message: query,
            channel: "cli",
          }),
        });
        if (r.ok) {
          const data: any = await r.json();
          return data.reply || "(no reply)";
        }
      } catch {
        // gateway down
      }
      return `${cmd} requires the gateway to be running.\n  Start it: vesper gateway start -d`;
    }

    default:
      return null; // not a recognized slash command — fall through to LLM
  }
}
