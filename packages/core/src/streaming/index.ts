// ============================================================
// 🌒 @openvesper/core — Streaming Support
// Token-by-token streaming for all providers
// ============================================================

import { LLMMessage, ProviderName } from "../types";

export interface StreamChunk {
  type: "text" | "tool_use_start" | "tool_use_delta" | "tool_use_complete" | "done" | "error";
  text?: string;
  toolName?: string;
  toolId?: string;
  toolInput?: Record<string, unknown>;
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
}

export interface StreamRequest {
  provider: ProviderName;
  model: string;
  messages: LLMMessage[];
  system?: string;
  apiKey?: string;
  maxTokens?: number;
}

/**
 * Stream a response from Anthropic Claude.
 */
export async function* streamAnthropic(req: StreamRequest): AsyncGenerator<StreamChunk> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey || process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens || 4096,
      system: req.system,
      messages: req.messages,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    yield { type: "error", error: `Anthropic API error: ${response.status}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        yield { type: "done" };
        return;
      }
      try {
        const event = JSON.parse(data);
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          yield { type: "text", text: event.delta.text };
        } else if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
          yield {
            type: "tool_use_start",
            toolName: event.content_block.name,
            toolId: event.content_block.id,
          };
        } else if (event.type === "message_delta" && event.usage) {
          yield { type: "done", usage: { inputTokens: 0, outputTokens: event.usage.output_tokens } };
        }
      } catch { /* skip malformed */ }
    }
  }
}

/**
 * Stream from OpenAI-compatible endpoints (OpenAI, Groq, OpenRouter, DeepSeek, etc).
 */
export async function* streamOpenAICompat(
  endpoint: string,
  req: StreamRequest,
  extraHeaders: Record<string, string> = {}
): AsyncGenerator<StreamChunk> {
  const messages = req.system
    ? [{ role: "system" as const, content: req.system }, ...req.messages]
    : req.messages;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey || ""}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: req.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content.map((b) => b.text).join(""),
      })),
      max_tokens: req.maxTokens || 4096,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    yield { type: "error", error: `OpenAI-compat API error: ${response.status}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        yield { type: "done" };
        return;
      }
      try {
        const event = JSON.parse(data);
        const delta = event.choices?.[0]?.delta;
        if (delta?.content) {
          yield { type: "text", text: delta.content };
        }
        if (event.usage) {
          yield {
            type: "done",
            usage: { inputTokens: event.usage.prompt_tokens, outputTokens: event.usage.completion_tokens },
          };
        }
      } catch { /* skip */ }
    }
  }
}

/**
 * Stream from Google Gemini.
 */
export async function* streamGemini(req: StreamRequest): AsyncGenerator<StreamChunk> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${req.model}:streamGenerateContent?alt=sse&key=${req.apiKey}`;
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : m.content.map((b) => b.text).join("") }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
      generationConfig: { maxOutputTokens: req.maxTokens || 4096 },
    }),
  });

  if (!response.ok || !response.body) {
    yield { type: "error", error: `Gemini API error: ${response.status}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield { type: "text", text };
        if (event.usageMetadata) {
          yield {
            type: "done",
            usage: {
              inputTokens: event.usageMetadata.promptTokenCount || 0,
              outputTokens: event.usageMetadata.candidatesTokenCount || 0,
            },
          };
        }
      } catch { /* skip */ }
    }
  }
}

/**
 * Stream from Ollama (local).
 */
export async function* streamOllama(req: StreamRequest): AsyncGenerator<StreamChunk> {
  const host = process.env.OLLAMA_HOST || "http://localhost:11434";
  const messages = req.system
    ? [{ role: "system", content: req.system }, ...req.messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content.map((b) => b.text).join(""),
      }))]
    : req.messages;

  const response = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: req.model, messages, stream: true }),
  });

  if (!response.ok || !response.body) {
    yield { type: "error", error: `Ollama error: ${response.status}` };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.message?.content) yield { type: "text", text: event.message.content };
        if (event.done) {
          yield { type: "done", usage: { inputTokens: event.prompt_eval_count || 0, outputTokens: event.eval_count || 0 } };
          return;
        }
      } catch { /* skip */ }
    }
  }
}

/**
 * Top-level stream router.
 */
export async function* streamLLM(req: StreamRequest): AsyncGenerator<StreamChunk> {
  switch (req.provider) {
    case "anthropic":
      yield* streamAnthropic(req);
      break;
    case "openai":
      yield* streamOpenAICompat("https://api.openai.com/v1/chat/completions", req);
      break;
    case "groq":
      yield* streamOpenAICompat("https://api.groq.com/openai/v1/chat/completions", req);
      break;
    case "deepseek":
      yield* streamOpenAICompat("https://api.deepseek.com/v1/chat/completions", req);
      break;
    case "openrouter":
      yield* streamOpenAICompat("https://openrouter.ai/api/v1/chat/completions", req, {
        "HTTP-Referer": "https://openvesper.com",
        "X-Title": "OpenVesper",
      });
      break;
    case "mistral":
      yield* streamOpenAICompat("https://api.mistral.ai/v1/chat/completions", req);
      break;
    case "grok":
      yield* streamOpenAICompat("https://api.x.ai/v1/chat/completions", req);
      break;
    case "together":
      yield* streamOpenAICompat("https://api.together.xyz/v1/chat/completions", req);
      break;
    case "gemini":
      yield* streamGemini(req);
      break;
    case "ollama":
      yield* streamOllama(req);
      break;
    default:
      yield { type: "error", error: `Streaming not supported for ${req.provider}` };
  }
}
