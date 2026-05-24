// ============================================================
// 🛸 Terminal of UFO — RSS Feed Reader + Forex/Stocks Tool
// ============================================================

import axios from "axios";
import * as cheerio from "cheerio";
import { ToolResult } from "@openvesper/plugin-sdk";

// ── RSS Feeds ─────────────────────────────────────────────────────────────────

const DEFAULT_FEEDS: Record<string, string> = {
  "cointelegraph":  "https://cointelegraph.com/rss",
  "coindesk":       "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "theblock":       "https://www.theblock.co/rss.xml",
  "decrypt":        "https://decrypt.co/feed",
  "bitcoinmagazine":"https://bitcoinmagazine.com/feed",
  "unchained":      "https://unchainedcrypto.com/feed/",
  "defipulse":      "https://defipulse.com/blog/feed/",
  "hackernews":     "https://news.ycombinator.com/rss",
  "techcrunch":     "https://techcrunch.com/feed/",
  "bloomberg":      "https://feeds.bloomberg.com/markets/news.rss",
  "reuters":        "https://feeds.reuters.com/reuters/businessNews",
  "wsj":            "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
};

export async function readRSSFeed(feedUrlOrName: string, limit = 10): Promise<ToolResult> {
  try {
    const url = DEFAULT_FEEDS[feedUrlOrName.toLowerCase()] || feedUrlOrName;

    const r = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TerminalOfUFO/2.0; RSS reader)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      timeout: 12000,
    });

    const $ = cheerio.load(r.data, { xmlMode: true });
    const items: {
      title: string; link: string; description: string;
      pubDate: string; author: string; category: string[];
    }[] = [];

    $("item").each((i, el) => {
      if (i >= limit) return;
      const title = $(el).find("title").first().text().trim();
      const link = $(el).find("link").first().text().trim() ||
                   $(el).find("link").first().attr("href") || "";
      const desc = $(el).find("description").first().text()
        .replace(/<[^>]*>/g, "").trim().slice(0, 200);
      const pubDate = $(el).find("pubDate").first().text().trim() ||
                      $(el).find("dc\\:date").first().text().trim();
      const author = $(el).find("author").first().text().trim() ||
                     $(el).find("dc\\:creator").first().text().trim();
      const cats: string[] = [];
      $(el).find("category").each((_, c) => { cats.push($(c).text().trim()); });

      if (title) items.push({ title, link, description: desc, pubDate, author, category: cats });
    });

    const feedTitle = $("channel > title").first().text().trim() ||
                      $("feed > title").first().text().trim();

    return {
      success: true,
      data: { feedName: feedUrlOrName, feedTitle, url, itemCount: items.length, items },
    };
  } catch (e: unknown) {
    return { success: false, error: `RSS feed: ${e instanceof Error ? e.message : e}` };
  }
}

export async function readMultipleFeeds(feedNames: string[], limit = 5): Promise<ToolResult> {
  try {
    const results = await Promise.allSettled(
      feedNames.map((f) => readRSSFeed(f, limit))
    );

    const allItems: {
      source: string; title: string; link: string;
      description: string; pubDate: string;
    }[] = [];

    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.success) {
        const d = r.value.data as { feedName: string; items: { title: string; link: string; description: string; pubDate: string }[] };
        d.items.forEach((item) => {
          allItems.push({ source: feedNames[i], ...item });
        });
      }
    });

    // Sort by date (rough)
    allItems.sort((a, b) => {
      const da = new Date(a.pubDate || 0).getTime();
      const db = new Date(b.pubDate || 0).getTime();
      return db - da;
    });

    return { success: true, data: { feeds: feedNames, totalItems: allItems.length, items: allItems.slice(0, 30) } };
  } catch (e: unknown) {
    return { success: false, error: `Multi-feed: ${e instanceof Error ? e.message : e}` };
  }
}

export function listAvailableFeeds(): ToolResult {
  return {
    success: true,
    data: {
      availableFeeds: Object.keys(DEFAULT_FEEDS),
      usage: "Use feed name (e.g. 'cointelegraph') or a direct RSS URL",
    },
  };
}

// ── Forex / Stocks ────────────────────────────────────────────────────────────

// Uses: exchangerate.host (free, no key) + Yahoo Finance via scraping

export async function getForexRates(base = "USD", symbols?: string[]): Promise<ToolResult> {
  try {
    const targets = symbols?.join(",") || "EUR,GBP,JPY,TRY,CHF,CAD,AUD,CNY,KRW,SGD,AED,SAR,BRL,INR,MXN";

    // Try exchangerate-api (free tier)
    const r = await axios.get(`https://open.er-api.com/v6/latest/${base.toUpperCase()}`, {
      timeout: 10000,
    });

    if (r.data.result !== "success") throw new Error("API error");

    const rates = r.data.rates;
    const filtered = symbols
      ? Object.fromEntries(symbols.map((s) => [s, rates[s.toUpperCase()]]).filter(([, v]) => v))
      : Object.fromEntries(
          targets.split(",").map((s) => [s, rates[s.toUpperCase()]]).filter(([, v]) => v)
        );

    return {
      success: true,
      data: {
        base: base.toUpperCase(),
        updatedAt: r.data.time_last_update_utc,
        nextUpdate: r.data.time_next_update_utc,
        rates: filtered,
      },
    };
  } catch {
    // Fallback: try frankfurter.app
    try {
      const sym = symbols?.join(",") || "EUR,GBP,JPY,TRY,CHF,CAD,AUD";
      const r2 = await axios.get(`https://api.frankfurter.app/latest`, {
        params: { from: base.toUpperCase(), to: sym },
        timeout: 10000,
      });
      return {
        success: true,
        data: { base: r2.data.base, date: r2.data.date, rates: r2.data.rates },
      };
    } catch (e2: unknown) {
      return { success: false, error: `Forex: ${e2 instanceof Error ? e2.message : e2}` };
    }
  }
}

export async function getStockQuote(symbols: string[]): Promise<ToolResult> {
  try {
    // Yahoo Finance scraping
    const results = await Promise.allSettled(
      symbols.slice(0, 5).map(async (sym) => {
        const r = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${sym.toUpperCase()}`, {
          params: { interval: "1d", range: "5d" },
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 10000,
        });

        const meta = r.data?.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const timestamps = r.data.chart.result[0].timestamp || [];
        const closes = r.data.chart.result[0].indicators?.quote?.[0]?.close || [];
        const prices = timestamps.map((t: number, i: number) => ({
          date: new Date(t * 1000).toLocaleDateString(),
          close: closes[i]?.toFixed(2),
        })).filter((p: { close: string | undefined }) => p.close);

        const change = meta.regularMarketChange || 0;
        const changePct = meta.regularMarketChangePercent || 0;

        return {
          symbol: sym.toUpperCase(),
          name: meta.longName || meta.shortName || sym,
          price: meta.regularMarketPrice?.toFixed(2),
          currency: meta.currency,
          change: change.toFixed(2),
          changePct: changePct.toFixed(2) + "%",
          open: meta.regularMarketOpen?.toFixed(2),
          high: meta.regularMarketDayHigh?.toFixed(2),
          low: meta.regularMarketDayLow?.toFixed(2),
          volume: meta.regularMarketVolume?.toLocaleString(),
          marketCap: meta.marketCap ? formatLargeNum(meta.marketCap) : "N/A",
          fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh?.toFixed(2),
          fiftyTwoWeekLow: meta.fiftyTwoWeekLow?.toFixed(2),
          exchange: meta.exchangeName,
          recentPrices: prices.slice(-5),
          trend: changePct > 0 ? "🟢 UP" : changePct < 0 ? "🔴 DOWN" : "⚪ FLAT",
        };
      })
    );

    const quotes = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => (r as PromiseFulfilledResult<unknown>).value);

    return { success: true, data: { quotes } };
  } catch (e: unknown) {
    return { success: false, error: `Stock quote: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getMarketIndices(): Promise<ToolResult> {
  const indices = ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX", "^FTSE", "^N225", "GC=F", "CL=F", "^TNX"];
  try {
    const r = await getStockQuote(indices);
    if (!r.success) return r;

    const named = (r.data as { quotes: { symbol: string; price: string; changePct: string; trend: string }[] }).quotes.map((q) => ({
      ...q,
      displayName: {
        "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "NASDAQ",
        "^RUT": "Russell 2000", "^VIX": "VIX (Fear)", "^FTSE": "FTSE 100",
        "^N225": "Nikkei 225", "GC=F": "Gold Futures", "CL=F": "Oil (WTI)", "^TNX": "10Y Treasury",
      }[q.symbol] || q.symbol,
    }));

    return { success: true, data: { indices: named, timestamp: new Date().toISOString() } };
  } catch (e: unknown) {
    return { success: false, error: `Market indices: ${e instanceof Error ? e.message : e}` };
  }
}

function formatLargeNum(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}
