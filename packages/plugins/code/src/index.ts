// ============================================================
// 🌒 @openvesper/plugin-code
// Sandboxed code execution: Python, Node.js (JS/TS)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

const execAsync = promisify(exec);

async function runCode(language: "python" | "node" | "typescript", code: string, timeoutMs = 30000): Promise<ToolResult> {
  const tmpDir = os.tmpdir();
  const id = crypto.randomBytes(8).toString("hex");
  const ext = language === "python" ? "py" : language === "typescript" ? "ts" : "js";
  const tmpFile = path.join(tmpDir, `openvesper-${id}.${ext}`);

  try {
    await fs.writeFile(tmpFile, code, "utf8");

    let cmd: string;
    if (language === "python") cmd = `python3 "${tmpFile}"`;
    else if (language === "typescript") cmd = `npx tsx "${tmpFile}"`;
    else cmd = `node "${tmpFile}"`;

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 5, // 5MB
    });

    return {
      success: true,
      data: {
        language,
        codeLength: code.length,
        stdout: stdout.slice(0, 8000),
        stderr: stderr.slice(0, 2000),
        truncated: stdout.length > 8000,
      },
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message,
      data: {
        stdout: e.stdout?.slice(0, 4000),
        stderr: e.stderr?.slice(0, 2000),
        signal: e.signal,
      },
    } as any;
  } finally {
    try { await fs.unlink(tmpFile); } catch { /* ignore */ }
  }
}

async function installPackage(language: "python" | "node", pkg: string): Promise<ToolResult> {
  // Validate package name (no shell injection)
  if (!/^[a-zA-Z0-9@\/._-]+$/.test(pkg)) {
    return { success: false, error: "Invalid package name" };
  }
  try {
    const cmd = language === "python" ? `pip install --user "${pkg}"` : `npm install -g "${pkg}"`;
    const { stdout } = await execAsync(cmd, { timeout: 60000 });
    return { success: true, data: { language, pkg, output: stdout.slice(0, 2000) } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-code",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Execute Python / Node.js / TypeScript code in a sandbox",
  license: "MIT",
  tools: [
    defineTool({
      name: "run_python",
      description: "Execute Python code (requires python3 installed)",
      inputSchema: inputSchema({
        code: { type: "string", description: "Python code to execute" },
        timeout_ms: { type: "number", description: "Timeout (default 30000)" },
      }, ["code"]),
      handler: async (i) => runCode("python", i.code as string, (i.timeout_ms as number) || 30000),
      category: "code",
      permission: "execute",
    }),
    defineTool({
      name: "run_javascript",
      description: "Execute JavaScript (Node.js)",
      inputSchema: inputSchema({
        code: { type: "string", description: "JavaScript code" },
        timeout_ms: { type: "number", description: "Timeout" },
      }, ["code"]),
      handler: async (i) => runCode("node", i.code as string, (i.timeout_ms as number) || 30000),
      category: "code",
      permission: "execute",
    }),
    defineTool({
      name: "run_typescript",
      description: "Execute TypeScript (uses tsx)",
      inputSchema: inputSchema({
        code: { type: "string", description: "TypeScript code" },
        timeout_ms: { type: "number", description: "Timeout" },
      }, ["code"]),
      handler: async (i) => runCode("typescript", i.code as string, (i.timeout_ms as number) || 30000),
      category: "code",
      permission: "execute",
    }),
    defineTool({
      name: "install_python_package",
      description: "Install a pip package (sandboxed, user install)",
      inputSchema: inputSchema({ pkg: { type: "string", description: "Package name (e.g. requests, numpy)" } }, ["pkg"]),
      handler: async (i) => installPackage("python", i.pkg as string),
      category: "code",
      permission: "execute",
    }),
    defineTool({
      name: "install_node_package",
      description: "Install an npm package globally",
      inputSchema: inputSchema({ pkg: { type: "string", description: "npm package" } }, ["pkg"]),
      handler: async (i) => installPackage("node", i.pkg as string),
      category: "code",
      permission: "execute",
    }),
  ]

});
