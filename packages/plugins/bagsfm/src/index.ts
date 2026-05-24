// ============================================================
// 🌒 @openvesper/plugin-bagsfm
// Bags.fm — Solana memecoin launchpad with creator fee-sharing
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const DEXSCREENER = "https://api.dexscreener.com";
const SOLANA_RPC = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

// ── Tool implementations ──────────────────────────────────────────────────────

async function bagsSearchTokens(query: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/latest/dex/search`, { params: { q: query }, timeout: 10000 });
    const pairs = (r.data?.pairs || [])
      .filter((p: any) => p.chainId === "solana" && (p.dexId?.includes("meteora") || p.dexId?.includes("bags")))
      .slice(0, 15);
    return {
      success: true,
      data: {
        query,
        results: pairs.map((p: any) => ({
          name: p.baseToken.name, symbol: p.baseToken.symbol, contract: p.baseToken.address,
          priceUSD: parseFloat(p.priceUsd || "0"),
          marketCap: p.marketCap || p.fdv,
          liquidity: p.liquidity?.usd,
          volume24h: p.volume?.h24,
          change24h: p.priceChange?.h24?.toFixed(2) + "%",
          ageHours: p.pairCreatedAt ? ((Date.now() - p.pairCreatedAt) / 3600000).toFixed(1) : null,
          dexUrl: p.url,
        })),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsTokenAnalysis(contractAddress: string): Promise<ToolResult> {
  try {
    const dexR = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${contractAddress}`, { timeout: 10000 });
    const pair = dexR.data?.[0];
    if (!pair) return { success: false, error: "Token not found" };

    const liquidity = pair.liquidity?.usd || 0;
    const volume24h = pair.volume?.h24 || 0;
    const buys = pair.txns?.h24?.buys || 0;
    const sells = pair.txns?.h24?.sells || 0;
    const buyPressure = buys + sells > 0 ? (buys / (buys + sells)) * 100 : 50;
    const change24h = pair.priceChange?.h24 || 0;
    const ageHours = pair.pairCreatedAt ? (Date.now() - pair.pairCreatedAt) / 3600000 : 0;
    const volLiqRatio = liquidity > 0 ? volume24h / liquidity : 0;

    let score = 50;
    const signals: string[] = [];
    const risks: string[] = [];

    if (liquidity > 100000) { score += 10; signals.push(`💧 Strong liquidity: $${liquidity.toLocaleString()}`); }
    else if (liquidity > 30000) { score += 5; signals.push(`💧 Decent liquidity`); }
    else { score -= 10; risks.push(`⚠️ Low liquidity: $${liquidity.toLocaleString()}`); }

    if (volLiqRatio > 5) { score += 15; signals.push(`🔥 Volume/liq: ${volLiqRatio.toFixed(1)}x`); }
    if (buyPressure > 60) { score += 12; signals.push(`🟢 Buy pressure ${buyPressure.toFixed(1)}%`); }
    else if (buyPressure < 40) { score -= 8; risks.push(`🔴 Sell pressure`); }
    if (change24h > 100) { score += 15; signals.push(`🚀 +${change24h.toFixed(1)}% 24h`); }
    else if (change24h < -50) { score -= 12; risks.push(`📉 ${change24h.toFixed(1)}% 24h`); }
    if (ageHours < 1) { score += 5; signals.push(`🆕 Brand new`); }

    score = Math.max(0, Math.min(100, score));
    const verdict = score >= 75 ? "🟢 STRONG" : score >= 60 ? "🟡 INTERESTING" : score >= 40 ? "⚪ NEUTRAL" : "🔴 AVOID";

    return {
      success: true,
      data: {
        token: { name: pair.baseToken.name, symbol: pair.baseToken.symbol, contract: contractAddress, dex: pair.dexId },
        price: { usd: parseFloat(pair.priceUsd || "0"), marketCap: pair.marketCap, change24h: change24h.toFixed(2) + "%" },
        liquidity: { usd: liquidity },
        volume: { h24: volume24h, volLiqRatio: volLiqRatio.toFixed(2) + "x" },
        activity: { buys24h: buys, sells24h: sells, buyPressure: buyPressure.toFixed(1) + "%", ageHours: ageHours.toFixed(2) },
        analysis: { score: `${Math.round(score)}/100`, verdict, signals, risks, dexUrl: pair.url },
        warning: "⚠️ Bags.fm = creator fee memecoins on Solana. High risk. DYOR.",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsTrending(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/token-boosts/latest/v1`, { timeout: 10000 });
    const boosts = (r.data || []).filter((b: any) => b.chainId === "solana").slice(0, 30);
    const enriched = await Promise.allSettled(
      boosts.map((b: any) => axios.get(`${DEXSCREENER}/tokens/v1/solana/${b.tokenAddress}`, { timeout: 8000 }))
    );
    const tokens = enriched
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value.data?.[0])
      .filter((p) => p && (p.dexId?.includes("meteora") || p.dexId?.includes("bags")))
      .slice(0, 15)
      .map((p: any) => ({
        name: p.baseToken.name, symbol: p.baseToken.symbol, contract: p.baseToken.address,
        priceUSD: parseFloat(p.priceUsd || "0"), marketCap: p.marketCap,
        volume24h: p.volume?.h24, liquidity: p.liquidity?.usd,
        change24h: p.priceChange?.h24?.toFixed(2) + "%", dexUrl: p.url,
      }));
    return { success: true, data: { trending: tokens } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsNewLaunches(maxAgeHours: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/token-profiles/latest/v1`, { timeout: 10000 });
    const profiles = (r.data || []).filter((p: any) => p.chainId === "solana").slice(0, 30);
    const pairs = await Promise.allSettled(
      profiles.map((p: any) => axios.get(`${DEXSCREENER}/tokens/v1/solana/${p.tokenAddress}`, { timeout: 8000 }))
    );
    const cutoff = Date.now() - maxAgeHours * 3600000;
    const fresh = pairs
      .filter((r) => r.status === "fulfilled")
      .map((r: any) => r.value.data?.[0])
      .filter((p) => p && p.pairCreatedAt > cutoff)
      .filter((p) => p.dexId?.includes("meteora") || p.dexId?.includes("bags"))
      .slice(0, 15)
      .map((p: any) => ({
        name: p.baseToken.name, symbol: p.baseToken.symbol, contract: p.baseToken.address,
        priceUSD: parseFloat(p.priceUsd || "0"), liquidity: p.liquidity?.usd,
        ageMinutes: ((Date.now() - p.pairCreatedAt) / 60000).toFixed(0), dexUrl: p.url,
      }));
    return { success: true, data: { maxAgeHours, count: fresh.length, launches: fresh } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsCreatorAnalysis(creatorAddress: string): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) {
    return { success: false, error: "HELIUS_API_KEY required" };
  }
  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "searchAssets",
      params: { creatorAddress, page: 1, limit: 50, displayOptions: { showFungible: true } },
    }, { timeout: 12000 });
    const tokens = r.data?.result?.items || [];
    return {
      success: true,
      data: {
        creator: creatorAddress,
        totalTokensCreated: tokens.length,
        riskAssessment: tokens.length > 20 ? "🔴 HIGH RISK — serial creator"
                       : tokens.length > 5 ? "🟡 MODERATE"
                       : tokens.length > 0 ? "🟢 OK"
                       : "⚪ No tokens found",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Extended tools — comparison, holder analysis, rug check, portfolio ─────

async function bagsCompareTokens(addresses: string[]): Promise<ToolResult> {
  try {
    if (!addresses?.length || addresses.length > 5) {
      return { success: false, error: "Provide 1-5 contract addresses" };
    }
    const results = await Promise.all(addresses.map(async (addr) => {
      try {
        const r = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${addr}`, { timeout: 10000 });
        const p = r.data?.[0]; if (!p) return { contract: addr, error: "no pair" };
        const liq = p.liquidity?.usd || 0; const vol24 = p.volume?.h24 || 0;
        return {
          contract: addr, name: p.baseToken?.name, symbol: p.baseToken?.symbol,
          priceUSD: parseFloat(p.priceUsd || "0"), liquidityUSD: liq, volume24h: vol24,
          volumeLiqRatio: liq > 0 ? (vol24 / liq).toFixed(2) : "N/A",
          marketCap: p.marketCap || p.fdv, change24h: p.priceChange?.h24,
          ageHours: p.pairCreatedAt ? ((Date.now() - p.pairCreatedAt) / 3600000).toFixed(1) : "?",
          buys24h: p.txns?.h24?.buys || 0, sells24h: p.txns?.h24?.sells || 0,
          buySellRatio: p.txns?.h24 ? (p.txns.h24.buys / Math.max(1, p.txns.h24.sells)).toFixed(2) : "N/A",
        };
      } catch (err) { return { contract: addr, error: err instanceof Error ? err.message : "fail" }; }
    }));
    const valid = results.filter((r: any) => !r.error);
    const ranked = valid.map((r: any) => {
      let score = 0;
      if (r.liquidityUSD > 50000) score += 25; else if (r.liquidityUSD > 10000) score += 15;
      const vlr = parseFloat(r.volumeLiqRatio); if (vlr > 2) score += 25; else if (vlr > 0.5) score += 15;
      const bsr = parseFloat(r.buySellRatio); if (bsr > 1.5) score += 25; else if (bsr > 1) score += 15;
      return { ...r, compositeScore: Math.min(100, score) };
    }).sort((a: any, b: any) => b.compositeScore - a.compositeScore);
    return {
      success: true,
      data: { compared: addresses.length, ranked,
        winner: ranked[0] ? `${ranked[0].symbol} (${ranked[0].compositeScore}/100)` : "no data" }
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsHolderDistribution(contract: string): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) {
    return { success: false, error: "HELIUS_API_KEY required for holder analysis" };
  }
  try {
    const url = SOLANA_RPC;
    const r = await axios.post(url, {
      jsonrpc: "2.0", id: "1", method: "getTokenLargestAccounts",
      params: [contract, { commitment: "finalized" }],
    }, { timeout: 10000 });
    const accounts = r.data?.result?.value || [];
    const supplyResp = await axios.post(url, {
      jsonrpc: "2.0", id: "2", method: "getTokenSupply", params: [contract]
    }, { timeout: 10000 });
    const totalSupply = parseFloat(supplyResp.data?.result?.value?.uiAmountString || "0");
    if (totalSupply === 0) return { success: false, error: "Could not fetch supply" };

    const top20 = accounts.slice(0, 20).map((a: any) => ({
      address: a.address, amount: a.uiAmountString,
      pct: ((parseFloat(a.uiAmountString) / totalSupply) * 100).toFixed(2),
    }));
    const top1Pct = parseFloat(top20[0]?.pct || "0");
    const top10Pct = top20.slice(0, 10).reduce((s: number, h: any) => s + parseFloat(h.pct), 0);
    let risk = "LOW";
    if (top1Pct > 40) risk = "CRITICAL";
    else if (top1Pct > 25) risk = "HIGH";
    else if (top1Pct > 15) risk = "MEDIUM";

    return {
      success: true,
      data: {
        contract, totalSupply, top20Holders: top20,
        concentration: { topHolderPct: top1Pct.toFixed(2) + "%", top10Pct: top10Pct.toFixed(2) + "%", riskLevel: risk },
        verdict: risk === "CRITICAL" ? "🔴 Single holder > 40% — extreme dump risk"
               : risk === "HIGH" ? "🟠 Top holder > 25% — significant risk"
               : risk === "MEDIUM" ? "🟡 Moderate concentration"
               : "🟢 Healthy distribution",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsVolumePattern(contract: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${contract}`, { timeout: 10000 });
    const p = r.data?.[0]; if (!p) return { success: false, error: "Pair not found" };
    const txns = p.txns || {}; const vol = p.volume || {}; const change = p.priceChange || {};
    const vol5m = vol.m5 || 0; const vol1h = vol.h1 || 0; const vol24 = vol.h24 || 0;
    const momentum5m = (vol5m * 12) / Math.max(1, vol1h);
    const momentum1h = (vol1h * 24) / Math.max(1, vol24);
    const patterns: string[] = [];
    if (momentum5m > 3) patterns.push("🔥 5m volume burst");
    if (momentum1h > 2) patterns.push("📈 1h volume above 24h avg");
    if (momentum5m < 0.3 && momentum1h < 0.5) patterns.push("📉 Cooling off");
    if ((txns.m5?.buys || 0) === 0 && (txns.m5?.sells || 0) > 0) patterns.push("⚠️ Only sells last 5m");
    if ((txns.m5?.buys || 0) > (txns.m5?.sells || 0) * 2) patterns.push("✅ Strong 5m buy pressure");
    if ((change.h1 || 0) > 50) patterns.push("🚀 1h up > 50%");
    if ((change.h1 || 0) < -30) patterns.push("⛔ 1h down > 30%");
    return {
      success: true,
      data: {
        contract, symbol: p.baseToken?.symbol,
        windows: {
          "5m": { buys: txns.m5?.buys || 0, sells: txns.m5?.sells || 0, volume: vol5m, priceChange: change.m5 },
          "1h": { buys: txns.h1?.buys || 0, sells: txns.h1?.sells || 0, volume: vol1h, priceChange: change.h1 },
          "24h": { volume: vol24, priceChange: change.h24 },
        },
        momentum: { momentum5m: momentum5m.toFixed(2), momentum1h: momentum1h.toFixed(2),
          interpretation: momentum5m > 2 ? "accelerating" : momentum5m < 0.5 ? "decelerating" : "steady" },
        patterns, verdict: patterns[0] || "No strong signals",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsRugCheck(contract: string): Promise<ToolResult> {
  try {
    const checks: { name: string; status: string; detail: string }[] = [];
    try {
      const dex = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${contract}`, { timeout: 10000 });
      const p = dex.data?.[0];
      if (p) {
        const liq = p.liquidity?.usd || 0;
        checks.push({
          name: "Liquidity", status: liq > 10000 ? "PASS" : liq > 1000 ? "WARN" : "FAIL",
          detail: `$${liq.toFixed(0)}`,
        });
      }
    } catch { checks.push({ name: "Liquidity", status: "ERROR", detail: "DexScreener unreachable" }); }

    try {
      const gp = await axios.get(
        `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${contract}`,
        { timeout: 10000 }
      );
      const sec = gp.data?.result?.[contract.toLowerCase()];
      if (sec) {
        const isMintable = sec.mintable === "1";
        const isFreezable = sec.freezable === "1";
        checks.push({ name: "Mint authority", status: isMintable ? "WARN" : "PASS",
          detail: isMintable ? "Active — supply inflatable" : "Revoked" });
        checks.push({ name: "Freeze authority", status: isFreezable ? "WARN" : "PASS",
          detail: isFreezable ? "Active — holders can be frozen" : "Revoked" });
      }
    } catch { checks.push({ name: "Authority", status: "SKIPPED", detail: "GoPlus unavailable" }); }

    const fails = checks.filter(c => c.status === "FAIL").length;
    const warns = checks.filter(c => c.status === "WARN").length;
    let verdict = "🟢 No major red flags";
    if (fails > 0) verdict = "🔴 Critical issues — high rug risk";
    else if (warns >= 2) verdict = "🟠 Multiple warnings";
    else if (warns > 0) verdict = "🟡 Minor concerns";

    return {
      success: true,
      data: {
        contract, checks,
        summary: { passes: checks.filter(c => c.status === "PASS").length, warns, fails, total: checks.length },
        verdict, disclaimer: "Heuristic check using public on-chain data only. DYOR.",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function bagsPortfolioScore(addresses: string[]): Promise<ToolResult> {
  try {
    if (!addresses?.length || addresses.length > 10) {
      return { success: false, error: "Provide 1-10 addresses" };
    }
    const data = await Promise.all(addresses.map(async (addr) => {
      try {
        const r = await axios.get(`${DEXSCREENER}/tokens/v1/solana/${addr}`, { timeout: 10000 });
        const p = r.data?.[0]; if (!p) return { contract: addr, error: "no data" };
        return {
          contract: addr, symbol: p.baseToken?.symbol, liquidity: p.liquidity?.usd || 0,
          volume24h: p.volume?.h24 || 0, mcap: p.marketCap || p.fdv,
          change24h: p.priceChange?.h24, ageHours: p.pairCreatedAt ? (Date.now() - p.pairCreatedAt) / 3600000 : 0,
        };
      } catch { return { contract: addr, error: "fetch failed" }; }
    }));
    const valid = data.filter((d: any) => !d.error);
    const totalMcap = valid.reduce((s: number, t: any) => s + (t.mcap || 0), 0);
    const totalLiq = valid.reduce((s: number, t: any) => s + (t.liquidity || 0), 0);
    const concentration = valid.map((t: any) => ({
      symbol: t.symbol,
      pctOfPortfolio: totalMcap > 0 ? ((t.mcap / totalMcap) * 100).toFixed(2) : "0",
    }));
    const maxConcentration = Math.max(...concentration.map((c: any) => parseFloat(c.pctOfPortfolio)));
    let diversification = "WELL_DIVERSIFIED";
    if (maxConcentration > 60) diversification = "HIGHLY_CONCENTRATED";
    else if (maxConcentration > 40) diversification = "MODERATELY_CONCENTRATED";
    const greenCount = valid.filter((t: any) => (t.change24h || 0) > 0).length;
    return {
      success: true,
      data: {
        portfolio: valid,
        aggregate: { totalTokens: valid.length, totalMarketCap: totalMcap.toFixed(0), totalLiquidity: totalLiq.toFixed(0) },
        diversification: { status: diversification, maxConcentration: maxConcentration.toFixed(2) + "%", breakdown: concentration },
        performance: { greenTokens: greenCount, redTokens: valid.length - greenCount,
          score: ((greenCount / Math.max(1, valid.length)) * 100).toFixed(0) + "/100" },
        suggestions: [
          diversification === "HIGHLY_CONCENTRATED" && "Consider rebalancing — one position dominates",
          totalLiq < 50000 && "Low total liquidity — exit may be difficult",
        ].filter(Boolean),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Plugin Definition ─────────────────────────────────────────────────────────

export default definePlugin({
  name: "@openvesper/plugin-bagsfm",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Bags.fm Solana memecoin launchpad tools",
  license: "MIT",

  tools: [
    defineTool({
      name: "bags_search",
      description: "Search Bags.fm / Meteora memecoin tokens by name or symbol on Solana.",
      inputSchema: inputSchema({ query: { type: "string", description: "Token name or symbol" } }, ["query"]),
      handler: async (input) => bagsSearchTokens(input.query as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_trending",
      description: "Trending tokens on Bags.fm and Meteora pools.",
      inputSchema: inputSchema({ timeframe: { type: "string", description: "1h, 6h, or 24h" } }),
      handler: async () => bagsTrending(),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_token_analysis",
      description: "Deep Bags.fm token analysis with 0-100 score, liquidity, buy/sell pressure, signals, risks.",
      inputSchema: inputSchema({ contract_address: { type: "string", description: "Solana mint address" } }, ["contract_address"]),
      handler: async (input) => bagsTokenAnalysis(input.contract_address as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_new_launches",
      description: "Newly launched Bags.fm tokens in last N hours.",
      inputSchema: inputSchema({ max_age_hours: { type: "number", description: "Max age in hours" } }),
      handler: async (input) => bagsNewLaunches((input.max_age_hours as number) || 6),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_creator_analysis",
      description: "Analyze a Bags.fm creator wallet — history of tokens, rug pattern detection.",
      inputSchema: inputSchema({ creator_address: { type: "string", description: "Solana wallet" } }, ["creator_address"]),
      handler: async (input) => bagsCreatorAnalysis(input.creator_address as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_compare",
      description: "Compare 1-5 Bags.fm tokens side-by-side with composite scoring (liquidity, volume/liq, buy/sell ratio).",
      inputSchema: inputSchema({
        contracts: { type: "string", description: "Comma-separated Solana mint addresses (max 5)" },
      }, ["contracts"]),
      handler: async (input) => bagsCompareTokens((input.contracts as string).split(",").map((s) => s.trim())),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_holder_distribution",
      description: "Top-20 holder distribution + concentration risk for a Bags.fm token (requires HELIUS_API_KEY).",
      inputSchema: inputSchema({ contract_address: { type: "string", description: "Solana mint address" } }, ["contract_address"]),
      handler: async (input) => bagsHolderDistribution(input.contract_address as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_volume_pattern",
      description: "Detect volume momentum patterns (5m / 1h / 24h) — burst, cooling, dump, accumulation signals.",
      inputSchema: inputSchema({ contract_address: { type: "string", description: "Solana mint address" } }, ["contract_address"]),
      handler: async (input) => bagsVolumePattern(input.contract_address as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_rug_check",
      description: "Multi-source rug risk check: liquidity health + mint/freeze authority + GoPlus security flags.",
      inputSchema: inputSchema({ contract_address: { type: "string", description: "Solana mint address" } }, ["contract_address"]),
      handler: async (input) => bagsRugCheck(input.contract_address as string),
      category: "solana-memes",
    }),
    defineTool({
      name: "bags_portfolio_score",
      description: "Analyze a basket of Bags.fm tokens (up to 10) — diversification, total liquidity, performance, suggestions.",
      inputSchema: inputSchema({
        contracts: { type: "string", description: "Comma-separated mint addresses (max 10)" },
      }, ["contracts"]),
      handler: async (input) => bagsPortfolioScore((input.contracts as string).split(",").map((s) => s.trim())),
      category: "solana-memes",
    }),
  ]

});
