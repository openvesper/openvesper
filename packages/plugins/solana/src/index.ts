// ============================================================
// 🌒 @openvesper/plugin-solana
// Solana ecosystem: Jupiter, Raydium, Orca, LST, Drift, Kamino, Helius DAS
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const JUPITER = "https://price.jup.ag/v6";
const JUPITER_TOKEN = "https://token.jup.ag";
const RAYDIUM = "https://api.raydium.io";
const ORCA = "https://api.orca.so";
const BIRDEYE = "https://public-api.birdeye.so";
const SOLANA_RPC = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

async function jupiterPrice(mints: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${JUPITER}/price`, { params: { ids: mints }, timeout: 10000 });
    return {
      success: true,
      data: { prices: Object.entries(r.data?.data || {}).map(([mint, info]: [string, any]) =>
        ({ mint, symbol: info.mintSymbol, priceUSD: info.price })) },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function solanaTokenInfo(mintOrSymbol: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${JUPITER_TOKEN}/strict`, { timeout: 10000 });
    const match = (r.data || []).find((t: any) =>
      t.address === mintOrSymbol || t.symbol.toLowerCase() === mintOrSymbol.toLowerCase()
    );
    if (!match) return { success: false, error: `Token not found: ${mintOrSymbol}` };
    return { success: true, data: { mint: match.address, name: match.name, symbol: match.symbol, decimals: match.decimals } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function birdeyeTrending(): Promise<ToolResult> {
  if (!process.env.BIRDEYE_API_KEY) return { success: false, error: "BIRDEYE_API_KEY required" };
  try {
    const r = await axios.get(`${BIRDEYE}/defi/token_trending`, {
      headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY, "x-chain": "solana" },
      params: { sort_by: "rank", sort_type: "asc", offset: 0, limit: 20 }, timeout: 10000,
    });
    const tokens = (r.data?.data?.tokens || []).slice(0, 20).map((t: any) => ({
      rank: t.rank, mint: t.address, symbol: t.symbol, name: t.name,
      priceUSD: t.price, change24h: t.price24hChangePercent?.toFixed(2) + "%",
      volume24h: t.volume24hUSD, liquidity: t.liquidity, marketCap: t.marketcap,
    }));
    return { success: true, data: { trending: tokens } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function raydiumPools(limit: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${RAYDIUM}/v2/main/pairs`, { timeout: 12000 });
    const pools = (r.data || [])
      .filter((p: any) => p.liquidity > 10000)
      .sort((a: any, b: any) => b.volume24h - a.volume24h)
      .slice(0, limit)
      .map((p: any) => ({
        pair: p.name, ammId: p.ammId, liquidity: p.liquidity,
        volume24h: p.volume24h, apy: p.apy?.toFixed(2) + "%",
      }));
    return { success: true, data: { topPools: pools } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function orcaPools(limit: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${ORCA}/v1/whirlpool/list`, { timeout: 12000 });
    const pools = (r.data?.whirlpools || [])
      .filter((p: any) => p.tvl > 100000)
      .sort((a: any, b: any) => (b.volume?.day || 0) - (a.volume?.day || 0))
      .slice(0, limit)
      .map((p: any) => ({
        pair: `${p.tokenA.symbol}/${p.tokenB.symbol}`,
        address: p.address, tvl: p.tvl, volume24h: p.volume?.day,
        feeTier: (p.lpFeeRate * 100).toFixed(2) + "%",
      }));
    return { success: true, data: { topWhirlpools: pools } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function solanaLSTrates(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://extra-api.sanctum.so/v1/apy/current", {
      params: { lst: "mSOL,jitoSOL,bSOL,INF,JupSOL" }, timeout: 10000,
    });
    const apys = r.data?.apys || {};
    return {
      success: true,
      data: {
        lsts: ["mSOL", "jitoSOL", "bSOL", "INF", "JupSOL"].map((k) => ({
          name: k, apy: apys[k.toLowerCase()] ? (apys[k.toLowerCase()] * 100).toFixed(2) + "%" : "Check site",
        })),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function solanaStats(): Promise<ToolResult> {
  try {
    const [slotR, supplyR, perfR] = await Promise.allSettled([
      axios.post(SOLANA_RPC, { jsonrpc: "2.0", id: 1, method: "getSlot" }, { timeout: 8000 }),
      axios.post(SOLANA_RPC, { jsonrpc: "2.0", id: 1, method: "getSupply" }, { timeout: 8000 }),
      axios.post(SOLANA_RPC, { jsonrpc: "2.0", id: 1, method: "getRecentPerformanceSamples", params: [5] }, { timeout: 8000 }),
    ]);
    const slot = slotR.status === "fulfilled" ? (slotR.value as any).data?.result : null;
    const supply = supplyR.status === "fulfilled" ? (supplyR.value as any).data?.result?.value : null;
    const perf = perfR.status === "fulfilled" ? (perfR.value as any).data?.result : [];
    const avgTps = perf.length > 0 ? perf.reduce((a: number, p: any) => a + p.numTransactions / p.samplePeriodSecs, 0) / perf.length : 0;
    return {
      success: true,
      data: {
        currentSlot: slot,
        totalSupplySOL: supply ? (supply.total / 1e9).toFixed(0) : null,
        circulatingSOL: supply ? (supply.circulating / 1e9).toFixed(0) : null,
        avgTPS: avgTps.toFixed(0),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function priorityFees(): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) return { success: false, error: "HELIUS_API_KEY required" };
  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "getPriorityFeeEstimate",
      params: [{ options: { includeAllPriorityFeeLevels: true } }],
    }, { timeout: 8000 });
    return { success: true, data: { levels: r.data?.result?.priorityFeeLevels, note: "Unit: microlamports per CU" } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function driftMarkets(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://mainnet-beta.api.drift.trade/perpMarkets", { timeout: 10000 });
    const markets = (r.data?.data?.markets || []).slice(0, 30).map((m: any) => ({
      marketIndex: m.marketIndex, symbol: m.symbol, asset: m.baseAssetSymbol,
      oraclePrice: m.oracle?.price ? parseFloat(m.oracle.price) / 1e6 : null,
    }));
    return { success: true, data: { perpMarkets: markets } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function kaminoRates(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.kamino.finance/kamino-market/main/reserves", { timeout: 10000 });
    const reserves = (r.data || []).slice(0, 15).map((res: any) => ({
      asset: res.symbol,
      supplyAPY: (res.depositApy * 100).toFixed(2) + "%",
      borrowAPY: (res.borrowApy * 100).toFixed(2) + "%",
      maxLTV: (res.ltv * 100).toFixed(1) + "%",
    }));
    return { success: true, data: { kaminoReserves: reserves } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function heliusAssets(owner: string): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) return { success: false, error: "HELIUS_API_KEY required" };
  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "getAssetsByOwner",
      params: { ownerAddress: owner, page: 1, limit: 100 },
    }, { timeout: 12000 });
    const items = (r.data?.result?.items || []).slice(0, 30).map((a: any) => ({
      id: a.id, type: a.interface,
      name: a.content?.metadata?.name,
      symbol: a.content?.metadata?.symbol || a.token_info?.symbol,
      balance: a.token_info ? a.token_info.balance / Math.pow(10, a.token_info.decimals) : null,
    }));
    return { success: true, data: { owner, total: r.data?.result?.total, items } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function jupiterQuote(input: string, output: string, amount: number): Promise<ToolResult> {
  try {
    const r = await axios.get("https://quote-api.jup.ag/v6/quote", {
      params: { inputMint: input, outputMint: output, amount, slippageBps: 50 }, timeout: 10000,
    });
    return {
      success: true,
      data: {
        inputMint: input, outputMint: output,
        inAmount: r.data.inAmount, outAmount: r.data.outAmount,
        priceImpactPct: r.data.priceImpactPct,
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-solana",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Solana ecosystem tools — Jupiter, Raydium, Orca, LSTs, Drift, Kamino, Helius",
  license: "MIT",
  tools: [
    defineTool({ name: "jupiter_price", description: "Jupiter price oracle for Solana tokens", inputSchema: inputSchema({ mints: { type: "string", description: "Comma-separated mints or symbols" } }, ["mints"]), handler: async (i) => jupiterPrice(i.mints as string), category: "solana" }),
    defineTool({ name: "solana_token_info", description: "Resolve Solana token by mint or symbol", inputSchema: inputSchema({ mint_or_symbol: { type: "string", description: "Mint or symbol" } }, ["mint_or_symbol"]), handler: async (i) => solanaTokenInfo(i.mint_or_symbol as string), category: "solana" }),
    defineTool({ name: "birdeye_trending", description: "Birdeye trending Solana tokens (needs BIRDEYE_API_KEY)", inputSchema: inputSchema({}), handler: async () => birdeyeTrending(), category: "solana" }),
    defineTool({ name: "raydium_pools", description: "Top Raydium pools by volume", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => raydiumPools((i.limit as number) || 20), category: "solana" }),
    defineTool({ name: "orca_whirlpools", description: "Top Orca Whirlpools", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => orcaPools((i.limit as number) || 15), category: "solana" }),
    defineTool({ name: "solana_lst_rates", description: "Solana liquid staking token APYs (mSOL, jitoSOL, INF...)", inputSchema: inputSchema({}), handler: async () => solanaLSTrates(), category: "solana" }),
    defineTool({ name: "solana_network_stats", description: "Solana network: slot, supply, TPS", inputSchema: inputSchema({}), handler: async () => solanaStats(), category: "solana" }),
    defineTool({ name: "solana_priority_fees", description: "Solana priority fee estimates (low/medium/high)", inputSchema: inputSchema({}), handler: async () => priorityFees(), category: "solana" }),
    defineTool({ name: "drift_markets", description: "Drift Protocol perp markets on Solana", inputSchema: inputSchema({}), handler: async () => driftMarkets(), category: "solana" }),
    defineTool({ name: "kamino_rates", description: "Kamino Finance lending rates", inputSchema: inputSchema({}), handler: async () => kaminoRates(), category: "solana" }),
    defineTool({ name: "helius_assets_by_owner", description: "Get all tokens + NFTs for a Solana wallet (Helius DAS)", inputSchema: inputSchema({ owner: { type: "string", description: "Owner address" } }, ["owner"]), handler: async (i) => heliusAssets(i.owner as string), category: "solana" }),
    defineTool({ name: "jupiter_quote", description: "Jupiter swap quote for Solana tokens", inputSchema: inputSchema({ input_mint: { type: "string", description: "Input" }, output_mint: { type: "string", description: "Output" }, amount: { type: "number", description: "Atomic units" } }, ["input_mint", "output_mint", "amount"]), handler: async (i) => jupiterQuote(i.input_mint as string, i.output_mint as string, i.amount as number), category: "solana" }),
  ]

});
