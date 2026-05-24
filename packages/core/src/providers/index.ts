// ============================================================
// 🌒 @openvesper/core — LLM Provider System
// Unified interface for 12 providers
// ============================================================

import { ProviderName, LLMProvider, LLMRequest, LLMResponse, LLMContentBlock, LLMMessage } from "../types";

export const PROVIDER_INFO: Record<ProviderName, {
  name: string; envKey: string; signupUrl: string;
  defaultModel: string; models: string[];
  toolUseSupport: boolean; pricing: string; notes: string;
}> = {
  anthropic: { name: "Anthropic Claude", envKey: "ANTHROPIC_API_KEY", signupUrl: "https://console.anthropic.com", defaultModel: "claude-opus-4-5", models: ["claude-opus-4-5","claude-sonnet-4-5","claude-haiku-4-5"], toolUseSupport: true, pricing: "Paid", notes: "Best tool use" },
  openai: { name: "OpenAI", envKey: "OPENAI_API_KEY", signupUrl: "https://platform.openai.com", defaultModel: "gpt-4o", models: ["gpt-4o","gpt-4o-mini","o3-mini","o1-preview"], toolUseSupport: true, pricing: "Paid", notes: "Strong all-around" },
  gemini: { name: "Google Gemini", envKey: "GEMINI_API_KEY", signupUrl: "https://aistudio.google.com", defaultModel: "gemini-2.0-flash", models: ["gemini-2.0-flash","gemini-2.0-pro","gemini-1.5-pro","gemini-1.5-flash"], toolUseSupport: true, pricing: "Free tier", notes: "Generous free tier" },
  grok: { name: "xAI Grok", envKey: "XAI_API_KEY", signupUrl: "https://x.ai", defaultModel: "grok-2-latest", models: ["grok-2-latest","grok-beta","grok-2-vision"], toolUseSupport: true, pricing: "Paid", notes: "OpenAI-compatible" },
  deepseek: { name: "DeepSeek", envKey: "DEEPSEEK_API_KEY", signupUrl: "https://platform.deepseek.com", defaultModel: "deepseek-chat", models: ["deepseek-chat","deepseek-reasoner"], toolUseSupport: true, pricing: "Very cheap", notes: "10x cheaper than GPT-4" },
  mistral: { name: "Mistral AI", envKey: "MISTRAL_API_KEY", signupUrl: "https://console.mistral.ai", defaultModel: "mistral-large-latest", models: ["mistral-large-latest","codestral-latest","mistral-small-latest"], toolUseSupport: true, pricing: "Paid", notes: "European" },
  groq: { name: "Groq", envKey: "GROQ_API_KEY", signupUrl: "https://console.groq.com", defaultModel: "llama-3.3-70b-versatile", models: ["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768"], toolUseSupport: true, pricing: "Free tier", notes: "Blazing fast" },
  together: { name: "Together AI", envKey: "TOGETHER_API_KEY", signupUrl: "https://together.ai", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo","Qwen/Qwen2.5-72B-Instruct-Turbo","deepseek-ai/DeepSeek-V3"], toolUseSupport: true, pricing: "Paid", notes: "Open-source models" },
  openrouter: { name: "OpenRouter", envKey: "OPENROUTER_API_KEY", signupUrl: "https://openrouter.ai", defaultModel: "anthropic/claude-3.5-sonnet", models: ["200+ models via openrouter.ai/models"], toolUseSupport: true, pricing: "Pay per use", notes: "One key, 200+ models" },
  fireworks: { name: "Fireworks AI", envKey: "FIREWORKS_API_KEY", signupUrl: "https://fireworks.ai", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct", models: ["accounts/fireworks/models/llama-v3p3-70b-instruct","accounts/fireworks/models/deepseek-v3","accounts/fireworks/models/qwen2p5-72b-instruct"], toolUseSupport: true, pricing: "Paid", notes: "Fast open-source inference" },
  nebius: { name: "Nebius AI Studio", envKey: "NEBIUS_API_KEY", signupUrl: "https://studio.nebius.com", defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct", models: ["meta-llama/Meta-Llama-3.1-70B-Instruct","Qwen/Qwen2.5-72B-Instruct","deepseek-ai/DeepSeek-V3"], toolUseSupport: true, pricing: "Free tier", notes: "Generous free tier" },
  deepinfra: { name: "DeepInfra", envKey: "DEEPINFRA_API_KEY", signupUrl: "https://deepinfra.com", defaultModel: "meta-llama/Llama-3.3-70B-Instruct", models: ["meta-llama/Llama-3.3-70B-Instruct","Qwen/Qwen2.5-72B-Instruct","deepseek-ai/DeepSeek-V3"], toolUseSupport: true, pricing: "Paid", notes: "Cheap open-source hosting" },
  ollama: { name: "Ollama (local)", envKey: "OLLAMA_HOST", signupUrl: "https://ollama.ai", defaultModel: "llama3.2", models: ["llama3.2","qwen2.5","deepseek-r1","mistral","gemma2"], toolUseSupport: true, pricing: "FREE local", notes: "No API key needed" },
  lmstudio: { name: "LM Studio (local)", envKey: "LMSTUDIO_HOST", signupUrl: "https://lmstudio.ai", defaultModel: "local-model", models: ["whatever is loaded"], toolUseSupport: true, pricing: "FREE local", notes: "OpenAI-compatible local server" },
  perplexity: { name: "Perplexity", envKey: "PERPLEXITY_API_KEY", signupUrl: "https://docs.perplexity.ai", defaultModel: "llama-3.1-sonar-large-128k-online", models: ["llama-3.1-sonar-large-128k-online","llama-3.1-sonar-small-128k-online"], toolUseSupport: false, pricing: "Paid", notes: "Built-in web search" },
};

// ── Anthropic Provider ────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";

export const AnthropicProvider: LLMProvider = {
  name: "anthropic",
  defaultModel: "claude-opus-4-5",
  supportsTools: true,
  isAvailable: () => Boolean(process.env.ANTHROPIC_API_KEY),

  async call(req: LLMRequest): Promise<LLMResponse> {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Use loose types here — Anthropic SDK reorganizes its namespaces between
    // versions, so we keep our adapter resilient by not pinning to internal types.
    const messages = req.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as unknown as string,
      }));

    const res = await client.messages.create({
      model: req.model || this.defaultModel,
      max_tokens: req.maxTokens || 4096,
      system: req.system,
      messages: messages as unknown as Parameters<typeof client.messages.create>[0]["messages"],
      ...(req.tools ? { tools: req.tools as unknown as Parameters<typeof client.messages.create>[0]["tools"] } : {}),
    });

    const content: LLMContentBlock[] = res.content.map((b) => {
      if (b.type === "text") return { type: "text", text: b.text };
      if (b.type === "tool_use") return { type: "tool_use", id: b.id, name: b.name, input: b.input as Record<string, unknown> };
      return { type: "text", text: "" };
    });

    return {
      content,
      stopReason: (res.stop_reason as LLMResponse["stopReason"]) || "end_turn",
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
      model: res.model,
      provider: "anthropic",
    };
  },
};

// ── OpenAI-Compatible Provider Factory ────────────────────────────────────────

import axios from "axios";

interface OpenAIToolCall { id: string; type: "function"; function: { name: string; arguments: string } }
interface OpenAIChatMessage { role: "system"|"user"|"assistant"|"tool"; content?: string|null; tool_calls?: OpenAIToolCall[]; tool_call_id?: string }
interface OpenAIResponse { id: string; choices: { message: OpenAIChatMessage; finish_reason: string }[]; usage?: { prompt_tokens: number; completion_tokens: number }; model: string }

const OAI_CONFIGS: Record<Exclude<ProviderName, "anthropic"|"gemini"|"ollama">, { baseURL: string; envKey: string; defaultModel: string; extraHeaders?: Record<string, string> }> = {
  openai: { baseURL: "https://api.openai.com/v1", envKey: "OPENAI_API_KEY", defaultModel: "gpt-4o" },
  grok: { baseURL: "https://api.x.ai/v1", envKey: "XAI_API_KEY", defaultModel: "grok-2-latest" },
  deepseek: { baseURL: "https://api.deepseek.com/v1", envKey: "DEEPSEEK_API_KEY", defaultModel: "deepseek-chat" },
  mistral: { baseURL: "https://api.mistral.ai/v1", envKey: "MISTRAL_API_KEY", defaultModel: "mistral-large-latest" },
  groq: { baseURL: "https://api.groq.com/openai/v1", envKey: "GROQ_API_KEY", defaultModel: "llama-3.3-70b-versatile" },
  together: { baseURL: "https://api.together.xyz/v1", envKey: "TOGETHER_API_KEY", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", envKey: "OPENROUTER_API_KEY", defaultModel: "anthropic/claude-3.5-sonnet", extraHeaders: { "HTTP-Referer": "https://github.com/openvesper/openvesper", "X-Title": "OpenVesper" } },
  fireworks: { baseURL: "https://api.fireworks.ai/inference/v1", envKey: "FIREWORKS_API_KEY", defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct" },
  nebius: { baseURL: "https://api.studio.nebius.com/v1", envKey: "NEBIUS_API_KEY", defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct" },
  deepinfra: { baseURL: "https://api.deepinfra.com/v1/openai", envKey: "DEEPINFRA_API_KEY", defaultModel: "meta-llama/Llama-3.3-70B-Instruct" },
  lmstudio: { baseURL: process.env.LMSTUDIO_HOST || "http://localhost:1234/v1", envKey: "LMSTUDIO_HOST", defaultModel: "local-model" },
  perplexity: { baseURL: "https://api.perplexity.ai", envKey: "PERPLEXITY_API_KEY", defaultModel: "llama-3.1-sonar-large-128k-online" },
};

function messagesToOpenAI(messages: LLMMessage[]): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      out.push({ role: msg.role as OpenAIChatMessage["role"], content: msg.content });
      continue;
    }
    if (msg.role === "assistant") {
      const textParts: string[] = [];
      const toolCalls: OpenAIToolCall[] = [];
      for (const b of msg.content) {
        if (b.type === "text" && b.text) textParts.push(b.text);
        else if (b.type === "tool_use" && b.id && b.name) {
          toolCalls.push({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input || {}) } });
        }
      }
      out.push({ role: "assistant", content: textParts.join("\n") || null, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) });
    } else if (msg.role === "user") {
      const toolResults = msg.content.filter((b) => b.type === "tool_result");
      const textParts = msg.content.filter((b) => b.type === "text").map((b) => b.text || "");
      for (const tr of toolResults) {
        out.push({ role: "tool", tool_call_id: tr.tool_use_id || "", content: tr.content || "" });
      }
      if (textParts.length) out.push({ role: "user", content: textParts.join("\n") });
    }
  }
  return out;
}

export function makeOpenAICompatibleProvider(name: Exclude<ProviderName, "anthropic"|"gemini"|"ollama">): LLMProvider {
  const cfg = OAI_CONFIGS[name];
  return {
    name,
    defaultModel: cfg.defaultModel,
    supportsTools: name !== "perplexity",
    isAvailable: () => name === "lmstudio" ? true : Boolean(process.env[cfg.envKey]),

    async call(req: LLMRequest): Promise<LLMResponse> {
      const apiKey = process.env[cfg.envKey] || "lm-studio";
      const messages = messagesToOpenAI(req.messages);
      if (req.system) messages.unshift({ role: "system", content: req.system });

      const body: Record<string, unknown> = {
        model: req.model || cfg.defaultModel,
        messages,
        max_tokens: req.maxTokens || 4096,
        temperature: req.temperature ?? 0.7,
      };

      if (req.tools && this.supportsTools) {
        body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
        body.tool_choice = "auto";
      }

      const r = await axios.post<OpenAIResponse>(`${cfg.baseURL}/chat/completions`, body, {
        headers: { "Content-Type": "application/json", ...(name !== "lmstudio" ? { Authorization: `Bearer ${apiKey}` } : {}), ...(cfg.extraHeaders || {}) },
        timeout: 120000,
      });

      const choice = r.data.choices[0];
      const msg = choice.message;
      const content: LLMContentBlock[] = [];
      if (msg.content) content.push({ type: "text", text: msg.content });
      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          let input: Record<string, unknown> = {};
          try { input = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
          content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
        }
      }
      return {
        content,
        stopReason: choice.finish_reason === "tool_calls" ? "tool_use" : choice.finish_reason === "stop" ? "end_turn" : "other",
        usage: r.data.usage ? { inputTokens: r.data.usage.prompt_tokens, outputTokens: r.data.usage.completion_tokens } : undefined,
        model: r.data.model,
        provider: name,
      };
    },
  };
}

// ── Gemini Provider ───────────────────────────────────────────────────────────

interface GeminiPart { text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: { result: string } } }
interface GeminiContent { role: "user" | "model"; parts: GeminiPart[] }

function messagesToGemini(messages: LLMMessage[]) {
  const contents: GeminiContent[] = [];
  let systemInstruction: { parts: GeminiPart[] } | undefined;
  for (const msg of messages) {
    if (msg.role === "system") {
      const text = typeof msg.content === "string" ? msg.content : msg.content.map((b) => b.text || "").join("\n");
      systemInstruction = { parts: [{ text }] };
      continue;
    }
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    const parts: GeminiPart[] = [];
    if (typeof msg.content === "string") parts.push({ text: msg.content });
    else {
      for (const b of msg.content) {
        if (b.type === "text" && b.text) parts.push({ text: b.text });
        else if (b.type === "tool_use" && b.name) parts.push({ functionCall: { name: b.name, args: b.input || {} } });
        else if (b.type === "tool_result" && b.content) parts.push({ functionResponse: { name: b.tool_use_id || "tool", response: { result: b.content } } });
      }
    }
    if (parts.length) contents.push({ role, parts });
  }
  return { contents, systemInstruction };
}

export const GeminiProvider: LLMProvider = {
  name: "gemini",
  defaultModel: "gemini-2.0-flash",
  supportsTools: true,
  isAvailable: () => Boolean(process.env.GEMINI_API_KEY),

  async call(req: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = req.model || this.defaultModel;
    const { contents, systemInstruction } = messagesToGemini(req.messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: req.maxTokens || 4096, temperature: req.temperature ?? 0.7 },
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(req.system && !systemInstruction ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
    };

    if (req.tools) {
      body.tools = [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }];
    }

    const r = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, body, {
      headers: { "Content-Type": "application/json" }, timeout: 120000,
    });

    const candidate = r.data.candidates[0];
    const content: LLMContentBlock[] = [];
    for (const part of candidate.content.parts) {
      if (part.text) content.push({ type: "text", text: part.text });
      else if (part.functionCall) content.push({ type: "tool_use", id: `${part.functionCall.name}_${Date.now()}`, name: part.functionCall.name, input: part.functionCall.args });
    }

    return {
      content,
      stopReason: candidate.finishReason === "STOP" ? "end_turn" : "other",
      usage: r.data.usageMetadata ? { inputTokens: r.data.usageMetadata.promptTokenCount, outputTokens: r.data.usageMetadata.candidatesTokenCount } : undefined,
      model: r.data.modelVersion || model,
      provider: "gemini",
    };
  },
};

// ── Ollama Provider ───────────────────────────────────────────────────────────

export const OllamaProvider: LLMProvider = {
  name: "ollama",
  defaultModel: "llama3.2",
  supportsTools: true,
  isAvailable: () => true,

  async call(req: LLMRequest): Promise<LLMResponse> {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const messages: { role: string; content: string; tool_calls?: unknown[] }[] = [];

    for (const m of req.messages) {
      if (typeof m.content === "string") messages.push({ role: m.role, content: m.content });
      else {
        const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
        const toolResults = m.content.filter((b) => b.type === "tool_result").map((b) => b.content).join("\n");
        if (toolResults) messages.push({ role: "tool", content: toolResults });
        if (text) messages.push({ role: m.role, content: text });
      }
    }
    if (req.system) messages.unshift({ role: "system", content: req.system });

    const body: Record<string, unknown> = {
      model: req.model || this.defaultModel,
      messages,
      stream: false,
      options: { temperature: req.temperature ?? 0.7, num_predict: req.maxTokens || 4096 },
    };
    if (req.tools) {
      body.tools = req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
    }

    try {
      const r = await axios.post(`${host}/api/chat`, body, { headers: { "Content-Type": "application/json" }, timeout: 300000 });
      const msg = r.data.message;
      const content: LLMContentBlock[] = [];
      if (msg.content) content.push({ type: "text", text: msg.content });
      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          content.push({ type: "tool_use", id: `${tc.function.name}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, name: tc.function.name, input: tc.function.arguments });
        }
      }
      return {
        content,
        stopReason: msg.tool_calls?.length ? "tool_use" : "end_turn",
        usage: { inputTokens: r.data.prompt_eval_count || 0, outputTokens: r.data.eval_count || 0 },
        model: r.data.model,
        provider: "ollama",
      };
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e);
      if (err.includes("ECONNREFUSED")) throw new Error(`Ollama not reachable at ${host}. Run: 'ollama serve'`);
      throw e;
    }
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const PROVIDERS: Record<ProviderName, LLMProvider> = {
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  ollama: OllamaProvider,
  openai:     makeOpenAICompatibleProvider("openai"),
  grok:       makeOpenAICompatibleProvider("grok"),
  deepseek:   makeOpenAICompatibleProvider("deepseek"),
  mistral:    makeOpenAICompatibleProvider("mistral"),
  groq:       makeOpenAICompatibleProvider("groq"),
  together:   makeOpenAICompatibleProvider("together"),
  openrouter: makeOpenAICompatibleProvider("openrouter"),
  fireworks:  makeOpenAICompatibleProvider("fireworks"),
  nebius:     makeOpenAICompatibleProvider("nebius"),
  deepinfra:  makeOpenAICompatibleProvider("deepinfra"),
  lmstudio:   makeOpenAICompatibleProvider("lmstudio"),
  perplexity: makeOpenAICompatibleProvider("perplexity"),
};

export function getProvider(name: ProviderName): LLMProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown provider: ${name}`);
  return p;
}

export function detectDefaultProvider(): ProviderName {
  // Priority: paid premium first, then free-tier providers, then local fallbacks.
  // The first one with credentials configured wins.
  const priority: ProviderName[] = [
    "anthropic", "openai",
    "gemini", "groq",      // generous free tiers
    "deepseek",            // very cheap
    "openrouter",          // one-key access to many
    "fireworks", "nebius", "deepinfra",  // open-source hosting
    "mistral", "together", "grok",
    "perplexity",
    "ollama", "lmstudio",  // local fallbacks
  ];
  for (const p of priority) {
    if (PROVIDERS[p].isAvailable()) return p;
  }
  return "anthropic";
}

export function listAvailableProviders(): ProviderName[] {
  return (Object.keys(PROVIDERS) as ProviderName[]).filter((p) => PROVIDERS[p].isAvailable());
}
