// ============================================================
// 🌒 Streaming — Chunk-by-chunk replies (OpenClaw-style)
// ============================================================
//
// Server-Sent Events (SSE) over HTTP, and message frames over WebSocket.
// Lets Telegram show "typing..." while the agent thinks, lets the CLI
// stream tokens as they arrive.

import type { Response } from "express";
import type { WebSocket } from "ws";

export type StreamEvent =
  | { type: "start"; sessionId: string; agent: string }
  | { type: "token"; text: string }
  | { type: "block_start"; blockType: "text" | "tool_use" | "thinking" }
  | { type: "block_end"; blockType: "text" | "tool_use" | "thinking" }
  | { type: "message_start" }
  | { type: "message_end"; usage?: { inputTokens: number; outputTokens: number } }
  | { type: "tool-call"; tool: string; input: unknown }
  | { type: "tool-result"; tool: string; output: unknown }
  | { type: "thinking"; text: string }
  | { type: "done"; reply: string; durationMs: number }
  | { type: "error"; error: string };

/**
 * SSE writer for HTTP streaming endpoints.
 * Client connects to /agent/stream and receives chunks as they arrive.
 */
export class SSEWriter {
  private closed = false;

  constructor(private res: Response) {
    // SSE setup
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Detect client disconnect
    res.on("close", () => {
      this.closed = true;
    });
  }

  send(event: StreamEvent): void {
    if (this.closed) return;
    const data = JSON.stringify(event);
    this.res.write(`data: ${data}\n\n`);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.res.end();
  }

  get isClosed(): boolean {
    return this.closed;
  }
}

/**
 * WebSocket writer for full-duplex streaming.
 * Used by long-lived connections (CLI in interactive mode, web UI, VSCode).
 */
export class WSWriter {
  constructor(private ws: WebSocket) {}

  send(event: StreamEvent): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(event));
  }

  close(): void {
    if (this.ws.readyState === this.ws.OPEN) this.ws.close();
  }

  get isClosed(): boolean {
    return this.ws.readyState !== this.ws.OPEN;
  }
}

/**
 * Helper to chunk a plain string reply into token-sized streams.
 * Useful when the underlying LLM doesn't natively stream — we fake it.
 */
export async function streamText(
  writer: SSEWriter | WSWriter,
  text: string,
  chunkSize = 8,
  delayMs = 20
): Promise<void> {
  for (let i = 0; i < text.length; i += chunkSize) {
    if (writer.isClosed) return;
    const chunk = text.slice(i, i + chunkSize);
    writer.send({ type: "token", text: chunk });
    await new Promise((r) => setTimeout(r, delayMs));
  }
}
