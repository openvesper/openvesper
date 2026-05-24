// ============================================================
// 🌒 @openvesper/core — MCP (Model Context Protocol) Client
// Connect to external MCP servers, import their tools
// https://modelcontextprotocol.io
// ============================================================

import { spawn, ChildProcess } from "child_process";
import { ToolDefinition, ToolResult, LLMTool } from "../types";

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string; // for HTTP-based MCP servers
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: LLMTool["input_schema"];
}

/**
 * MCP Server Client — manages JSON-RPC over stdio with an MCP server process.
 */
export class MCPClient {
  private config: MCPServerConfig;
  private process?: ChildProcess;
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }> = new Map();
  private buffer = "";
  private initialized = false;
  private serverTools: MCPTool[] = [];

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Spawn the MCP server process and complete handshake.
   */
  async connect(): Promise<void> {
    if (this.process) return;

    this.process = spawn(this.config.command, this.config.args || [], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.config.env },
    });

    this.process.stdout?.on("data", (chunk) => this.handleStdout(chunk.toString()));
    this.process.stderr?.on("data", (chunk) => {
      console.error(`[MCP ${this.config.name}] ${chunk.toString().slice(0, 200)}`);
    });
    this.process.on("error", (err) => {
      console.error(`[MCP ${this.config.name}] process error:`, err);
    });

    // Initialize handshake
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "openvesper", version: "2.4.0" },
    });

    // Send initialized notification
    this.notify("initialized", {});
    this.initialized = true;

    // Fetch available tools
    const toolsResponse = await this.request("tools/list", {}) as { tools: MCPTool[] };
    this.serverTools = toolsResponse.tools || [];
  }

  /**
   * Disconnect from server.
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = undefined;
      this.initialized = false;
    }
  }

  /**
   * Get tool definitions from this MCP server, wrapped as OpenVesper ToolDefinitions.
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.serverTools.map((mcpTool) => ({
      name: `mcp_${this.config.name}_${mcpTool.name}`,
      description: `[MCP:${this.config.name}] ${mcpTool.description}`,
      inputSchema: mcpTool.inputSchema,
      category: `mcp:${this.config.name}`,
      permission: "external" as const,
      handler: async (input: Record<string, unknown>): Promise<ToolResult> => {
        try {
          const result = await this.request("tools/call", {
            name: mcpTool.name,
            arguments: input,
          }) as { content?: Array<{ type: string; text?: string }>; isError?: boolean };

          if (result.isError) {
            return { success: false, error: result.content?.[0]?.text || "MCP tool error" };
          }
          // Aggregate content blocks
          const textContent = (result.content || [])
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n");
          return { success: true, data: { mcpServer: this.config.name, output: textContent, raw: result } };
        } catch (e: unknown) {
          return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
      },
    }));
  }

  // ── Internal: JSON-RPC over stdio ────────────────────────────────────────────

  private handleStdout(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        this.handleMessage(msg);
      } catch (e) {
        console.warn(`[MCP ${this.config.name}] Failed to parse:`, line.slice(0, 100));
      }
    }
  }

  private handleMessage(msg: { id?: number; result?: unknown; error?: { message: string } }): void {
    if (msg.id === undefined) return; // Notification, ignore
    const pending = this.pendingRequests.get(msg.id);
    if (!pending) return;
    this.pendingRequests.delete(msg.id);
    if (msg.error) pending.reject(new Error(msg.error.message));
    else pending.resolve(msg.result);
  }

  private request(method: string, params: unknown, timeoutMs = 30000): Promise<unknown> {
    if (!this.process?.stdin) throw new Error(`MCP server ${this.config.name} not connected`);

    const id = ++this.requestId;
    const req = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.process!.stdin!.write(req);
    });
  }

  private notify(method: string, params: unknown): void {
    if (!this.process?.stdin) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    this.process.stdin.write(msg);
  }
}

/**
 * MCP Manager — manages multiple MCP server connections.
 */
export class MCPManager {
  private clients: Map<string, MCPClient> = new Map();

  async addServer(config: MCPServerConfig): Promise<void> {
    if (this.clients.has(config.name)) {
      throw new Error(`MCP server '${config.name}' already registered`);
    }
    const client = new MCPClient(config);
    await client.connect();
    this.clients.set(config.name, client);
  }

  async removeServer(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }
  }

  getAllToolDefinitions(): ToolDefinition[] {
    const all: ToolDefinition[] = [];
    for (const client of this.clients.values()) {
      all.push(...client.getToolDefinitions());
    }
    return all;
  }

  listServers(): string[] {
    return Array.from(this.clients.keys());
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(Array.from(this.clients.values()).map((c) => c.disconnect()));
    this.clients.clear();
  }
}
