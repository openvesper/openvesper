// ============================================================
// 🌒 CLI: gateway command
// ============================================================
//
// Manage the persistent gateway process from the CLI.
//
// Usage:
//   vesper gateway start      — launch gateway in foreground
//   vesper gateway start -d   — launch gateway as detached background process
//   vesper gateway status     — check if gateway is running
//   vesper gateway stop       — stop a running gateway
//   vesper gateway logs       — tail logs (if running detached)

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PID_FILE = path.join(os.homedir(), ".openvesper", "gateway.pid");
const LOG_FILE = path.join(os.homedir(), ".openvesper", "gateway.log");
const DEFAULT_PORT = parseInt(process.env.OPENVESPER_GATEWAY_PORT || "18789", 10);

function readPid(): number | null {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    if (Number.isNaN(pid)) return null;
    // Check if process is actually running
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function writePid(pid: number): void {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(PID_FILE, String(pid), { mode: 0o600 });
}

function deletePid(): void {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}

async function checkHealth(port = DEFAULT_PORT): Promise<{ ok: boolean; data?: unknown }> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 2000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve({ ok: true, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false });
        }
      });
    });
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false });
    });
  });
}

// ── start ────────────────────────────────────────────────────────────

export async function gatewayStart(opts: { detach?: boolean } = {}): Promise<void> {
  // Check if already running
  const existingPid = readPid();
  if (existingPid) {
    const health = await checkHealth();
    if (health.ok) {
      console.log(`🌒 Gateway already running (pid ${existingPid})`);
      return;
    }
    // Stale PID file
    deletePid();
  }

  // Find gateway entry point
  // In a real install, this is apps/gateway/dist/index.js
  // In dev/source, fall back to running with tsx
  const repoRoot = process.cwd();
  const gatewayDist = path.join(repoRoot, "apps", "gateway", "dist", "index.js");

  if (!fs.existsSync(gatewayDist)) {
    console.error("✗ Gateway not built. Run: pnpm -r build");
    process.exit(1);
  }

  if (opts.detach) {
    // Detached background process, logs to file
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true, mode: 0o700 });
    const out = fs.openSync(LOG_FILE, "a");
    const err = fs.openSync(LOG_FILE, "a");

    const child = spawn("node", [gatewayDist], {
      detached: true,
      stdio: ["ignore", out, err],
      env: { ...process.env },
    });

    if (!child.pid) {
      console.error("✗ Failed to start gateway");
      process.exit(1);
    }

    writePid(child.pid);
    child.unref();

    // Wait briefly and verify health
    await new Promise((r) => setTimeout(r, 1000));
    const health = await checkHealth();
    if (health.ok) {
      console.log(`🌒 Gateway started (pid ${child.pid})`);
      console.log(`   Logs: ${LOG_FILE}`);
      console.log(`   Stop: vesper gateway stop`);
    } else {
      console.error("✗ Gateway started but health check failed. See logs:");
      console.error(`   tail ${LOG_FILE}`);
    }
  } else {
    // Foreground — inherit stdio
    const child = spawn("node", [gatewayDist], {
      stdio: "inherit",
      env: { ...process.env },
    });
    if (child.pid) writePid(child.pid);

    child.on("exit", (code) => {
      deletePid();
      process.exit(code || 0);
    });

    // Forward signals
    process.on("SIGINT", () => child.kill("SIGINT"));
    process.on("SIGTERM", () => child.kill("SIGTERM"));
  }
}

// ── status ───────────────────────────────────────────────────────────

export async function gatewayStatus(): Promise<void> {
  const pid = readPid();
  if (!pid) {
    console.log("○ Gateway not running");
    return;
  }

  const health = await checkHealth();
  if (!health.ok) {
    console.log(`✗ Gateway pid ${pid} found but health check failed`);
    console.log("  (stale PID file? try: vesper gateway stop)");
    return;
  }

  const data = health.data as { status: string; uptime: number; hooks: Record<string, number> };
  console.log(`● Gateway running (pid ${pid})`);
  console.log(`  Uptime: ${Math.floor(data.uptime)}s`);
  console.log(`  Hooks:  ${Object.entries(data.hooks).map(([k, v]) => `${k}=${v}`).join(", ")}`);
}

// ── stop ─────────────────────────────────────────────────────────────

export async function gatewayStop(): Promise<void> {
  const pid = readPid();
  if (!pid) {
    console.log("○ Gateway not running");
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
    console.log(`🌒 Sent SIGTERM to pid ${pid}`);
    // Wait briefly for graceful exit
    await new Promise((r) => setTimeout(r, 500));
    // Verify it's gone
    try {
      process.kill(pid, 0);
      console.log("  (process still running, sending SIGKILL...)");
      process.kill(pid, "SIGKILL");
    } catch {
      // Process is gone — good
    }
    deletePid();
    console.log("  Stopped");
  } catch (err) {
    console.error(`✗ Failed to stop: ${err instanceof Error ? err.message : err}`);
    deletePid();
  }
}

// ── logs ─────────────────────────────────────────────────────────────

export function gatewayLogs(opts: { lines?: number } = {}): void {
  if (!fs.existsSync(LOG_FILE)) {
    console.log(`○ No log file at ${LOG_FILE}`);
    console.log("  (gateway not started in detached mode yet)");
    return;
  }
  const content = fs.readFileSync(LOG_FILE, "utf-8");
  const lines = content.split("\n");
  const tail = opts.lines ? lines.slice(-opts.lines) : lines.slice(-50);
  console.log(tail.join("\n"));
}

// ── daemon install (auto-start on login) ─────────────────────────────
//
// macOS: launchd user agent at ~/Library/LaunchAgents/com.openvesper.gateway.plist
// Linux: systemd user service at ~/.config/systemd/user/openvesper-gateway.service
// Windows: not supported here — pointer to Task Scheduler instructions.

const LAUNCHD_LABEL = "com.openvesper.gateway";
const LAUNCHD_PLIST = path.join(
  os.homedir(),
  "Library",
  "LaunchAgents",
  `${LAUNCHD_LABEL}.plist`
);
const SYSTEMD_UNIT = path.join(
  os.homedir(),
  ".config",
  "systemd",
  "user",
  "openvesper-gateway.service"
);

function findGatewayEntry(): string | null {
  // Resolve where the gateway entry point is. Prefer the absolute path
  // of the current Node module so users running `vesper gateway install-daemon`
  // from anywhere get a working install.
  const candidates = [
    path.resolve(__dirname, "..", "..", "..", "gateway", "dist", "index.js"),
    path.resolve(process.cwd(), "apps", "gateway", "dist", "index.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function findNodeBin(): string {
  return process.execPath; // absolute path to current node
}

function buildLaunchdPlist(nodeBin: string, gatewayJs: string): string {
  const env = [
    `<key>HOME</key><string>${os.homedir()}</string>`,
    `<key>PATH</key><string>${process.env.PATH || "/usr/bin:/bin:/usr/local/bin"}</string>`,
  ].join("\n      ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>${nodeBin}</string>
    <string>${gatewayJs}</string>
  </array>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>

  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>

  <key>EnvironmentVariables</key>
  <dict>
      ${env}
  </dict>
</dict>
</plist>
`;
}

function buildSystemdUnit(nodeBin: string, gatewayJs: string): string {
  return `[Unit]
Description=OpenVesper Gateway (user service)
After=network.target

[Service]
Type=simple
ExecStart=${nodeBin} ${gatewayJs}
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}
Environment=HOME=${os.homedir()}
Environment=PATH=${process.env.PATH || "/usr/bin:/bin:/usr/local/bin"}

[Install]
WantedBy=default.target
`;
}

export async function gatewayInstallDaemon(opts: { quiet?: boolean } = {}): Promise<void> {
  const log = (msg: string) => {
    if (!opts.quiet) console.log(msg);
  };

  const nodeBin = findNodeBin();
  const gatewayJs = findGatewayEntry();
  if (!gatewayJs) {
    console.error(
      `✗ Cannot find gateway entry point.\n  Looked in: apps/gateway/dist/index.js\n  Build first with: pnpm -r build`
    );
    process.exit(1);
  }

  log(`🌒 Installing OpenVesper Gateway as user-level daemon`);
  log(`   node:    ${nodeBin}`);
  log(`   gateway: ${gatewayJs}`);

  if (process.platform === "darwin") {
    fs.mkdirSync(path.dirname(LAUNCHD_PLIST), { recursive: true });
    fs.writeFileSync(LAUNCHD_PLIST, buildLaunchdPlist(nodeBin, gatewayJs));
    log(`✓ Wrote ${LAUNCHD_PLIST}`);
    log("");
    log("  To activate:");
    log(`    launchctl unload ${LAUNCHD_PLIST}  ${"# (ignore error if first time)"}`);
    log(`    launchctl load ${LAUNCHD_PLIST}`);
    log("");
    log("  To check:");
    log(`    launchctl list | grep ${LAUNCHD_LABEL}`);
    log("");
    log("  To uninstall:");
    log(`    vesper gateway uninstall-daemon`);
  } else if (process.platform === "linux") {
    fs.mkdirSync(path.dirname(SYSTEMD_UNIT), { recursive: true });
    fs.writeFileSync(SYSTEMD_UNIT, buildSystemdUnit(nodeBin, gatewayJs));
    log(`✓ Wrote ${SYSTEMD_UNIT}`);
    log("");
    log("  To activate:");
    log("    systemctl --user daemon-reload");
    log("    systemctl --user enable --now openvesper-gateway");
    log("");
    log("  To check:");
    log("    systemctl --user status openvesper-gateway");
    log("    journalctl --user -u openvesper-gateway -f");
    log("");
    log("  Note: on most distros, user services only run while you're logged in.");
    log("  To run on boot without login, enable lingering:");
    log("    sudo loginctl enable-linger $USER");
    log("");
    log("  To uninstall:");
    log("    vesper gateway uninstall-daemon");
  } else if (process.platform === "win32") {
    log("");
    log("  Windows daemon install is not bundled. Two options:");
    log("");
    log("  Option A — Task Scheduler (GUI):");
    log("    schtasks /create /tn OpenVesperGateway /tr ");
    log(`      "${nodeBin} ${gatewayJs}" /sc onlogon /rl highest`);
    log("");
    log("  Option B — NSSM (recommended):");
    log("    nssm install OpenVesperGateway");
    log(`    nssm set OpenVesperGateway Application ${nodeBin}`);
    log(`    nssm set OpenVesperGateway AppParameters ${gatewayJs}`);
    log("    nssm start OpenVesperGateway");
  } else {
    log(`  Unsupported platform: ${process.platform}`);
  }
}

export async function gatewayUninstallDaemon(opts: { quiet?: boolean } = {}): Promise<void> {
  const log = (msg: string) => {
    if (!opts.quiet) console.log(msg);
  };

  if (process.platform === "darwin") {
    if (fs.existsSync(LAUNCHD_PLIST)) {
      // Best-effort unload
      try {
        const { spawnSync } = await import("child_process");
        spawnSync("launchctl", ["unload", LAUNCHD_PLIST], { stdio: "ignore" });
      } catch {
        // ignore
      }
      fs.unlinkSync(LAUNCHD_PLIST);
      log(`✓ Removed ${LAUNCHD_PLIST}`);
    } else {
      log("○ Nothing to remove (no plist found)");
    }
  } else if (process.platform === "linux") {
    if (fs.existsSync(SYSTEMD_UNIT)) {
      try {
        const { spawnSync } = await import("child_process");
        spawnSync("systemctl", ["--user", "disable", "--now", "openvesper-gateway"], { stdio: "ignore" });
      } catch {
        // ignore
      }
      fs.unlinkSync(SYSTEMD_UNIT);
      log(`✓ Removed ${SYSTEMD_UNIT}`);
      log("  Run: systemctl --user daemon-reload");
    } else {
      log("○ Nothing to remove (no unit file found)");
    }
  } else {
    log(`  Unsupported platform: ${process.platform}`);
  }
}
