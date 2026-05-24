import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { readRSSFeed, readMultipleFeeds, listAvailableFeeds, getForexRates, getStockQuote, getMarketIndices } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-macro", version: "1.0.0", author: "OpenVesper",
  description: "Macro data — RSS news, forex, stocks, indices", license: "MIT",
  tools: [
    defineTool({ name: "rss_read", description: "Read single RSS feed", inputSchema: inputSchema({ feed: { type: "string", description: "Feed name/URL" }, limit: { type: "number", description: "Count" } }, ["feed"]), handler: async (i) => readRSSFeed(i.feed as string, (i.limit as number) || 10), category: "research" }),
    defineTool({ name: "rss_multi", description: "Read multiple RSS feeds", inputSchema: inputSchema({ feeds: { type: "array", description: "Feed names" }, limit: { type: "number", description: "Per feed" } }, ["feeds"]), handler: async (i) => readMultipleFeeds(i.feeds as string[], (i.limit as number) || 5), category: "research" }),
    defineTool({ name: "rss_list", description: "List built-in RSS feeds", inputSchema: inputSchema({}), handler: async () => listAvailableFeeds(), category: "research" }),
    defineTool({ name: "forex_rates", description: "Forex exchange rates", inputSchema: inputSchema({ base: { type: "string", description: "Base currency" }, symbols: { type: "array", description: "Currency codes" } }), handler: async (i) => getForexRates(i.base as string || "USD", (i.symbols as any) || []), category: "macro" }),
    defineTool({ name: "stock_quote", description: "Stock quotes (Yahoo Finance)", inputSchema: inputSchema({ symbols: { type: "array", description: "Tickers" } }, ["symbols"]), handler: async (i) => getStockQuote(i.symbols as string[]), category: "macro" }),
    defineTool({ name: "market_indices", description: "S&P 500, Nasdaq, Dow, VIX etc.", inputSchema: inputSchema({}), handler: async () => getMarketIndices(), category: "macro" }),
  ]

});
