// ============================================================
// 🌒 @openvesper/plugin-defi
// DefiLlama: TVL, yields, stablecoins, protocols
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const LLAMA = "https://api.llama.fi";
const LLAMA_YIELDS = "https://yields.llama.fi";
const LLAMA_STABLES = "https://stablecoins.llama.fi";

async function defiProtocols(limit: number): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA}/protocols`, { timeout: 12000 });
    const protocols = (r.data || []).slice(0, limit).map((p: any) => ({
      name: p.name, slug: p.slug, category: p.category,
      tvl: p.tvl, change_1d: p.change_1d?.toFixed(2) + "%",
      change_7d: p.change_7d?.toFixed(2) + "%",
      chains: p.chains?.slice(0, 5),
    }));
    return { success: true, data: { topProtocols: protocols } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function chainTVL(chain?: string): Promise<ToolResult> {
  try {
    if (chain) {
      const r = await axios.get(`${LLAMA}/v2/historicalChainTvl/${chain}`, { timeout: 12000 });
      const data = r.data || [];
      const latest = data[data.length - 1];
      const yesterday = data[data.length - 2];
      return {
        success: true,
        data: {
          chain, currentTVL: latest?.tvl,
          change24h: yesterday ? (((latest.tvl - yesterday.tvl) / yesterday.tvl) * 100).toFixed(2) + "%" : null,
        },
      };
    }
    const r = await axios.get(`${LLAMA}/v2/chains`, { timeout: 12000 });
    const chains = (r.data || []).sort((a: any, b: any) => b.tvl - a.tvl).slice(0, 20).map((c: any) => ({
      chain: c.name, tvl: c.tvl, change_1d: c.change_1d?.toFixed(2) + "%",
    }));
    return { success: true, data: { topChains: chains } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function yieldFarms(chain?: string, minApy = 5, limit = 15): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA_YIELDS}/pools`, { timeout: 12000 });
    let pools = (r.data?.data || []).filter((p: any) => p.apy >= minApy && p.tvlUsd > 100000);
    if (chain) pools = pools.filter((p: any) => p.chain.toLowerCase() === chain.toLowerCase());
    pools = pools.sort((a: any, b: any) => b.apy - a.apy).slice(0, limit);
    return {
      success: true,
      data: { topYields: pools.map((p: any) => ({
        project: p.project, chain: p.chain, symbol: p.symbol,
        apy: p.apy?.toFixed(2) + "%", tvl: p.tvlUsd, ilRisk: p.ilRisk,
      })) },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function protocolDetails(slug: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA}/protocol/${slug}`, { timeout: 12000 });
    const p = r.data;
    return {
      success: true,
      data: {
        name: p.name, symbol: p.symbol, category: p.category,
        description: p.description?.slice(0, 200),
        url: p.url, twitter: p.twitter,
        chains: p.chains, currentTVL: p.tvl,
        currentChainTvls: p.currentChainTvls,
        audits: p.audit_links,
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function stablecoinStats(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${LLAMA_STABLES}/stablecoins?includePrices=true`, { timeout: 12000 });
    const stables = (r.data?.peggedAssets || []).slice(0, 15).map((s: any) => ({
      name: s.name, symbol: s.symbol,
      mcap: s.circulating?.peggedUSD,
      pegMechanism: s.pegMechanism, pegType: s.pegType,
      price: s.price,
    }));
    return { success: true, data: { topStablecoins: stables } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-defi",
  version: "1.0.0",
  author: "OpenVesper",
  description: "DefiLlama: TVL, yields, stablecoins",
  license: "MIT",
  tools: [
    defineTool({ name: "defi_protocols", description: "Top DeFi protocols by TVL", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => defiProtocols((i.limit as number) || 15), category: "defi" }),
    defineTool({ name: "defi_protocol_details", description: "Specific DeFi protocol details", inputSchema: inputSchema({ protocol: { type: "string", description: "Slug (uniswap, aave, lido)" } }, ["protocol"]), handler: async (i) => protocolDetails(i.protocol as string), category: "defi" }),
    defineTool({ name: "chain_tvl", description: "TVL by chain (or all chains)", inputSchema: inputSchema({ chain: { type: "string", description: "Optional chain name" } }), handler: async (i) => chainTVL(i.chain as string || undefined), category: "defi" }),
    defineTool({ name: "yield_farms", description: "Top yield farming opportunities", inputSchema: inputSchema({ chain: { type: "string", description: "Chain filter" }, min_apy: { type: "number", description: "Min APY %" }, limit: { type: "number", description: "Count" } }), handler: async (i) => yieldFarms(i.chain as string || undefined, (i.min_apy as number) || 5, (i.limit as number) || 15), category: "defi" }),
    defineTool({ name: "stablecoin_stats", description: "Stablecoin market overview", inputSchema: inputSchema({}), handler: async () => stablecoinStats(), category: "defi" }),
  ]

});
