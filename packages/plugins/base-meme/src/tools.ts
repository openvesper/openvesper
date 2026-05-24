// ============================================================
// 🛸 Terminal of UFO — Base Network Meme & DeFi
// Clanker (Farcaster meme launcher), Virtuals (AI agents), Aerodrome
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

const DEXSCREENER = "https://api.dexscreener.com";
const VIRTUALS_API = "https://api.virtuals.io";

// ── Clanker (Farcaster-native meme launcher) ──────────────────────────────────

export async function clankerTrending(): Promise<ToolResult> {
  try {
    // Clanker tokens trade on Uniswap V3 on Base
    const r = await axios.get(`${DEXSCREENER}/token-boosts/latest/v1`, { timeout: 10000 });

    const boosts = (r.data || [])
      .filter((b: { chainId: string }) => b.chainId === "base")
      .slice(0, 30);

    // Enrich
    const enriched = await Promise.allSettled(
      boosts.map((b: { tokenAddress: string }) =>
        axios.get(`${DEXSCREENER}/tokens/v1/base/${b.tokenAddress}`, { timeout: 8000 })
      )
    );

    const clankers = enriched
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ data: unknown[] }>).value.data?.[0])
      .filter((p) => p)
      .map((p) => {
        const pp = p as {
          baseToken: { address: string; name: string; symbol: string };
          priceUsd: string; volume: { h24: number; h1: number };
          liquidity: { usd: number }; priceChange: { h1: number; h24: number };
          marketCap: number; pairCreatedAt: number; url: string; dexId: string;
        };
        return {
          name: pp.baseToken.name,
          symbol: pp.baseToken.symbol,
          contract: pp.baseToken.address,
          priceUSD: parseFloat(pp.priceUsd || "0"),
          marketCap: pp.marketCap,
          liquidity: pp.liquidity?.usd,
          volume24h: pp.volume?.h24,
          change1h: pp.priceChange?.h1?.toFixed(2) + "%",
          change24h: pp.priceChange?.h24?.toFixed(2) + "%",
          ageHours: pp.pairCreatedAt ? ((Date.now() - pp.pairCreatedAt) / 3600000).toFixed(1) : null,
          dexUrl: pp.url,
        };
      })
      .slice(0, 15);

    return {
      success: true,
      data: {
        baseTokens: clankers,
        note: "Clanker is a Farcaster bot that lets users launch memecoins by tagging @clanker. Tokens auto-deploy on Base with Uniswap V3 pools.",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Clanker trending: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Virtuals.io AI Agent Tokens ───────────────────────────────────────────────

export async function virtualsAgents(limit = 20): Promise<ToolResult> {
  try {
    const r = await axios.get(`${VIRTUALS_API}/api/virtuals`, {
      params: { "pagination[page]": 1, "pagination[pageSize]": limit, "sort": "totalValueLocked:desc" },
      timeout: 12000,
    });

    const agents = (r.data?.data || []).slice(0, limit).map((a: {
      id: number;
      name: string;
      symbol: string;
      tokenAddress: string;
      mcapInVirtual: number;
      socials?: { TWITTER?: string };
      description?: string;
      category?: string;
    }) => ({
      id: a.id, name: a.name, symbol: a.symbol,
      contract: a.tokenAddress,
      marketCapVIRTUAL: a.mcapInVirtual,
      twitter: a.socials?.TWITTER,
      description: a.description?.slice(0, 120),
      category: a.category,
    }));

    return {
      success: true,
      data: {
        agents,
        note: "Virtuals.io is an AI agent token platform on Base. Agents have utility and earn from interactions.",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Virtuals: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Aerodrome Pools (Base DEX) ────────────────────────────────────────────────

export async function aerodromeTopPools(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.aerodrome.finance/api/v1/pools", { timeout: 12000 });
    const pools = (r.data || [])
      .sort((a: { tvl: number }, b: { tvl: number }) => b.tvl - a.tvl)
      .slice(0, 20)
      .map((p: { symbol: string; address: string; tvl: number; volume: number; apr: number }) => ({
        pool: p.symbol, address: p.address,
        tvl: p.tvl, volume24h: p.volume,
        apr: p.apr?.toFixed(2) + "%",
      }));
    return { success: true, data: { topPools: pools } };
  } catch (e: unknown) {
    return { success: false, error: `Aerodrome: ${e instanceof Error ? e.message : e}. Endpoint may be private.` };
  }
}

// ── Base Token Trending ───────────────────────────────────────────────────────

export async function baseTrending(): Promise<ToolResult> {
  try {
    const r = await axios.get(`${DEXSCREENER}/token-boosts/top/v1`, { timeout: 10000 });
    const base = (r.data || [])
      .filter((b: { chainId: string }) => b.chainId === "base")
      .slice(0, 20);

    const enriched = await Promise.allSettled(
      base.map((b: { tokenAddress: string }) =>
        axios.get(`${DEXSCREENER}/tokens/v1/base/${b.tokenAddress}`, { timeout: 8000 })
      )
    );

    const tokens = enriched
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<{ data: unknown[] }>).value.data?.[0])
      .filter((p) => p)
      .slice(0, 15)
      .map((p) => {
        const pp = p as {
          baseToken: { address: string; name: string; symbol: string };
          priceUsd: string; volume: { h24: number }; liquidity: { usd: number };
          priceChange: { h24: number }; marketCap: number; url: string;
        };
        return {
          name: pp.baseToken.name,
          symbol: pp.baseToken.symbol,
          contract: pp.baseToken.address,
          priceUSD: parseFloat(pp.priceUsd || "0"),
          marketCap: pp.marketCap,
          liquidity: pp.liquidity?.usd,
          volume24h: pp.volume?.h24,
          change24h: pp.priceChange?.h24?.toFixed(2) + "%",
          dexUrl: pp.url,
        };
      });

    return { success: true, data: { baseTrending: tokens } };
  } catch (e: unknown) {
    return { success: false, error: `Base trending: ${e instanceof Error ? e.message : e}` };
  }
}
