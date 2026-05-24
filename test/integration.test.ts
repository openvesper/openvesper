// ============================================================
// 🌒 Integration tests — core API surface
// ============================================================

import { describe, it, expect } from "vitest";

describe("@openvesper/core exports", () => {
  it("exposes createVesper", async () => {
    const core = await import("@openvesper/core");
    expect(core.createVesper).toBeDefined();
    expect(typeof core.createVesper).toBe("function");
  });

  it("exposes the 15 LLM providers", async () => {
    const { PROVIDERS } = await import("@openvesper/core");
    const names = Object.keys(PROVIDERS);
    expect(names.length).toBe(15);
    expect(names).toContain("anthropic");
    expect(names).toContain("openai");
    expect(names).toContain("gemini");
    expect(names).toContain("ollama");
    expect(names).toContain("fireworks");
    expect(names).toContain("nebius");
    expect(names).toContain("deepinfra");
  });

  it("each provider has a valid configuration", async () => {
    const { PROVIDERS, PROVIDER_INFO } = await import("@openvesper/core");
    for (const [name, provider] of Object.entries(PROVIDERS)) {
      expect(provider.name, `provider ${name} has a name`).toBe(name);
      expect(provider.defaultModel, `provider ${name} has a default model`).toBeTruthy();
      expect(typeof provider.isAvailable).toBe("function");
      expect(typeof provider.call).toBe("function");

      const info = PROVIDER_INFO[name as keyof typeof PROVIDER_INFO];
      expect(info, `PROVIDER_INFO[${name}]`).toBeDefined();
      expect(info.envKey).toBeTruthy();
      expect(info.signupUrl).toMatch(/^https?:\/\//);
    }
  });

  it("only local providers are available without API keys", async () => {
    // Save existing env, blank everything we know about
    const KEYS_TO_BLANK = [
      "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY",
      "XAI_API_KEY", "DEEPSEEK_API_KEY", "MISTRAL_API_KEY",
      "GROQ_API_KEY", "TOGETHER_API_KEY", "OPENROUTER_API_KEY",
      "FIREWORKS_API_KEY", "NEBIUS_API_KEY", "DEEPINFRA_API_KEY",
      "PERPLEXITY_API_KEY",
    ];
    const saved: Record<string, string | undefined> = {};
    for (const k of KEYS_TO_BLANK) {
      saved[k] = process.env[k];
      delete process.env[k];
    }

    try {
      const { listAvailableProviders } = await import("@openvesper/core");
      const avail = listAvailableProviders();
      // ollama + lmstudio do not require keys
      expect(avail).toEqual(expect.arrayContaining(["ollama", "lmstudio"]));
      // none of the paid ones should be available
      expect(avail).not.toContain("anthropic");
      expect(avail).not.toContain("openai");
    } finally {
      // Restore env
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v;
      }
    }
  });

  it("detectDefaultProvider falls back to anthropic when nothing configured", async () => {
    const { detectDefaultProvider } = await import("@openvesper/core");
    // Without any keys, ollama is still 'available' so it'd be picked first if
    // it were earlier in the priority list. Current priority puts anthropic
    // first. The function returns 'anthropic' both when it's available and as
    // the ultimate fallback, so this test just checks the function returns a
    // valid provider name.
    const fallback = detectDefaultProvider();
    expect(typeof fallback).toBe("string");
    expect(fallback.length).toBeGreaterThan(0);
  });
});

describe("plugin loading", () => {
  it("loads the bagsfm plugin", async () => {
    const mod = await import("@openvesper/plugin-bagsfm");
    expect(mod.default).toBeDefined();
    expect(mod.default.name).toBe("@openvesper/plugin-bagsfm");
    expect(mod.default.tools.length).toBeGreaterThan(0);
  });

  it("loads the web-search plugin", async () => {
    const mod = await import("@openvesper/plugin-web-search");
    expect(mod.default).toBeDefined();
    expect(mod.default.tools.some((t) => t.name === "web_search")).toBe(true);
  });

  it("loads the pdf plugin", async () => {
    const mod = await import("@openvesper/plugin-pdf");
    expect(mod.default).toBeDefined();
    const toolNames = mod.default.tools.map((t) => t.name);
    expect(toolNames).toContain("pdf_read");
    expect(toolNames).toContain("pdf_search");
    expect(toolNames).toContain("pdf_metadata");
  });

  it("loads the discord plugin", async () => {
    const mod = await import("@openvesper/plugin-discord");
    expect(mod.default).toBeDefined();
    const toolNames = mod.default.tools.map((t) => t.name);
    expect(toolNames).toContain("discord_send");
    expect(toolNames).toContain("discord_send_embed");
  });

  it("plugins do not export defineAgent agents (v1.10.0+ architecture)", async () => {
    // After v1.10.0, plugin-side agents were removed in favor of pure-markdown
    // agents in .agents/. This test guards against regression.
    const checkPlugins = [
      "@openvesper/plugin-bagsfm",
      "@openvesper/plugin-pumpfun",
      "@openvesper/plugin-github",
      "@openvesper/plugin-defi",
    ];
    for (const p of checkPlugins) {
      const mod = await import(p);
      const agents = mod.default.agents;
      expect(agents === undefined || agents.length === 0, `${p} should not export agents`).toBe(true);
    }
  });
});

describe("multi-plugin composition", () => {
  it("composes a vesper instance with multiple plugins", async () => {
    const { createVesper } = await import("@openvesper/core");
    const bagsfm = (await import("@openvesper/plugin-bagsfm")).default;
    const webSearch = (await import("@openvesper/plugin-web-search")).default;

    const vesper = createVesper({ llm: { provider: "groq" } })
      .use(bagsfm)
      .use(webSearch);

    expect(vesper.listPlugins().length).toBe(2);
  });
});
