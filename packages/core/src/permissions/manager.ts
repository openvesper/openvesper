// ============================================================
// 🌒 @openvesper/core — Permission Manager
// allow_always / ask / deny semantics per tool category
// ============================================================

import { PermissionLevel, PermissionMode, PermissionRequest, PermissionHandler } from "../types";

export class PermissionManager {
  /** Per-level default mode */
  private modes: Record<PermissionLevel, PermissionMode> = {
    read: "allow_always",
    external: "allow_always",
    write: "ask",
    execute: "ask",
    trade: "ask",
  };

  /** Per-tool overrides (toolName -> mode) */
  private toolOverrides: Map<string, PermissionMode> = new Map();

  /** External handler (CLI prompts user, web UI shows modal, etc.) */
  private handler?: PermissionHandler;

  constructor(opts: { handler?: PermissionHandler; defaultModes?: Partial<Record<PermissionLevel, PermissionMode>> } = {}) {
    this.handler = opts.handler;
    if (opts.defaultModes) {
      this.modes = { ...this.modes, ...opts.defaultModes };
    }
  }

  setMode(level: PermissionLevel, mode: PermissionMode): void {
    this.modes[level] = mode;
  }

  setToolMode(toolName: string, mode: PermissionMode): void {
    this.toolOverrides.set(toolName, mode);
  }

  setHandler(handler: PermissionHandler): void {
    this.handler = handler;
  }

  /**
   * Check if a tool is allowed to execute.
   * Returns true to allow, false to deny.
   */
  async check(req: PermissionRequest): Promise<boolean> {
    const mode = this.toolOverrides.get(req.toolName) || this.modes[req.level] || "ask";

    if (mode === "allow_always") return true;
    if (mode === "deny") return false;

    // ask mode — defer to handler
    if (this.handler) {
      return await this.handler(req);
    }

    // No handler — default to allow for non-dangerous ops
    return req.level === "read" || req.level === "external";
  }
}
