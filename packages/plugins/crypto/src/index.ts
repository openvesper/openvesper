// ============================================================
// 🌒 @openvesper/plugin-crypto
// General crypto: CoinGecko prices, Binance TA, fear&greed
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const CG = "https://api.coingecko.com/api/v3";
const BINANCE = "https://api.binance.com/api/v3";

const cgHeaders = () => process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {};

async function cryptoPrice(coinIds: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/simple/price`, {
      params: { ids: coinIds, vs_currencies: "usd", include_24hr_change: true, include_market_cap: true },
      headers: cgHeaders(), timeout: 10000,
    });
    return { success: true, data: r.data };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function topCoins(limit: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/coins/markets`, {
      params: { vs_currency: "usd", order: "market_cap_desc", per_page: limit, page: 1, price_change_percentage: "24h,7d" },
      headers: cgHeaders(), timeout: 10000,
    });
    return {
      success: true,
      data: { coins: r.data.map((c: any) => ({
        rank: c.market_cap_rank, name: c.name, symbol: c.symbol.toUpperCase(),
        price: c.current_price, marketCap: c.market_cap,
        change24h: c.price_change_percentage_24h?.toFixed(2) + "%",
        change7d: c.price_change_percentage_7d_in_currency?.toFixed(2) + "%",
      })) },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function trending(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/search/trending`, { headers: cgHeaders(), timeout: 10000 });
    return {
      success: true,
      data: { trending: r.data.coins.map((c: any) => ({ name: c.item.name, symbol: c.item.symbol, rank: c.item.market_cap_rank })) },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function globalMarket(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${CG}/global`, { headers: cgHeaders(), timeout: 10000 });
    const d = r.data?.data;
    return {
      success: true,
      data: {
        totalMarketCapUSD: d.total_market_cap.usd,
        total24hVolumeUSD: d.total_volume.usd,
        btcDominance: d.market_cap_percentage.btc?.toFixed(2) + "%",
        ethDominance: d.market_cap_percentage.eth?.toFixed(2) + "%",
        marketCapChange24h: d.market_cap_change_percentage_24h_usd?.toFixed(2) + "%",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function binanceTA(symbol: string, interval: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${BINANCE}/klines`, {
      params: { symbol: symbol.toUpperCase(), interval, limit: 100 }, timeout: 10000,
    });
    const closes = r.data.map((k: any) => parseFloat(k[4]));
    const last = closes[closes.length - 1];
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const sma50 = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;

    // RSI
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) gains += d; else losses -= d;
    }
    const rs = (gains / 14) / (losses / 14 || 1);
    const rsi = 100 - 100 / (1 + rs);

    const trend = sma20 > sma50 && rsi > 50 && rsi < 70 ? "🟢 BULLISH"
                : sma20 < sma50 && rsi < 50 ? "🔴 BEARISH" : "⚪ NEUTRAL";

    return {
      success: true,
      data: {
        symbol, interval, currentPrice: last,
        rsi: rsi.toFixed(2), sma20: sma20.toFixed(4), sma50: sma50.toFixed(4),
        trend,
        signal: rsi < 30 ? "Oversold — potential bounce" : rsi > 70 ? "Overbought — caution" : "Neutral",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function fearGreed(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.alternative.me/fng/?limit=7", { timeout: 8000 });
    const data = r.data?.data || [];
    const current = data[0];
    return {
      success: true,
      data: {
        current: { value: parseInt(current.value), classification: current.value_classification },
        history: data.slice(1, 7).map((d: any) => ({ value: parseInt(d.value), classification: d.value_classification })),
        interpretation: parseInt(current.value) <= 25 ? "🟢 Extreme fear — historically buy zone"
                       : parseInt(current.value) >= 75 ? "🔴 Extreme greed — historically sell zone"
                       : "⚪ Mid range",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-crypto",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Crypto data: prices, TA, fear & greed",
  license: "MIT",
  tools: [
    defineTool({ name: "crypto_price", description: "Real-time crypto prices from CoinGecko", inputSchema: inputSchema({ coin_ids: { type: "string", description: "Comma-separated IDs: bitcoin,ethereum,solana" } }, ["coin_ids"]), handler: async (i) => cryptoPrice(i.coin_ids as string), category: "crypto" }),
    defineTool({ name: "top_coins", description: "Top coins by market cap", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => topCoins((i.limit as number) || 20), category: "crypto" }),
    defineTool({ name: "trending_coins", description: "Trending coins on CoinGecko", inputSchema: inputSchema({}), handler: async () => trending(), category: "crypto" }),
    defineTool({ name: "global_market", description: "Global crypto market: total cap, BTC/ETH dominance", inputSchema: inputSchema({}), handler: async () => globalMarket(), category: "crypto" }),
    defineTool({ name: "binance_analysis", description: "Technical analysis: RSI, SMA, trend signals", inputSchema: inputSchema({ symbol: { type: "string", description: "BTCUSDT etc" }, interval: { type: "string", description: "1h, 4h, 1d", enum: ["1m","5m","15m","30m","1h","4h","1d","1w"] } }, ["symbol"]), handler: async (i) => binanceTA(i.symbol as string, (i.interval as string) || "1h"), category: "crypto" }),
    defineTool({ name: "fear_greed_index", description: "Current crypto Fear & Greed Index + 7d history", inputSchema: inputSchema({}), handler: async () => fearGreed(), category: "crypto" }),
  ]

});
