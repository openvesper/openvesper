// ============================================================
// 🌒 Multiple Gateways
// ============================================================
//
// You can run more than one gateway on the same machine if you want
// isolation between workspaces (e.g. work vs personal agents).
//
// Each gateway needs:
//   - Unique port (OPENVESPER_GATEWAY_PORT)
//   - Unique PID file (OPENVESPER_PID_FILE)
//   - Optionally unique agents dir (OPENVESPER_AGENTS_DIR)
//   - Optionally unique config dir (OPENVESPER_CONFIG_DIR)
//
// This module assigns ports for named workspaces deterministically.
//
// PRIVACY: All workspaces stay local. No cross-workspace data sharing
// unless you explicitly share files.

import fs from "fs/promises";
import path from "path";
import os from "os";

const WORKSPACES_FILE = path.join(os.homedir(), ".openvesper", "workspaces.json");

export interface Workspace {
  name: string;
  port: number;
  agentsDir: string;
  configDir: string;
  pidFile: string;
  createdAt: number;
}

const BASE_PORT = 18789;

export class WorkspaceManager {
  private workspaces: Workspace[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      this.workspaces = JSON.parse(await fs.readFile(WORKSPACES_FILE, "utf-8"));
    } catch {
      this.workspaces = [];
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(WORKSPACES_FILE), { recursive: true, mode: 0o700 });
    await fs.writeFile(WORKSPACES_FILE, JSON.stringify(this.workspaces, null, 2), { mode: 0o600 });
  }

  async create(name: string): Promise<Workspace> {
    await this.load();
    if (this.workspaces.find((w) => w.name === name)) {
      throw new Error(`Workspace already exists: ${name}`);
    }

    // Assign next available port
    const usedPorts = new Set(this.workspaces.map((w) => w.port));
    let port = BASE_PORT;
    while (usedPorts.has(port)) port++;

    const home = os.homedir();
    const workspace: Workspace = {
      name,
      port,
      agentsDir: path.join(home, ".openvesper", "workspaces", name, "agents"),
      configDir: path.join(home, ".openvesper", "workspaces", name),
      pidFile: path.join(home, ".openvesper", "workspaces", name, "gateway.pid"),
      createdAt: Date.now(),
    };

    await fs.mkdir(workspace.agentsDir, { recursive: true, mode: 0o700 });
    await fs.mkdir(workspace.configDir, { recursive: true, mode: 0o700 });

    this.workspaces.push(workspace);
    await this.save();
    return workspace;
  }

  async remove(name: string): Promise<boolean> {
    await this.load();
    const idx = this.workspaces.findIndex((w) => w.name === name);
    if (idx < 0) return false;
    this.workspaces.splice(idx, 1);
    await this.save();
    return true;
  }

  async list(): Promise<Workspace[]> {
    await this.load();
    return [...this.workspaces];
  }

  async get(name: string): Promise<Workspace | null> {
    await this.load();
    return this.workspaces.find((w) => w.name === name) || null;
  }

  /** Return env vars to use when starting a gateway for this workspace */
  async envFor(name: string): Promise<Record<string, string> | null> {
    const ws = await this.get(name);
    if (!ws) return null;
    return {
      OPENVESPER_GATEWAY_PORT: String(ws.port),
      OPENVESPER_AGENTS_DIR: ws.agentsDir,
      OPENVESPER_CONFIG_DIR: ws.configDir,
      OPENVESPER_PID_FILE: ws.pidFile,
    };
  }
}

export const workspaceManager = new WorkspaceManager();
