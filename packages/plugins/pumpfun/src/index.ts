// ============================================================
// 🌒 @openvesper/plugin-pumpfun
// Pump.fun bonding curve memecoin launcher (Solana)
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const PUMPFUN = "https://frontend-api-v3.pump.fun";
const DEXSCREENER = "https://api.dexscreener.com";
const GRADUATION_MCAP = 69000;

async function pumpfunNew(limit: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${PUMPFUN}/coins/latest`, {
      params: { limit, includeNsfw: false },
      headers: { "User-Agent": "Mozilla/5.0" }, timeout: 12000,
    });
    const coins = (Array.isArray(r.data) ? r.data : []).slice(0, limit).map((c: any) => ({
      mint: c.mint, name: c.name, symbol: c.symbol,
      marketCapUSD: c.usd_market_cap,
      bondingProgress: Math.min(100, (c.usd_market_cap / GRADUATION_MCAP) * 100).toFixed(2) + "%",
      graduated: c.complete, raydiumPool: c.raydium_pool,
      ageMinutes: c.created_timestamp ? ((Date.now() - c.created_timestamp) / 60000).toFixed(0) : null,
      creator: c.creator, twitter: c.twitter,
    }));
    return { success: true, data: { count: coins.length, coins } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function pumpfunAnalysis(mint: string): Promise<ToolResult> {
  try {
    let coinData: any = {};
    try {
      const r = await axios.get(`${PUMPFUN}/coins/${mint}`, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 });
      coinData = r.data;
    } catch { /* fallback */ }

    const dexR = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${mint}`, { timeout: 10000 });
    const pair = dexR.data?.[0];
    const mcap = coinData.usd_market_cap || pair?.marketCap || 0;

    return {
      success: true,
      data: {
        mint,
        name: coinData.name || pair?.baseToken?.name,
        symbol: coinData.symbol || pair?.baseToken?.symbol,
        marketCapUSD: mcap,
        bondingProgress: Math.min(100, (mcap / GRADUATION_MCAP) * 100).toFixed(2) + "%",
        graduated: coinData.complete || pair?.dexId === "raydium",
        currentDex: pair?.dexId || "pump.fun bonding curve",
        priceUSD: pair?.priceUsd ? parseFloat(pair.priceUsd) : null,
        liquidity: pair?.liquidity?.usd,
        volume24h: pair?.volume?.h24,
        change24h: pair?.priceChange?.h24?.toFixed(2) + "%",
        urls: { pumpfun: `https://pump.fun/${mint}`, dexscreener: pair?.url },
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function pumpfunKOTH(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${PUMPFUN}/coins/king-of-the-hill`, {
      params: { limit: 50, includeNsfw: false },
      headers: { "User-Agent": "Mozilla/5.0" }, timeout: 12000,
    });
    const list = (Array.isArray(r.data) ? r.data : [r.data])
      .filter((c) => c && c.usd_market_cap)
      .map((c: any) => ({
        mint: c.mint, name: c.name, symbol: c.symbol,
        marketCapUSD: c.usd_market_cap,
        progress: ((c.usd_market_cap / GRADUATION_MCAP) * 100).toFixed(2) + "%",
        complete: c.complete,
      }))
      .sort((a, b) => b.marketCapUSD - a.marketCapUSD)
      .slice(0, 15);
    return { success: true, data: { candidates: list, note: "Tokens >75% bonding often migrate to Raydium soon." } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-pumpfun",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Pump.fun Solana bonding curve memecoin tools",
  license: "MIT",
  tools: [
    defineTool({
      name: "pumpfun_new",
      description: "Latest Pump.fun token launches with bonding curve progress",
      inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }),
      handler: async (input) => pumpfunNew((input.limit as number) || 30),
      category: "solana-memes",
    }),
    defineTool({
      name: "pumpfun_about_to_graduate",
      description: "Pump.fun tokens near Raydium graduation (~$69k mcap)",
      inputSchema: inputSchema({}),
      handler: async () => pumpfunKOTH(),
      category: "solana-memes",
    }),
    defineTool({
      name: "pumpfun_analysis",
      description: "Deep analysis of a Pump.fun token",
      inputSchema: inputSchema({ mint: { type: "string", description: "Token mint" } }, ["mint"]),
      handler: async (input) => pumpfunAnalysis(input.mint as string),
      category: "solana-memes",
    }),
  ]

});
