// ============================================================
// 🌒 @openvesper/plugin-research
// Web search, news, RSS feeds
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

async function webSearch(query: string, num = 6): Promise<ToolResult> {
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      const r = await axios.post("https://google.serper.dev/search", { q: query, num }, {
        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" }, timeout: 10000,
      });
      return {
        success: true,
        data: {
          results: (r.data?.organic || []).slice(0, num).map((o: any) => ({ title: o.title, url: o.link, snippet: o.snippet })),
        },
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  // DuckDuckGo fallback
  try {
    const r = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_redirect: "1", no_html: "1" }, timeout: 10000,
    });
    return {
      success: true,
      data: {
        results: (r.data?.RelatedTopics || []).slice(0, num).map((t: any) => ({
          title: t.Text?.split(" - ")[0],
          url: t.FirstURL,
          snippet: t.Text,
        })).filter((r: any) => r.url),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function fetchPage(url: string): Promise<ToolResult> {
  try {
    const r = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (OpenVesper)" }, timeout: 15000, maxContentLength: 500000,
    });
    const html = r.data;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || "Untitled";
    const text = String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 5000);
    return { success: true, data: { url, title, content: text } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

const RSS_FEEDS: Record<string, string> = {
  cointelegraph: "https://cointelegraph.com/rss",
  coindesk: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  theblock: "https://www.theblock.co/rss.xml",
  decrypt: "https://decrypt.co/feed",
  hackernews: "https://news.ycombinator.com/rss",
  techcrunch: "https://techcrunch.com/feed/",
};

async function rssRead(feed: string, limit: number): Promise<ToolResult> {
  try {
    const url = RSS_FEEDS[feed.toLowerCase()] || feed;
    const r = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 12000 });
    const xml = r.data;
    const items: any[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
      const it = match[1];
      const title = it.match(/<title[^>]*>(?:<!\[CDATA\[)?([^<\]]+)/i)?.[1]?.trim() || "";
      const link = it.match(/<link[^>]*>([^<]+)/i)?.[1]?.trim() || "";
      const date = it.match(/<pubDate[^>]*>([^<]+)/i)?.[1]?.trim() || "";
      const desc = it.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 200) || "";
      items.push({ title, link, date, description: desc });
    }
    return { success: true, data: { feed, items } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function rssList(): Promise<ToolResult> {
  return { success: true, data: { availableFeeds: Object.keys(RSS_FEEDS) } };
}

export default definePlugin({
  name: "@openvesper/plugin-research",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Web search, news, RSS feeds",
  license: "MIT",
  tools: [
    defineTool({ name: "web_search", description: "Search the web (Serper or DuckDuckGo)", inputSchema: inputSchema({ query: { type: "string", description: "Search query" }, num_results: { type: "number", description: "Results count" } }, ["query"]), handler: async (i) => webSearch(i.query as string, (i.num_results as number) || 6), category: "research", permission: "external" }),
    defineTool({ name: "fetch_page", description: "Fetch text content from URL", inputSchema: inputSchema({ url: { type: "string", description: "URL" } }, ["url"]), handler: async (i) => fetchPage(i.url as string), category: "research", permission: "external" }),
    defineTool({ name: "rss_read", description: "Read RSS feed. Built-in: cointelegraph, coindesk, theblock, decrypt, hackernews, techcrunch", inputSchema: inputSchema({ feed: { type: "string", description: "Feed name or URL" }, limit: { type: "number", description: "Items" } }, ["feed"]), handler: async (i) => rssRead(i.feed as string, (i.limit as number) || 10), category: "research", permission: "external" }),
    defineTool({ name: "rss_list", description: "List built-in RSS feeds", inputSchema: inputSchema({}), handler: async () => rssList(), category: "research", permission: "read" }),
  ]

});
