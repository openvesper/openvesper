// ============================================================
// 🛸 Terminal of UFO — NFT, Airdrops, Macro, Portfolio, DEX
// Combined into one file for clean structure
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

// ────────────────────────────────────────────────────────────
// NFT TOOLS
// ────────────────────────────────────────────────────────────

export async function nftFloorPrice(collectionSlug: string): Promise<ToolResult> {
  try {
    // Try OpenSea via reservoir-style public endpoint
    const r = await axios.get(`https://api.opensea.io/api/v2/collections/${collectionSlug}/stats`, {
      headers: process.env.OPENSEA_API_KEY ? { "X-API-KEY": process.env.OPENSEA_API_KEY } : {},
      timeout: 10000,
    });
    return {
      success: true,
      data: {
        collection: collectionSlug,
        floorPrice: r.data?.total?.floor_price,
        volumeTotal: r.data?.total?.volume,
        numOwners: r.data?.total?.num_owners,
        totalSupply: r.data?.total?.market_cap,
        intervals: r.data?.intervals,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `NFT floor: ${e instanceof Error ? e.message : e}. Set OPENSEA_API_KEY for full data.` };
  }
}

export async function nftTrending(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.coingecko.com/api/v3/nfts/markets", {
      params: { order: "market_cap_usd_desc", per_page: 20, page: 1 },
      headers: process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {},
      timeout: 10000,
    });
    return {
      success: true,
      data: {
        trending: (r.data || []).slice(0, 15).map((n: {
          id: string; name: string; symbol: string; floor_price: { usd: number };
          h24_volume: { usd: number }; market_cap: { usd: number };
          floor_price_24h_percentage_change: { usd: number };
        }) => ({
          id: n.id, name: n.name, symbol: n.symbol,
          floorPriceUSD: n.floor_price?.usd,
          volume24h: n.h24_volume?.usd,
          marketCap: n.market_cap?.usd,
          change24h: n.floor_price_24h_percentage_change?.usd?.toFixed(2) + "%",
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `NFT trending: ${e instanceof Error ? e.message : e}` };
  }
}

// ────────────────────────────────────────────────────────────
// AIRDROP TOOLS
// ────────────────────────────────────────────────────────────

const AIRDROP_PROJECTS = [
  { name: "Jupiter", chain: "Solana", status: "S2 ongoing", url: "https://jup.ag", criteria: "Swap volume, voting" },
  { name: "Eigenlayer", chain: "Ethereum", status: "Points farming", url: "https://eigenlayer.xyz", criteria: "Restake ETH, native LSTs" },
  { name: "EtherFi", chain: "Ethereum", status: "S3 active", url: "https://etherfi.fi", criteria: "Stake ETH for ETHFI points" },
  { name: "Symbiotic", chain: "Ethereum", status: "Pre-token", url: "https://symbiotic.fi", criteria: "Restake assets" },
  { name: "Renzo", chain: "Ethereum", status: "Pre-airdrop", url: "https://renzoprotocol.com", criteria: "Stake ETH for ezETH" },
  { name: "Kelp DAO", chain: "Ethereum", status: "Points active", url: "https://kelpdao.xyz", criteria: "rsETH staking" },
  { name: "Linea", chain: "L2 (Linea)", status: "Voyage ongoing", url: "https://linea.build", criteria: "Use dapps on Linea" },
  { name: "Scroll", chain: "L2 (Scroll)", status: "Points active", url: "https://scroll.io", criteria: "Bridge + dapp usage" },
  { name: "Berachain", chain: "Berachain", status: "Testnet active", url: "https://berachain.com", criteria: "Testnet activity" },
  { name: "Monad", chain: "Monad", status: "Testnet pre-launch", url: "https://monad.xyz", criteria: "Discord/Twitter engagement" },
  { name: "MegaETH", chain: "MegaETH", status: "Testnet pre-launch", url: "https://megaeth.com", criteria: "Testnet participation" },
];

export async function airdropRadar(): Promise<ToolResult> {
  return {
    success: true,
    data: {
      activeAirdrops: AIRDROP_PROJECTS,
      totalProjects: AIRDROP_PROJECTS.length,
      disclaimer: "These are observed point/airdrop programs. Not all will result in token distributions.",
      lastUpdated: new Date().toISOString(),
    },
  };
}

export async function checkAirdropEligibility(address: string, project: string): Promise<ToolResult> {
  try {
    return {
      success: true,
      data: {
        project, address,
        note: `Specific eligibility check for ${project} not implemented. Visit the project's website to check.`,
        availableCheckers: [],
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Airdrop check: ${e instanceof Error ? e.message : e}` };
  }
}

// ────────────────────────────────────────────────────────────
// MACRO TOOLS
// ────────────────────────────────────────────────────────────

export async function dxyAndYields(): Promise<ToolResult> {
  try {
    const symbols = ["DX-Y.NYB", "^TNX", "^TYX", "^IRX", "GC=F", "CL=F"];
    const results = await Promise.allSettled(
      symbols.map((s) =>
        axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${s}`, {
          params: { interval: "1d", range: "5d" },
          headers: { "User-Agent": "Mozilla/5.0" },
          timeout: 10000,
        })
      )
    );

    const data: Record<string, unknown> = {};
    const names: Record<string, string> = {
      "DX-Y.NYB": "DXY (Dollar Index)",
      "^TNX": "US 10-Year Treasury",
      "^TYX": "US 30-Year Treasury",
      "^IRX": "US 13-Week Treasury",
      "GC=F": "Gold Futures",
      "CL=F": "Crude Oil WTI",
    };

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const meta = r.value.data?.chart?.result?.[0]?.meta;
        if (meta) {
          const change = (meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100;
          data[names[symbols[i]]] = {
            price: meta.regularMarketPrice?.toFixed(4),
            change: change.toFixed(2) + "%",
            trend: change > 0 ? "🟢 UP" : change < 0 ? "🔴 DOWN" : "⚪ FLAT",
          };
        }
      }
    });

    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: `Macro data: ${e instanceof Error ? e.message : e}` };
  }
}

export async function cryptoStockCorrelation(): Promise<ToolResult> {
  try {
    const [btcR, spyR, qqqR, goldR] = await Promise.allSettled([
      axios.get("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart", {
        params: { vs_currency: "usd", days: 30, interval: "daily" },
        timeout: 10000,
      }),
      axios.get("https://query1.finance.yahoo.com/v8/finance/chart/SPY", {
        params: { interval: "1d", range: "1mo" },
        headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000,
      }),
      axios.get("https://query1.finance.yahoo.com/v8/finance/chart/QQQ", {
        params: { interval: "1d", range: "1mo" },
        headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000,
      }),
      axios.get("https://query1.finance.yahoo.com/v8/finance/chart/GC=F", {
        params: { interval: "1d", range: "1mo" },
        headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000,
      }),
    ]);

    const btcPrices = btcR.status === "fulfilled" ? btcR.value.data.prices.map((p: number[]) => p[1]) : [];
    const spyPrices = spyR.status === "fulfilled" ? spyR.value.data.chart.result[0].indicators.quote[0].close.filter((v: number | null) => v !== null) : [];
    const qqqPrices = qqqR.status === "fulfilled" ? qqqR.value.data.chart.result[0].indicators.quote[0].close.filter((v: number | null) => v !== null) : [];
    const goldPrices = goldR.status === "fulfilled" ? goldR.value.data.chart.result[0].indicators.quote[0].close.filter((v: number | null) => v !== null) : [];

    return {
      success: true,
      data: {
        period: "30 days",
        btcCorrelation: {
          withSPY: pearson(btcPrices, spyPrices).toFixed(3),
          withQQQ: pearson(btcPrices, qqqPrices).toFixed(3),
          withGold: pearson(btcPrices, goldPrices).toFixed(3),
        },
        interpretation: "Range: -1 (inverse) to +1 (perfect correlation). >0.7 = strong positive.",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Correlation: ${e instanceof Error ? e.message : e}` };
  }
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xs = x.slice(0, n), ys = y.slice(0, n);
  const meanX = xs.reduce((a, b) => a + b) / n;
  const meanY = ys.reduce((a, b) => a + b) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX, dy = ys[i] - meanY;
    num += dx * dy; denX += dx * dx; denY += dy * dy;
  }
  return denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
}

// ────────────────────────────────────────────────────────────
// PORTFOLIO TRACKER
// ────────────────────────────────────────────────────────────

export async function multiWalletPortfolio(addresses: { address: string; chain: "eth"|"base"|"solana"; label?: string }[]): Promise<ToolResult> {
  try {
    const results = await Promise.allSettled(
      addresses.map(async (a) => {
        if (a.chain === "solana") {
          const heliusKey = process.env.HELIUS_API_KEY;
          if (heliusKey) {
            const r = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
              jsonrpc: "2.0", id: 1, method: "getBalance", params: [a.address],
            }, { timeout: 8000 });
            return {
              label: a.label || a.address.slice(0, 6),
              chain: "SOLANA", address: a.address,
              balance: `${(r.data?.result?.value / 1e9 || 0).toFixed(4)} SOL`,
            };
          }
        } else {
          const apiBase = a.chain === "base" ? "api.basescan.org" : "api.etherscan.io";
          const key = a.chain === "base" ? process.env.BASESCAN_API_KEY : process.env.ETHERSCAN_API_KEY;
          const r = await axios.get(`https://${apiBase}/api`, {
            params: { module: "account", action: "balance", address: a.address, tag: "latest", apikey: key || "YourApiKeyToken" },
            timeout: 8000,
          });
          return {
            label: a.label || a.address.slice(0, 6),
            chain: a.chain.toUpperCase(),
            address: a.address,
            balance: `${(parseInt(r.data?.result || "0") / 1e18).toFixed(6)} ETH`,
          };
        }
        return { label: a.label, chain: a.chain, address: a.address, balance: "Unknown" };
      })
    );

    return {
      success: true,
      data: {
        totalWallets: addresses.length,
        portfolio: results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<unknown>).value),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Portfolio: ${e instanceof Error ? e.message : e}` };
  }
}

// ────────────────────────────────────────────────────────────
// DEX AGGREGATOR (Jupiter for Solana, 1inch for EVM)
// ────────────────────────────────────────────────────────────

export async function jupiterQuote(inputMint: string, outputMint: string, amount: number): Promise<ToolResult> {
  try {
    const r = await axios.get("https://quote-api.jup.ag/v6/quote", {
      params: { inputMint, outputMint, amount, slippageBps: 50 },
      timeout: 10000,
    });
    return {
      success: true,
      data: {
        inputMint, outputMint,
        inAmount: r.data.inAmount,
        outAmount: r.data.outAmount,
        priceImpactPct: r.data.priceImpactPct,
        routePlan: r.data.routePlan?.length,
        otherAmountThreshold: r.data.otherAmountThreshold,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Jupiter: ${e instanceof Error ? e.message : e}` };
  }
}

export async function oneInchQuote(chainId: number, fromToken: string, toToken: string, amount: string): Promise<ToolResult> {
  try {
    const apiKey = process.env.ONEINCH_API_KEY;
    if (!apiKey) return { success: false, error: "ONEINCH_API_KEY required" };

    const r = await axios.get(`https://api.1inch.dev/swap/v6.0/${chainId}/quote`, {
      params: { src: fromToken, dst: toToken, amount },
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    return { success: true, data: r.data };
  } catch (e: unknown) {
    return { success: false, error: `1inch: ${e instanceof Error ? e.message : e}` };
  }
}

// ────────────────────────────────────────────────────────────
// TOKEN UNLOCKS
// ────────────────────────────────────────────────────────────

export async function upcomingUnlocks(): Promise<ToolResult> {
  // TokenUnlocks doesn't have a free public API, return a curated list
  return {
    success: true,
    data: {
      note: "Check tokenunlocks.app for live data",
      knownLargeUnlocks: [
        { token: "ARB", date: "Monthly 17th", amount: "~92M ARB ($)" },
        { token: "APT", date: "Monthly 12th", amount: "~11M APT" },
        { token: "OP", date: "Monthly 30th", amount: "~24M OP" },
        { token: "SUI", date: "Monthly 1st", amount: "~64M SUI" },
        { token: "TIA", date: "Periodic vest", amount: "Varies" },
      ],
    },
  };
}

// ────────────────────────────────────────────────────────────
// FUNDING ARB SCANNER
// ────────────────────────────────────────────────────────────

export async function fundingArbScanner(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://fapi.binance.com/fapi/v1/premiumIndex", { timeout: 10000 });
    const data = r.data
      .filter((d: { symbol: string }) => d.symbol.endsWith("USDT"))
      .map((d: { symbol: string; markPrice: string; lastFundingRate: string; nextFundingTime: number }) => ({
        symbol: d.symbol,
        markPrice: parseFloat(d.markPrice),
        funding: parseFloat(d.lastFundingRate) * 100,
        nextFunding: new Date(d.nextFundingTime).toISOString(),
      }))
      .sort((a: { funding: number }, b: { funding: number }) => Math.abs(b.funding) - Math.abs(a.funding));

    return {
      success: true,
      data: {
        highestNegativeFunding: data.filter((d: { funding: number }) => d.funding < 0).slice(0, 10).map((d: { symbol: string; funding: number; markPrice: number }) => ({
          symbol: d.symbol, funding: d.funding.toFixed(4) + "%", price: d.markPrice,
          strategy: "Spot LONG + Perp SHORT — collect funding (short gets paid)",
        })),
        highestPositiveFunding: data.filter((d: { funding: number }) => d.funding > 0).slice(0, 10).map((d: { symbol: string; funding: number; markPrice: number }) => ({
          symbol: d.symbol, funding: d.funding.toFixed(4) + "%", price: d.markPrice,
          strategy: "Spot SHORT + Perp LONG — long gets paid (rare strategy)",
        })),
        note: "Funding rates are paid every 8h on Binance. APR ≈ funding rate × 3 × 365",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Funding arb: ${e instanceof Error ? e.message : e}` };
  }
}
