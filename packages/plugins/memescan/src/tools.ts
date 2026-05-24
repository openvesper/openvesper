// ============================================================
// 🛸 Terminal of UFO — Meme Token Scanner
// Covers: Solana (Pump.fun, Raydium), ETH, Base
// Signal scoring: liquidity, holders, volume, age, social
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

const DEXSCREENER = "https://api.dexscreener.com/latest/dex";
const BIRDEYE     = "https://public-api.birdeye.so/defi";
const GECKOTERMINAL = "https://api.geckoterminal.com/api/v2";

// ── DexScreener — cross-chain ─────────────────────────────────────────────────

export async function searchMemeTokens(query: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/search`, {
      params: { q: query },
      timeout: 10000,
    });

    const pairs = (r.data.pairs || []).slice(0, 15).map((p: {
      chainId: string; dexId: string; baseToken: { address: string; name: string; symbol: string };
      quoteToken: { symbol: string }; priceUsd: string; priceChange: { h1: number; h6: number; h24: number };
      volume: { h24: number; h6: number; h1: number }; liquidity: { usd: number };
      txns: { h24: { buys: number; sells: number } }; pairCreatedAt: number; url: string;
      fdv: number; marketCap: number;
    }) => {
      const ageHours = p.pairCreatedAt ? ((Date.now() - p.pairCreatedAt) / 3600000).toFixed(1) : "?";
      const score = scoreMemeToken(p);
      return {
        chain: p.chainId,
        dex: p.dexId,
        name: p.baseToken.name,
        symbol: p.baseToken.symbol,
        address: p.baseToken.address,
        pair: `${p.baseToken.symbol}/${p.quoteToken.symbol}`,
        price: p.priceUsd ? `$${parseFloat(p.priceUsd).toFixed(8)}` : "N/A",
        change1h: (p.priceChange?.h1 || 0).toFixed(2) + "%",
        change6h: (p.priceChange?.h6 || 0).toFixed(2) + "%",
        change24h: (p.priceChange?.h24 || 0).toFixed(2) + "%",
        volume24h: formatUSD(p.volume?.h24 || 0),
        liquidity: formatUSD(p.liquidity?.usd || 0),
        buys24h: p.txns?.h24?.buys || 0,
        sells24h: p.txns?.h24?.sells || 0,
        buyPressure: getBuyPressure(p.txns?.h24?.buys || 0, p.txns?.h24?.sells || 0),
        ageHours: ageHours + "h",
        fdv: p.fdv ? formatUSD(p.fdv) : "N/A",
        marketCap: p.marketCap ? formatUSD(p.marketCap) : "N/A",
        score: score.total,
        signals: score.signals,
        dexUrl: p.url,
      };
    });

    // Sort by score descending
    pairs.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    return { success: true, data: { query, results: pairs } };
  } catch (e: unknown) {
    return { success: false, error: `Meme search: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getTrendingMemeTokens(chain: "solana" | "ethereum" | "base" | "all" = "all"): Promise<ToolResult> {
  try {
    const chains = chain === "all" ? ["solana", "ethereum", "base"] : [chain];
    const results = await Promise.allSettled(
      chains.map((c) =>
        axios.get(`${DEXSCREENER}/tokens/${c}`, { timeout: 10000 })
          .catch(() => axios.get(`${GECKOTERMINAL}/networks/${c === "solana" ? "solana" : c === "base" ? "base" : "eth"}/trending_pools`, { timeout: 10000 }))
      )
    );

    // Use GeckoTerminal for trending
    const geckoPairs: {
      chain: string; name: string; symbol: string; address: string;
      price: string; change24h: string; volume24h: string; liquidity: string;
      buyPressure: string; ageHours: string;
      score: number; signals: string[];
    }[] = [];

    for (const chainName of chains) {
      try {
        const network = chainName === "solana" ? "solana" : chainName === "base" ? "base" : "eth";
        const r = await axios.get(`${GECKOTERMINAL}/networks/${network}/trending_pools`, {
          params: { page: 1 },
          timeout: 10000,
        });

        const pools = r.data?.data || [];
        pools.slice(0, 8).forEach((pool: {
          attributes: {
            name: string; base_token_price_usd: string;
            price_change_percentage: { h24: string };
            volume_usd: { h24: string }; reserve_in_usd: string;
            transactions: { h24: { buys: number; sells: number } };
            pool_created_at: string;
          };
          relationships: { base_token: { data: { id: string } } };
        }) => {
          const attr = pool.attributes;
          const ageHours = attr.pool_created_at
            ? ((Date.now() - new Date(attr.pool_created_at).getTime()) / 3600000).toFixed(1)
            : "?";

          const liq = parseFloat(attr.reserve_in_usd || "0");
          const vol = parseFloat(attr.volume_usd?.h24 || "0");
          const change = parseFloat(attr.price_change_percentage?.h24 || "0");
          const buys = attr.transactions?.h24?.buys || 0;
          const sells = attr.transactions?.h24?.sells || 0;

          const mockPair = { liquidity: { usd: liq }, volume: { h24: vol }, priceChange: { h24: change }, txns: { h24: { buys, sells } }, pairCreatedAt: attr.pool_created_at ? new Date(attr.pool_created_at).getTime() : Date.now() };
          const score = scoreMemeToken(mockPair as Parameters<typeof scoreMemeToken>[0]);

          const [, symbol] = attr.name?.split(" / ") || ["", attr.name];
          geckoPairs.push({
            chain: chainName.toUpperCase(),
            name: attr.name,
            symbol: symbol || attr.name,
            address: pool.relationships?.base_token?.data?.id?.split("_")[1] || "",
            price: parseFloat(attr.base_token_price_usd || "0").toFixed(8),
            change24h: change.toFixed(2) + "%",
            volume24h: formatUSD(vol),
            liquidity: formatUSD(liq),
            buyPressure: getBuyPressure(buys, sells),
            ageHours: ageHours + "h",
            score: score.total,
            signals: score.signals,
          });
        });
      } catch { /* skip failed chain */ }
    }

    geckoPairs.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: {
        chains: chain,
        trending: geckoPairs.slice(0, 20),
        note: "Score 0-100: liquidity, volume, buy pressure, age, momentum",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Trending memes: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getMemeTokenSignals(contractOrSymbol: string): Promise<ToolResult> {
  try {
    // Search DexScreener for the token
    const r = await axios.get(`${DEXSCREENER}/search`, {
      params: { q: contractOrSymbol },
      timeout: 10000,
    });

    const pairs = r.data.pairs || [];
    if (!pairs.length) return { success: false, error: "Token not found on DexScreener" };

    // Get the most liquid pair
    const top = pairs.sort((a: { liquidity: { usd: number } }, b: { liquidity: { usd: number } }) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    const score = scoreMemeToken(top);
    const ageHours = top.pairCreatedAt ? (Date.now() - top.pairCreatedAt) / 3600000 : 9999;

    // Risk assessment
    const risks: string[] = [];
    if ((top.liquidity?.usd || 0) < 10000) risks.push("🔴 Very low liquidity (<$10K) — high rug risk");
    if ((top.liquidity?.usd || 0) < 50000) risks.push("🟡 Low liquidity (<$50K) — moderate risk");
    if (ageHours < 1) risks.push("⚠️ Extremely new token (<1h) — unverified");
    if (ageHours < 6) risks.push("⚠️ Very new token (<6h) — high volatility");
    if ((top.txns?.h24?.sells || 0) > (top.txns?.h24?.buys || 0) * 1.5) risks.push("🔴 Heavy sell pressure");
    if ((top.volume?.h24 || 0) < 1000) risks.push("🔴 Near-zero volume — illiquid");
    if ((top.fdv || 0) > 10000000 && (top.liquidity?.usd || 0) < 100000) risks.push("🟡 High FDV vs low liquidity");

    const opportunities: string[] = [];
    if (score.total >= 70) opportunities.push("🟢 Strong signal score — multiple bullish indicators");
    if ((top.txns?.h24?.buys || 0) > (top.txns?.h24?.sells || 0) * 1.5) opportunities.push("🟢 Strong buy pressure — more buyers than sellers");
    if ((top.priceChange?.h1 || 0) > 10 && (top.priceChange?.h6 || 0) > 20) opportunities.push("🟢 Momentum building — consistent upward movement");
    if ((top.volume?.h24 || 0) > 500000 && (top.liquidity?.usd || 0) > 200000) opportunities.push("🟢 Healthy volume/liquidity ratio");

    return {
      success: true,
      data: {
        token: {
          name: top.baseToken?.name,
          symbol: top.baseToken?.symbol,
          address: top.baseToken?.address,
          chain: top.chainId,
          dex: top.dexId,
        },
        price: top.priceUsd ? `$${parseFloat(top.priceUsd).toFixed(10)}` : "N/A",
        priceChanges: {
          "5m": (top.priceChange?.m5 || 0).toFixed(2) + "%",
          "1h": (top.priceChange?.h1 || 0).toFixed(2) + "%",
          "6h": (top.priceChange?.h6 || 0).toFixed(2) + "%",
          "24h": (top.priceChange?.h24 || 0).toFixed(2) + "%",
        },
        liquidity: formatUSD(top.liquidity?.usd || 0),
        marketCap: top.marketCap ? formatUSD(top.marketCap) : "N/A",
        fdv: top.fdv ? formatUSD(top.fdv) : "N/A",
        volume: {
          "1h": formatUSD(top.volume?.h1 || 0),
          "6h": formatUSD(top.volume?.h6 || 0),
          "24h": formatUSD(top.volume?.h24 || 0),
        },
        transactions24h: {
          buys: top.txns?.h24?.buys || 0,
          sells: top.txns?.h24?.sells || 0,
          ratio: getBuyPressure(top.txns?.h24?.buys || 0, top.txns?.h24?.sells || 0),
        },
        age: ageHours < 1 ? `${(ageHours * 60).toFixed(0)}m` : ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`,
        signalScore: {
          total: score.total + "/100",
          rating: score.total >= 70 ? "🟢 STRONG" : score.total >= 50 ? "🟡 MODERATE" : score.total >= 30 ? "🟠 WEAK" : "🔴 AVOID",
          breakdown: score.signals,
        },
        risks,
        opportunities,
        dexUrl: top.url,
        disclaimer: "⚠️ Meme tokens are extremely high risk. Never invest more than you can afford to lose completely.",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Meme signals: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getNewMemeTokens(chain: "solana" | "ethereum" | "base" = "solana", maxAgeHours = 24): Promise<ToolResult> {
  try {
    const network = chain === "solana" ? "solana" : chain === "base" ? "base" : "eth";
    const r = await axios.get(`${GECKOTERMINAL}/networks/${network}/new_pools`, {
      params: { page: 1 },
      timeout: 10000,
    });

    const pools = (r.data?.data || [])
      .filter((p: { attributes: { pool_created_at: string } }) => {
        const ageH = (Date.now() - new Date(p.attributes.pool_created_at).getTime()) / 3600000;
        return ageH <= maxAgeHours;
      })
      .slice(0, 20)
      .map((p: {
        attributes: {
          name: string; base_token_price_usd: string;
          price_change_percentage: { h24: string };
          volume_usd: { h24: string }; reserve_in_usd: string;
          transactions: { h24: { buys: number; sells: number } };
          pool_created_at: string;
        };
        relationships: { base_token: { data: { id: string } } };
      }) => {
        const attr = p.attributes;
        const ageH = (Date.now() - new Date(attr.pool_created_at).getTime()) / 3600000;
        const liq = parseFloat(attr.reserve_in_usd || "0");
        const vol = parseFloat(attr.volume_usd?.h24 || "0");
        const buys = attr.transactions?.h24?.buys || 0;
        const sells = attr.transactions?.h24?.sells || 0;

        const mockPair = { liquidity: { usd: liq }, volume: { h24: vol }, priceChange: { h24: parseFloat(attr.price_change_percentage?.h24 || "0") }, txns: { h24: { buys, sells } }, pairCreatedAt: new Date(attr.pool_created_at).getTime() };
        const score = scoreMemeToken(mockPair as Parameters<typeof scoreMemeToken>[0]);

        return {
          chain: chain.toUpperCase(),
          name: attr.name,
          address: p.relationships?.base_token?.data?.id?.split("_")[1] || "",
          price: `$${parseFloat(attr.base_token_price_usd || "0").toFixed(10)}`,
          change24h: attr.price_change_percentage?.h24 + "%",
          volume24h: formatUSD(vol),
          liquidity: formatUSD(liq),
          buys, sells,
          ageHours: ageH.toFixed(1) + "h",
          score: score.total,
          rating: score.total >= 60 ? "🟢 WATCH" : score.total >= 40 ? "🟡 RISKY" : "🔴 SKIP",
          signals: score.signals,
        };
      });

    // Sort by score
    pools.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    return {
      success: true,
      data: {
        chain: chain.toUpperCase(),
        maxAgeHours,
        found: pools.length,
        tokens: pools,
        disclaimer: "⚠️ New tokens carry extreme rug pull risk. DYOR always.",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `New meme tokens: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Signal Scoring Engine ─────────────────────────────────────────────────────

function scoreMemeToken(p: {
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h1?: number; h6?: number; h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  pairCreatedAt?: number;
}): { total: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  const liq = p.liquidity?.usd || 0;
  const vol = p.volume?.h24 || 0;
  const ch1h = p.priceChange?.h1 || 0;
  const ch6h = p.priceChange?.h6 || 0;
  const ch24h = p.priceChange?.h24 || 0;
  const buys = p.txns?.h24?.buys || 0;
  const sells = p.txns?.h24?.sells || 0;
  const ageH = p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3600000 : 9999;

  // Liquidity score (0-25)
  if (liq >= 500000) { score += 25; signals.push("💧 Excellent liquidity (>$500K)"); }
  else if (liq >= 100000) { score += 18; signals.push("💧 Good liquidity ($100K-$500K)"); }
  else if (liq >= 50000) { score += 12; signals.push("💧 Moderate liquidity ($50K-$100K)"); }
  else if (liq >= 10000) { score += 5; signals.push("⚠️ Low liquidity ($10K-$50K)"); }
  else { score += 0; signals.push("🔴 Danger: liquidity < $10K"); }

  // Volume/Liquidity ratio (0-20)
  const volRatio = liq > 0 ? vol / liq : 0;
  if (volRatio >= 3) { score += 20; signals.push("🔥 Volume/Liq ratio >3x — very high activity"); }
  else if (volRatio >= 1) { score += 15; signals.push("📈 Volume/Liq ratio >1x — strong activity"); }
  else if (volRatio >= 0.3) { score += 8; signals.push("📊 Moderate volume activity"); }
  else { signals.push("😴 Low volume relative to liquidity"); }

  // Buy pressure (0-20)
  const totalTx = buys + sells;
  if (totalTx > 0) {
    const buyRatio = buys / totalTx;
    if (buyRatio >= 0.7) { score += 20; signals.push("🟢 Strong buy pressure (>70% buys)"); }
    else if (buyRatio >= 0.55) { score += 12; signals.push("🟢 More buyers than sellers"); }
    else if (buyRatio >= 0.45) { score += 6; signals.push("⚪ Balanced buy/sell pressure"); }
    else { score += 0; signals.push("🔴 Sell pressure dominant"); }
  }

  // Price momentum (0-20)
  if (ch1h > 15 && ch6h > 30) { score += 20; signals.push("🚀 Strong upward momentum (1h+6h)"); }
  else if (ch1h > 5 && ch6h > 10) { score += 14; signals.push("📈 Positive momentum building"); }
  else if (ch24h > 20 && ch1h > 0) { score += 10; signals.push("📈 24h positive with recent uptick"); }
  else if (ch1h < -15) { score += 0; signals.push("📉 Price dropping fast — caution"); }
  else { score += 4; signals.push("⚪ Neutral price action"); }

  // Age sweet spot (0-15) — not too new, not too old
  if (ageH >= 2 && ageH <= 48) { score += 15; signals.push("⏰ Age sweet spot (2-48h) — discovery phase"); }
  else if (ageH < 2) { score += 5; signals.push("🆕 Very new (<2h) — high risk/reward"); }
  else if (ageH <= 168) { score += 8; signals.push("⏰ 2-7 days old"); }
  else { score += 3; signals.push("📅 Token >1 week old"); }

  return { total: Math.min(score, 100), signals };
}

function getBuyPressure(buys: number, sells: number): string {
  const total = buys + sells;
  if (!total) return "N/A";
  const pct = ((buys / total) * 100).toFixed(1);
  return `${pct}% buys (${buys}B/${sells}S)`;
}

function formatUSD(n: number): string {
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}
