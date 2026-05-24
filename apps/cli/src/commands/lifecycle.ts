// ============================================================
// 🌒 vesper update / uninstall
// ============================================================
//
// `vesper update` — pulls the latest version from the install repo and
// rebuilds. Refuses if the install dir is not a clean git checkout.
//
// `vesper uninstall` — removes the install dir, the 'vesper' shim, and
// (with --purge) the workspace at ~/.openvesper.
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as readline from "node:readline/promises";

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

/**
 * Find the install dir by walking up from the CLI's own location until we
 * find a directory containing pnpm-workspace.yaml.
 */
function findInstallRoot(): string | null {
  // CLI dist file → apps/cli/dist/index.js → install root is 3 levels up
  const cliFile = fileURLToPath(import.meta.url);
  let dir = path.dirname(cliFile);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function isGitCheckout(dir: string): boolean {
  return fs.existsSync(path.join(dir, ".git"));
}

function gitStatusClean(dir: string): { clean: boolean; output: string } {
  const r = spawnSync("git", ["status", "--porcelain"], {
    cwd: dir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { clean: r.stdout.trim() === "", output: r.stdout };
}

function currentBranch(dir: string): string {
  const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: dir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return r.stdout.trim() || "?";
}

function currentSha(dir: string): string {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: dir,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return r.stdout.trim() || "?";
}

// ── update ─────────────────────────────────────────────────────────

export async function runUpdate(opts: { force?: boolean; channel?: string } = {}): Promise<void> {
  console.log("");
  console.log(c.cyan(c.bold("  🌒 OpenVesper Update")));

  const root = findInstallRoot();
  if (!root) {
    console.error(c.red("\n  ✗ Could not locate the OpenVesper install directory"));
    console.error(c.dim("    (no pnpm-workspace.yaml found walking up from the CLI)\n"));
    process.exit(1);
  }
  console.log(c.dim(`     Install: ${root}`));

  if (!isGitCheckout(root)) {
    console.error(c.red("\n  ✗ Install is not a git checkout — can't pull updates"));
    console.error(c.dim("    For npm/global installs, run: npm install -g openvesper@latest"));
    console.error(c.dim("    Or reinstall with the official installer script.\n"));
    process.exit(1);
  }

  const { clean, output } = gitStatusClean(root);
  if (!clean && !opts.force) {
    console.error(c.red("\n  ✗ Working tree is not clean — refusing to update"));
    console.error(c.dim(`    Uncommitted changes:\n${output.split("\n").slice(0, 5).map(l => "      " + l).join("\n")}`));
    console.error(c.dim("    Commit or stash your changes, or run with --force to discard them.\n"));
    process.exit(1);
  }

  const branch = currentBranch(root);
  const before = currentSha(root);
  console.log(c.dim(`     Branch:  ${branch} @ ${before}`));

  if (opts.channel) {
    const newBranch = opts.channel === "stable" ? "main" : opts.channel === "dev" ? "dev" : opts.channel;
    if (newBranch !== branch) {
      console.log("");
      console.log(c.cyan(`▶ Switching to channel '${opts.channel}' (branch: ${newBranch})`));
      const r = spawnSync("git", ["checkout", newBranch], { cwd: root, stdio: "inherit" });
      if (r.status !== 0) {
        console.error(c.red(`✗ git checkout ${newBranch} failed`));
        process.exit(1);
      }
    }
  }

  console.log("");
  console.log(c.cyan("▶ Pulling latest"));
  const fetch = spawnSync("git", ["fetch", "origin", "--quiet"], { cwd: root, stdio: "inherit" });
  if (fetch.status !== 0) {
    console.error(c.red("✗ git fetch failed"));
    process.exit(1);
  }
  const pullArgs = opts.force ? ["reset", "--hard", `origin/${currentBranch(root)}`] : ["pull", "--ff-only", "--quiet"];
  const pull = spawnSync("git", pullArgs, { cwd: root, stdio: "inherit" });
  if (pull.status !== 0) {
    console.error(c.red("✗ git pull failed (try --force to discard local changes)"));
    process.exit(1);
  }
  const after = currentSha(root);

  if (before === after) {
    console.log(c.green(`  ✓ Already up to date at ${after}`));
    console.log("");
    return;
  }
  console.log(c.green(`  ✓ Updated ${before} → ${after}`));

  // Reinstall + rebuild
  console.log("");
  console.log(c.cyan("▶ Installing dependencies"));
  const inst = spawnSync("pnpm", ["install", "--no-frozen-lockfile", "--ignore-scripts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (inst.status !== 0) {
    console.error(c.red("✗ pnpm install failed"));
    process.exit(1);
  }

  console.log("");
  console.log(c.cyan("▶ Rebuilding"));
  const build = spawnSync("pnpm", ["-r", "build"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) {
    console.error(c.red("✗ Build failed"));
    process.exit(1);
  }

  console.log("");
  console.log(c.green("  ✓ OpenVesper updated"));
  console.log(c.dim(`     Restart the gateway: vesper gateway stop && vesper gateway start -d`));
  console.log("");
}

// ── uninstall ──────────────────────────────────────────────────────

export async function runUninstall(opts: { purge?: boolean; yes?: boolean } = {}): Promise<void> {
  console.log("");
  console.log(c.cyan(c.bold("  🌒 OpenVesper Uninstall")));

  const root = findInstallRoot();
  const workspaceRoot = path.join(os.homedir(), ".openvesper");

  console.log("");
  console.log(c.dim("  This will remove:"));
  if (root) console.log(`    ${c.amber("●")} Install dir:  ${root}`);
  if (opts.purge) {
    console.log(`    ${c.red("●")} Workspace:    ${workspaceRoot}`);
    console.log(c.red("                    (sessions, audit logs, OAuth tokens, .env)"));
  } else {
    console.log(`    ${c.dim("○")} Workspace:    ${workspaceRoot} (kept — use --purge to remove)`);
  }

  // Daemon
  const daemonPaths = [
    path.join(os.homedir(), "Library", "LaunchAgents", "com.openvesper.gateway.plist"),
    path.join(os.homedir(), ".config", "systemd", "user", "openvesper-gateway.service"),
  ];
  const existingDaemons = daemonPaths.filter((p) => fs.existsSync(p));
  for (const d of existingDaemons) {
    console.log(`    ${c.amber("●")} Daemon:       ${d}`);
  }

  console.log("");

  if (!opts.yes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await rl.question(c.amber("  Proceed? [y/N]: "));
    rl.close();
    if (!ans.toLowerCase().startsWith("y")) {
      console.log(c.dim("  Cancelled."));
      console.log("");
      return;
    }
  }

  // Stop gateway if running (best effort)
  console.log("");
  console.log(c.cyan("▶ Stopping gateway (if running)"));
  const stopPid = path.join(os.homedir(), ".openvesper", "gateway.pid");
  if (fs.existsSync(stopPid)) {
    try {
      const pid = parseInt(fs.readFileSync(stopPid, "utf-8"), 10);
      if (!Number.isNaN(pid)) process.kill(pid, "SIGTERM");
      fs.unlinkSync(stopPid);
    } catch {
      // ignore
    }
  }

  // Uninstall daemon
  for (const d of existingDaemons) {
    if (d.endsWith(".plist")) {
      spawnSync("launchctl", ["unload", d], { stdio: "ignore" });
    } else if (d.endsWith(".service")) {
      spawnSync("systemctl", ["--user", "disable", "--now", "openvesper-gateway"], { stdio: "ignore" });
    }
    try {
      fs.unlinkSync(d);
      console.log(c.dim(`  - removed ${d}`));
    } catch {
      // ignore
    }
  }

  // Remove install dir
  if (root && fs.existsSync(root)) {
    console.log(c.cyan(`▶ Removing install: ${root}`));
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch (err) {
      console.warn(c.amber(`  ! Could not fully remove: ${err instanceof Error ? err.message : err}`));
    }
  }

  // Remove workspace (only with --purge)
  if (opts.purge && fs.existsSync(workspaceRoot)) {
    console.log(c.red(`▶ Removing workspace: ${workspaceRoot}`));
    try {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    } catch (err) {
      console.warn(c.amber(`  ! Could not fully remove: ${err instanceof Error ? err.message : err}`));
    }
  }

  // Note about shim
  console.log("");
  console.log(c.dim("  Note: the 'vesper' shim was installed by your installer."));
  console.log(c.dim("        Look for it in ~/.local/bin or %LOCALAPPDATA%\\Microsoft\\WindowsApps"));
  console.log(c.dim("        and remove it manually if you no longer want it."));
  console.log("");
  console.log(c.green("  ✓ Uninstall complete"));
  console.log("");
}
