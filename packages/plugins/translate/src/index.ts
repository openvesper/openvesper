// ============================================================
// 🌒 @openvesper/plugin-translate
// Translation — DeepL, Google Translate, LibreTranslate (free)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

// ── LibreTranslate (FREE, self-host or public instance) ────

async function libreTranslate(text: string, source: string, target: string): Promise<ToolResult> {
  const host = process.env.LIBRETRANSLATE_HOST || "https://translate.argosopentech.com";
  try {
    const r = await fetch(`${host}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: source || "auto", target: target || "en", format: "text" }),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.error || `LibreTranslate: ${r.status}` };
    return {
      success: true,
      data: {
        provider: "LibreTranslate",
        source: source || "auto",
        target,
        original: text.slice(0, 200),
        translation: data.translatedText,
        detectedSource: data.detectedLanguage?.language,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── DeepL ───────────────────────────────────────────────────

async function deeplTranslate(text: string, source: string, target: string): Promise<ToolResult> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return { success: false, error: "DEEPL_API_KEY required" };

  // Free DeepL uses different endpoint
  const isFreeTier = apiKey.endsWith(":fx");
  const endpoint = isFreeTier
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  try {
    const params = new URLSearchParams({
      text,
      target_lang: (target || "EN").toUpperCase(),
    });
    if (source) params.set("source_lang", source.toUpperCase());

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.message || `DeepL: ${r.status}` };
    return {
      success: true,
      data: {
        provider: "DeepL",
        source: source || "auto",
        target,
        original: text.slice(0, 200),
        translation: data.translations?.[0]?.text,
        detectedSource: data.translations?.[0]?.detected_source_language,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Google Translate (Cloud) ────────────────────────────────

async function googleTranslate(text: string, source: string, target: string): Promise<ToolResult> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return { success: false, error: "GOOGLE_TRANSLATE_API_KEY required" };

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        target: target || "en",
        ...(source ? { source } : {}),
      }),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.error?.message };
    return {
      success: true,
      data: {
        provider: "Google Translate",
        source: source || "auto",
        target,
        original: text.slice(0, 200),
        translation: data.data?.translations?.[0]?.translatedText,
        detectedSource: data.data?.translations?.[0]?.detectedSourceLanguage,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function detectLanguage(text: string): Promise<ToolResult> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const r = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text }),
      });
      const data = await r.json();
      if (r.ok) {
        const d = data.data?.detections?.[0]?.[0];
        return { success: true, data: { provider: "Google", language: d.language, confidence: d.confidence } };
      }
    } catch { /* fall through */ }
  }
  // Fall back to LibreTranslate
  const host = process.env.LIBRETRANSLATE_HOST || "https://translate.argosopentech.com";
  try {
    const r = await fetch(`${host}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text.slice(0, 500) }),
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: "Could not detect language" };
    return { success: true, data: { provider: "LibreTranslate", language: data[0]?.language, confidence: data[0]?.confidence } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-translate",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Translation — LibreTranslate (FREE), DeepL, Google Translate",
  license: "MIT",
  tools: [
    defineTool({ name: "translate", description: "Translate text (auto-picks best provider available)", inputSchema: inputSchema({ text: { type: "string", description: "Text to translate" }, target: { type: "string", description: "Target language code (en, tr, es, de)" }, source: { type: "string", description: "Source language (optional, auto-detect)" } }, ["text", "target"]), handler: async (i) => {
      // Try DeepL → Google → LibreTranslate
      if (process.env.DEEPL_API_KEY) return deeplTranslate(i.text as string, i.source as string || "", i.target as string);
      if (process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_API_KEY) return googleTranslate(i.text as string, i.source as string || "", i.target as string);
      return libreTranslate(i.text as string, i.source as string || "auto", i.target as string);
    }, category: "translate" }),
    defineTool({ name: "translate_libretranslate", description: "Translate using LibreTranslate (free)", inputSchema: inputSchema({ text: { type: "string" }, target: { type: "string", description: "Target" }, source: { type: "string", description: "Source (or 'auto')" } }, ["text", "target"]), handler: async (i) => libreTranslate(i.text as string, (i.source as string) || "auto", i.target as string), category: "translate" }),
    defineTool({ name: "translate_deepl", description: "Translate using DeepL (high quality, requires DEEPL_API_KEY)", inputSchema: inputSchema({ text: { type: "string" }, target: { type: "string", description: "Target (EN, DE, ES, FR, TR)" }, source: { type: "string", description: "Source (optional)" } }, ["text", "target"]), handler: async (i) => deeplTranslate(i.text as string, i.source as string || "", i.target as string), category: "translate" }),
    defineTool({ name: "translate_google", description: "Translate using Google Translate", inputSchema: inputSchema({ text: { type: "string" }, target: { type: "string", description: "Target" }, source: { type: "string", description: "Source (optional)" } }, ["text", "target"]), handler: async (i) => googleTranslate(i.text as string, i.source as string || "", i.target as string), category: "translate" }),
    defineTool({ name: "detect_language", description: "Detect the language of a text", inputSchema: inputSchema({ text: { type: "string", description: "Text" } }, ["text"]), handler: async (i) => detectLanguage(i.text as string), category: "translate" }),
  ]

});
