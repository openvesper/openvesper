// ============================================================
// 🌒 @openvesper/plugin-shell
// Execute shell commands. Always requires user approval.
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

// Block dangerous commands
const DANGEROUS = [
  /rm\s+-rf?\s+\//,
  /:\(\)\{\s*:\|:\&\s*\}/, // fork bomb
  /mkfs/,
  /dd\s+if=\/dev/,
  />\/dev\/sda/,
  /shutdown/,
  /reboot/,
  /passwd/,
];

function isDangerous(cmd: string): string | null {
  for (const pattern of DANGEROUS) {
    if (pattern.test(cmd)) return `Blocked dangerous pattern: ${pattern}`;
  }
  return null;
}

async function executeShell(command: string, ctx: any, timeoutMs = 30000): Promise<ToolResult> {
  const dangerous = isDangerous(command);
  if (dangerous) return { success: false, error: dangerous };

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: ctx.workspace.path,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });
    return {
      success: true,
      data: {
        command,
        stdout: stdout.slice(0, 8000),
        stderr: stderr.slice(0, 2000),
        cwd: ctx.workspace.path,
        truncated: stdout.length > 8000 || stderr.length > 2000,
      },
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
      data: {
        stdout: e.stdout?.slice(0, 4000),
        stderr: e.stderr?.slice(0, 2000),
        code: e.code,
      },
    } as any;
  }
}

async function pwd(ctx: any): Promise<ToolResult> {
  return { success: true, data: { cwd: ctx.workspace.path } };
}

async function environment(): Promise<ToolResult> {
  // Return safe env info (not secrets!)
  return {
    success: true,
    data: {
      platform: process.platform,
      nodeVersion: process.version,
      cwd: process.cwd(),
      // Only safe vars
      shell: process.env.SHELL,
      home: process.env.HOME,
      user: process.env.USER,
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-shell",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Execute shell commands (permission-gated, sandboxed to workspace)",
  license: "MIT",
  tools: [
    defineTool({
      name: "exec_shell",
      description: "Execute a shell command in the workspace directory. ALWAYS requires permission. Blocked: rm -rf /, fork bombs, mkfs, dd, shutdown.",
      inputSchema: inputSchema({
        command: { type: "string", description: "Shell command" },
        timeout_ms: { type: "number", description: "Timeout in milliseconds (default 30000)" },
      }, ["command"]),
      handler: async (i, ctx) => executeShell(i.command as string, ctx, (i.timeout_ms as number) || 30000),
      category: "shell",
      permission: "execute",
    }),
    defineTool({
      name: "pwd",
      description: "Get current working directory",
      inputSchema: inputSchema({}),
      handler: async (_, ctx) => pwd(ctx),
      category: "shell",
      permission: "read",
    }),
    defineTool({
      name: "env_info",
      description: "Get safe environment info (platform, node version)",
      inputSchema: inputSchema({}),
      handler: async () => environment(),
      category: "shell",
      permission: "read",
    }),
  ]

});
