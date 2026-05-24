// ============================================================
// 🛸 Terminal of UFO — Derivatives, Fear&Greed, Sentiment
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

// ── Fear & Greed Index ────────────────────────────────────────────────────────

export async function fearGreedIndex(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.alternative.me/fng/?limit=7", { timeout: 8000 });
    const data = r.data?.data || [];
    const current = data[0];
    return {
      success: true,
      data: {
        current: {
          value: parseInt(current.value),
          classification: current.value_classification,
          date: new Date(parseInt(current.timestamp) * 1000).toISOString().split("T")[0],
        },
        history: data.slice(1, 7).map((d: { value: string; value_classification: string; timestamp: string }) => ({
          value: parseInt(d.value), classification: d.value_classification,
          date: new Date(parseInt(d.timestamp) * 1000).toISOString().split("T")[0],
        })),
        interpretation: parseInt(current.value) <= 25
          ? "🟢 Extreme fear — historically a buy zone"
          : parseInt(current.value) <= 45
          ? "🟡 Fear — caution but opportunity"
          : parseInt(current.value) <= 55
          ? "⚪ Neutral"
          : parseInt(current.value) <= 75
          ? "🟠 Greed — be cautious"
          : "🔴 Extreme greed — historically a sell zone",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Fear & Greed: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Liquidations (Binance public data) ────────────────────────────────────────

export async function recentLiquidations(symbol = "BTCUSDT"): Promise<ToolResult> {
  try {
    const r = await axios.get("https://fapi.binance.com/fapi/v1/forceOrders", {
      params: { symbol: symbol.toUpperCase(), limit: 20 },
      timeout: 10000,
    });
    const liqs = (r.data || []).map((l: {
      symbol: string; side: string; origQty: string; price: string;
      executedQty: string; time: number; status: string;
    }) => ({
      symbol: l.symbol, side: l.side,
      qty: parseFloat(l.origQty), price: parseFloat(l.price),
      executedQty: parseFloat(l.executedQty),
      time: new Date(l.time).toISOString(),
      status: l.status,
    }));

    const longLiqs = liqs.filter((l: { side: string }) => l.side === "SELL");
    const shortLiqs = liqs.filter((l: { side: string }) => l.side === "BUY");

    return {
      success: true,
      data: {
        symbol,
        recentCount: liqs.length,
        longLiquidated: longLiqs.length,
        shortLiquidated: shortLiqs.length,
        liquidations: liqs.slice(0, 10),
        interpretation: longLiqs.length > shortLiqs.length * 2
          ? "🔴 Heavy LONG liquidations — bearish flush"
          : shortLiqs.length > longLiqs.length * 2
          ? "🟢 Heavy SHORT liquidations — short squeeze"
          : "⚪ Balanced liquidations",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Liquidations: ${e instanceof Error ? e.message : e}` };
  }
}

export async function openInterest(symbol = "BTCUSDT"): Promise<ToolResult> {
  try {
    const [oiR, oiHistR] = await Promise.allSettled([
      axios.get("https://fapi.binance.com/fapi/v1/openInterest", {
        params: { symbol: symbol.toUpperCase() }, timeout: 8000,
      }),
      axios.get("https://fapi.binance.com/futures/data/openInterestHist", {
        params: { symbol: symbol.toUpperCase(), period: "1h", limit: 24 }, timeout: 8000,
      }),
    ]);

    const current = oiR.status === "fulfilled" ? parseFloat(oiR.value.data.openInterest) : 0;
    const history = oiHistR.status === "fulfilled"
      ? oiHistR.value.data.map((h: { sumOpenInterest: string; sumOpenInterestValue: string; timestamp: number }) => ({
          oi: parseFloat(h.sumOpenInterest),
          oiUsd: parseFloat(h.sumOpenInterestValue),
          time: new Date(h.timestamp).toISOString(),
        }))
      : [];

    const oi24hAgo = history[0]?.oi || current;
    const change24h = oi24hAgo > 0 ? ((current - oi24hAgo) / oi24hAgo) * 100 : 0;

    return {
      success: true,
      data: {
        symbol,
        currentOI: current,
        change24h: change24h.toFixed(2) + "%",
        interpretation: change24h > 5
          ? "🟢 OI increasing — new positions opening (bullish if price up, bearish if price down)"
          : change24h < -5
          ? "🟡 OI decreasing — positions closing (cooling off)"
          : "⚪ OI stable",
        last24hSnapshots: history.slice(-6),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Open interest: ${e instanceof Error ? e.message : e}` };
  }
}

export async function longShortRatio(symbol = "BTCUSDT"): Promise<ToolResult> {
  try {
    const [topR, globalR] = await Promise.allSettled([
      axios.get("https://fapi.binance.com/futures/data/topLongShortAccountRatio", {
        params: { symbol: symbol.toUpperCase(), period: "1h", limit: 24 }, timeout: 8000,
      }),
      axios.get("https://fapi.binance.com/futures/data/globalLongShortAccountRatio", {
        params: { symbol: symbol.toUpperCase(), period: "1h", limit: 24 }, timeout: 8000,
      }),
    ]);

    const topAccounts = topR.status === "fulfilled" ? topR.value.data?.[topR.value.data.length - 1] : null;
    const globalAccounts = globalR.status === "fulfilled" ? globalR.value.data?.[globalR.value.data.length - 1] : null;

    return {
      success: true,
      data: {
        symbol,
        topAccounts: topAccounts ? {
          longShortRatio: parseFloat(topAccounts.longShortRatio).toFixed(2),
          longPercent: (parseFloat(topAccounts.longAccount) * 100).toFixed(1) + "%",
          shortPercent: (parseFloat(topAccounts.shortAccount) * 100).toFixed(1) + "%",
        } : null,
        globalAccounts: globalAccounts ? {
          longShortRatio: parseFloat(globalAccounts.longShortRatio).toFixed(2),
          longPercent: (parseFloat(globalAccounts.longAccount) * 100).toFixed(1) + "%",
          shortPercent: (parseFloat(globalAccounts.shortAccount) * 100).toFixed(1) + "%",
        } : null,
        interpretation: topAccounts && parseFloat(topAccounts.longShortRatio) > 2
          ? "🔴 Top traders heavily LONG — contrarian SELL signal"
          : topAccounts && parseFloat(topAccounts.longShortRatio) < 0.5
          ? "🟢 Top traders heavily SHORT — contrarian BUY signal"
          : "⚪ Balanced positioning",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Long/short ratio: ${e instanceof Error ? e.message : e}` };
  }
}

export async function topGainersLosers(limit = 10): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
      params: {
        vs_currency: "usd", order: "market_cap_desc",
        per_page: 250, page: 1, sparkline: false,
        price_change_percentage: "24h",
      },
      headers: process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {},
      timeout: 10000,
    });

    const coins = r.data;
    const gainers = [...coins].sort((a, b) =>
      (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    ).slice(0, limit);
    const losers = [...coins].sort((a, b) =>
      (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0)
    ).slice(0, limit);

    const map = (c: { name: string; symbol: string; current_price: number; price_change_percentage_24h: number; market_cap: number }) => ({
      name: c.name, symbol: c.symbol.toUpperCase(),
      price: c.current_price,
      change24h: c.price_change_percentage_24h?.toFixed(2) + "%",
      marketCap: c.market_cap,
    });

    return {
      success: true,
      data: { topGainers: gainers.map(map), topLosers: losers.map(map) },
    };
  } catch (e: unknown) {
    return { success: false, error: `Gainers/losers: ${e instanceof Error ? e.message : e}` };
  }
}

export async function volatilityRanking(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
      params: {
        vs_currency: "usd", order: "volume_desc",
        per_page: 100, sparkline: false,
        price_change_percentage: "24h,7d",
      },
      headers: process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {},
      timeout: 10000,
    });
    const ranked = r.data
      .filter((c: { high_24h: number; low_24h: number; current_price: number }) => c.high_24h && c.low_24h)
      .map((c: { name: string; symbol: string; current_price: number; high_24h: number; low_24h: number; price_change_percentage_24h: number }) => ({
        name: c.name, symbol: c.symbol.toUpperCase(),
        volatility: (((c.high_24h - c.low_24h) / c.current_price) * 100).toFixed(2) + "%",
        price: c.current_price,
        change24h: c.price_change_percentage_24h?.toFixed(2) + "%",
      }))
      .sort((a: { volatility: string }, b: { volatility: string }) => parseFloat(b.volatility) - parseFloat(a.volatility))
      .slice(0, 15);
    return { success: true, data: { mostVolatile: ranked } };
  } catch (e: unknown) {
    return { success: false, error: `Volatility: ${e instanceof Error ? e.message : e}` };
  }
}
