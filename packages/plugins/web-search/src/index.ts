// ============================================================
// 🌒 @openvesper/plugin-web-search
//
// Unified web search across multiple providers. User picks via env var
// OPENVESPER_SEARCH_PROVIDER (default: duckduckgo, free no-key).
//
// Supported providers:
//   - duckduckgo  (free, no API key)
//   - brave       (BRAVE_SEARCH_API_KEY)
//   - tavily      (TAVILY_API_KEY)
//   - serpapi     (SERPAPI_API_KEY)
//   - searxng     (SEARXNG_URL — your self-hosted instance)
// ============================================================

import axios from "axios";
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import type { ToolResult } from "@openvesper/plugin-sdk";

type Provider = "duckduckgo" | "brave" | "tavily" | "serpapi" | "searxng";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
}

function pickProvider(): Provider {
  const p = (process.env.OPENVESPER_SEARCH_PROVIDER || "duckduckgo").toLowerCase();
  if (["duckduckgo", "brave", "tavily", "serpapi", "searxng"].includes(p)) {
    return p as Provider;
  }
  return "duckduckgo";
}

// ── DuckDuckGo (HTML scrape — free, no key) ──────────────────────────

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 OpenVesper/1.0" },
    timeout: 10000,
  });
  const html = r.data as string;
  const results: SearchResult[] = [];
  const linkRe = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  const links: { url: string; title: string }[] = [];
  const snippets: string[] = [];
  let m;
  while ((m = linkRe.exec(html)) && links.length < limit) {
    let url = m[1];
    if (url.startsWith("//duckduckgo.com/l/?uddg=")) {
      try {
        url = decodeURIComponent(url.split("uddg=")[1].split("&")[0]);
      } catch {}
    }
    links.push({ url, title: stripTags(m[2]) });
  }
  while ((m = snippetRe.exec(html)) && snippets.length < limit) {
    snippets.push(stripTags(m[1]));
  }
  for (let i = 0; i < Math.min(links.length, limit); i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] || "",
      source: "duckduckgo",
    });
  }
  return results;
}

// ── Brave ────────────────────────────────────────────────────────────

async function searchBrave(query: string, limit: number): Promise<SearchResult[]> {
  if (!process.env.BRAVE_SEARCH_API_KEY) throw new Error("BRAVE_SEARCH_API_KEY required");
  const r = await axios.get("https://api.search.brave.com/res/v1/web/search", {
    headers: {
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY,
      Accept: "application/json",
    },
    params: { q: query, count: limit },
    timeout: 10000,
  });
  const items = r.data?.web?.results || [];
  return items.slice(0, limit).map((i: any) => ({
    title: i.title,
    url: i.url,
    snippet: i.description || "",
    source: "brave",
    publishedAt: i.page_age,
  }));
}

// ── Tavily ───────────────────────────────────────────────────────────

async function searchTavily(query: string, limit: number): Promise<SearchResult[]> {
  if (!process.env.TAVILY_API_KEY) throw new Error("TAVILY_API_KEY required");
  const r = await axios.post(
    "https://api.tavily.com/search",
    {
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: limit,
      search_depth: "basic",
    },
    { timeout: 15000 }
  );
  const items = r.data?.results || [];
  return items.slice(0, limit).map((i: any) => ({
    title: i.title,
    url: i.url,
    snippet: i.content || "",
    source: "tavily",
  }));
}

// ── SerpApi ──────────────────────────────────────────────────────────

async function searchSerpApi(query: string, limit: number): Promise<SearchResult[]> {
  if (!process.env.SERPAPI_API_KEY) throw new Error("SERPAPI_API_KEY required");
  const r = await axios.get("https://serpapi.com/search", {
    params: { q: query, api_key: process.env.SERPAPI_API_KEY, num: limit, engine: "google" },
    timeout: 15000,
  });
  const items = r.data?.organic_results || [];
  return items.slice(0, limit).map((i: any) => ({
    title: i.title,
    url: i.link,
    snippet: i.snippet || "",
    source: "serpapi",
  }));
}

// ── SearXNG (self-hosted) ────────────────────────────────────────────

async function searchSearXNG(query: string, limit: number): Promise<SearchResult[]> {
  const base = process.env.SEARXNG_URL;
  if (!base) throw new Error("SEARXNG_URL required (your self-hosted instance)");
  const r = await axios.get(`${base.replace(/\/$/, "")}/search`, {
    params: { q: query, format: "json" },
    timeout: 10000,
  });
  const items = r.data?.results || [];
  return items.slice(0, limit).map((i: any) => ({
    title: i.title,
    url: i.url,
    snippet: i.content || "",
    source: "searxng",
  }));
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ── Main dispatch ────────────────────────────────────────────────────

async function webSearch(query: string, limit = 5, providerOverride?: Provider): Promise<ToolResult> {
  const provider = providerOverride || pickProvider();
  try {
    let results: SearchResult[] = [];
    switch (provider) {
      case "brave":     results = await searchBrave(query, limit); break;
      case "tavily":    results = await searchTavily(query, limit); break;
      case "serpapi":   results = await searchSerpApi(query, limit); break;
      case "searxng":   results = await searchSearXNG(query, limit); break;
      case "duckduckgo":
      default:          results = await searchDuckDuckGo(query, limit); break;
    }
    return {
      success: true,
      data: {
        query,
        provider,
        resultCount: results.length,
        results,
      },
    };
  } catch (e: any) {
    return { success: false, error: `Search failed (${provider}): ${e.message}` };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-web-search",
  version: "1.0.0",
  description: "Unified web search across DuckDuckGo, Brave, Tavily, SerpApi, SearXNG",
  tools: [
    defineTool({
      name: "web_search",
      description:
        "Search the web. Free default (DuckDuckGo), or pick provider via OPENVESPER_SEARCH_PROVIDER env. Optional providers: brave, tavily, serpapi, searxng.",
      inputSchema: inputSchema(
        {
          query: { type: "string", description: "What to search for" },
          limit: { type: "number", description: "Max results (default 5, max 20)" },
          provider: {
            type: "string",
            description: "Override provider: duckduckgo, brave, tavily, serpapi, searxng",
          },
        },
        ["query"]
      ),
      handler: async (input) =>
        webSearch(
          input.query as string,
          Math.min(20, (input.limit as number) || 5),
          input.provider as Provider | undefined
        ),
      category: "web",
    }),
  ],
});
