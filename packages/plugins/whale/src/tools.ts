// ============================================================
// 🛸 Terminal of UFO — Whale Tracking
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

// ── Whale Alert (paid API, fallback uses public endpoints) ────────────────────

export async function whaleAlerts(minValue = 1000000, limit = 20): Promise<ToolResult> {
  const apiKey = process.env.WHALE_ALERT_API_KEY;
  if (apiKey) {
    try {
      const start = Math.floor(Date.now() / 1000) - 3600;
      const r = await axios.get("https://api.whale-alert.io/v1/transactions", {
        params: { api_key: apiKey, min_value: minValue, start, limit },
        timeout: 10000,
      });
      return { success: true, data: { count: r.data.count, transactions: r.data.transactions } };
    } catch (e: unknown) {
      return { success: false, error: `Whale Alert: ${e instanceof Error ? e.message : e}` };
    }
  }

  // Fallback: aggregate big tx from Etherscan
  return {
    success: true,
    data: {
      note: "WHALE_ALERT_API_KEY not set. Use whale_eth_transfers for ETH whale txs via Etherscan.",
      alternatives: ["whale_eth_transfers", "smart_money_flow", "exchange_flows"],
    },
  };
}

export async function getEthWhaleTransfers(tokenContract?: string, minTokens = 100000): Promise<ToolResult> {
  try {
    const key = process.env.ETHERSCAN_API_KEY || "YourApiKeyToken";
    const params: Record<string, string> = {
      module: "logs", action: "getLogs",
      fromBlock: "latest", toBlock: "latest",
      topic0: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event
      apikey: key,
    };
    if (tokenContract) params.address = tokenContract;

    const r = await axios.get("https://api.etherscan.io/api", { params, timeout: 12000 });
    return { success: true, data: { transfers: r.data.result?.slice(0, 10) || [], minTokens } };
  } catch (e: unknown) {
    return { success: false, error: `ETH transfers: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Exchange Inflow / Outflow ─────────────────────────────────────────────────

export async function exchangeFlows(coin: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`https://api.coingecko.com/api/v3/exchanges/${coin}/tickers`, {
      headers: process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {},
      timeout: 10000,
    });
    const tickers = (r.data?.tickers || []).slice(0, 10).map((t: {
      base: string; target: string; market: { name: string }; converted_volume: { usd: number }; trust_score: string;
    }) => ({
      pair: `${t.base}/${t.target}`, exchange: t.market.name,
      volumeUSD: t.converted_volume.usd, trustScore: t.trust_score,
    }));
    return { success: true, data: { coin, topMarkets: tickers } };
  } catch (e: unknown) {
    return { success: false, error: `Exchange flows: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Smart Money Tracker (uses Etherscan to track known smart wallets) ─────────

const KNOWN_SMART_WALLETS = [
  { name: "Vitalik Buterin", address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" },
  { name: "Justin Sun", address: "0x176f3dab24a159341c0509bb36b833e7fdd0a132" },
  { name: "Wintermute MM", address: "0x0000006daea1723962647b7e189d311d757fb793" },
  { name: "Jump Trading", address: "0x4a8bbafc35f6c5876ff89be83a447e1eb1051e1d" },
];

export async function smartMoneyFlow(): Promise<ToolResult> {
  try {
    const results = await Promise.allSettled(
      KNOWN_SMART_WALLETS.map(async (w) => {
        const r = await axios.get("https://api.etherscan.io/api", {
          params: {
            module: "account", action: "txlist", address: w.address,
            startblock: 0, endblock: 99999999, sort: "desc",
            offset: 5, page: 1,
            apikey: process.env.ETHERSCAN_API_KEY || "YourApiKeyToken",
          },
          timeout: 10000,
        });
        return {
          wallet: w.name, address: w.address,
          recentTxs: (r.data.result || []).slice(0, 3).map((tx: { hash: string; value: string; to: string; timeStamp: string }) => ({
            hash: tx.hash.slice(0, 16) + "...",
            valueETH: (parseInt(tx.value) / 1e18).toFixed(4),
            to: tx.to,
            date: new Date(parseInt(tx.timeStamp) * 1000).toISOString().split("T")[0],
          })),
        };
      })
    );
    return {
      success: true,
      data: {
        trackedWallets: KNOWN_SMART_WALLETS.length,
        activity: results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<unknown>).value),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Smart money: ${e instanceof Error ? e.message : e}` };
  }
}

export async function topHolders(coinId: string): Promise<ToolResult> {
  try {
    // CoinGecko doesn't expose holders directly; use developer/community data
    const r = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
      params: { localization: false, tickers: false, market_data: false, community_data: true, developer_data: false },
      headers: process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {},
      timeout: 10000,
    });
    return {
      success: true,
      data: {
        name: r.data.name,
        symbol: r.data.symbol,
        homepage: r.data.links?.homepage?.[0],
        explorers: r.data.links?.blockchain_site?.filter((s: string) => s),
        community: r.data.community_data,
        note: "For holder distribution, query the explorer URL directly",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Top holders: ${e instanceof Error ? e.message : e}` };
  }
}
