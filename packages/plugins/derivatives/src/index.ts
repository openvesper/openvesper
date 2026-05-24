import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { fearGreedIndex, recentLiquidations, openInterest, longShortRatio, topGainersLosers, volatilityRanking } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-derivatives", version: "1.0.0", author: "OpenVesper",
  description: "Crypto derivatives — F&G, liquidations, OI, L/S ratio, volatility", license: "MIT",
  tools: [
    defineTool({ name: "fear_greed_index", description: "Crypto Fear & Greed Index", inputSchema: inputSchema({}), handler: async () => fearGreedIndex(), category: "derivatives" }),
    defineTool({ name: "recent_liquidations", description: "Recent liquidations for a symbol", inputSchema: inputSchema({ symbol: { type: "string", description: "BTCUSDT etc" } }), handler: async (i) => recentLiquidations((i.symbol as string) || "BTCUSDT"), category: "derivatives" }),
    defineTool({ name: "open_interest", description: "Open interest for a perp", inputSchema: inputSchema({ symbol: { type: "string", description: "Symbol" } }), handler: async (i) => openInterest((i.symbol as string) || "BTCUSDT"), category: "derivatives" }),
    defineTool({ name: "long_short_ratio", description: "Long/short ratio", inputSchema: inputSchema({ symbol: { type: "string", description: "Symbol" } }), handler: async (i) => longShortRatio((i.symbol as string) || "BTCUSDT"), category: "derivatives" }),
    defineTool({ name: "top_gainers_losers", description: "24h gainers/losers", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => topGainersLosers((i.limit as number) || 10), category: "derivatives" }),
    defineTool({ name: "volatility_ranking", description: "Coins ranked by volatility", inputSchema: inputSchema({}), handler: async () => volatilityRanking(), category: "derivatives" }),
  ]

});
