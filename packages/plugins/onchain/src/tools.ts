// ============================================================
// 🛸 Terminal of UFO — On-Chain Analysis Tool
// Supports: Ethereum, Solana, Base
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

const ETHERSCAN  = "https://api.etherscan.io/api";
const BASESCAN   = "https://api.basescan.org/api";
const SOLSCAN    = "https://pro-api.solscan.io/v2.0";
const HELIUS     = "https://mainnet.helius-rpc.com";

// ── Ethereum / Base ───────────────────────────────────────────────────────────

async function evmCall(chain: "eth" | "base", params: Record<string, string>): Promise<ToolResult> {
  const base = chain === "base" ? BASESCAN : ETHERSCAN;
  const key  = chain === "base"
    ? (process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "YourApiKeyToken")
    : (process.env.ETHERSCAN_API_KEY || "YourApiKeyToken");

  try {
    const r = await axios.get(base, { params: { ...params, apikey: key }, timeout: 12000 });
    if (r.data.status === "0" && r.data.message !== "No transactions found") {
      return { success: false, error: r.data.result || r.data.message };
    }
    return { success: true, data: r.data.result };
  } catch (e: unknown) {
    return { success: false, error: `EVM call: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getWalletBalance(address: string, chain: "eth" | "base" = "eth"): Promise<ToolResult> {
  try {
    const [balR, txCountR] = await Promise.allSettled([
      evmCall(chain, { module: "account", action: "balance", address, tag: "latest" }),
      evmCall(chain, { module: "proxy", action: "eth_getTransactionCount", address, tag: "latest" }),
    ]);

    const balWei = balR.status === "fulfilled" && balR.value.success ? String(balR.value.data) : "0";
    const balEth = (parseInt(balWei) / 1e18).toFixed(6);
    const txCount = txCountR.status === "fulfilled" && txCountR.value.success
      ? parseInt(String(txCountR.value.data), 16)
      : 0;

    // Get token balances
    const tokenR = await evmCall(chain, { module: "account", action: "tokenbalance", address, contractaddress: "", tag: "latest" });

    return {
      success: true,
      data: {
        address, chain: chain.toUpperCase(),
        balance: `${balEth} ${chain === "base" ? "ETH (Base)" : "ETH"}`,
        balanceWei: balWei,
        txCount,
        explorerUrl: chain === "base"
          ? `https://basescan.org/address/${address}`
          : `https://etherscan.io/address/${address}`,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Wallet balance: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getWalletTxHistory(address: string, chain: "eth" | "base" = "eth", limit = 10): Promise<ToolResult> {
  try {
    const r = await evmCall(chain, {
      module: "account", action: "txlist",
      address, startblock: "0", endblock: "99999999",
      sort: "desc", offset: String(limit), page: "1",
    });

    if (!r.success) return r;

    const txs = (r.data as {
      hash: string; from: string; to: string; value: string;
      timeStamp: string; gasUsed: string; isError: string; functionName: string;
    }[]).slice(0, limit).map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: `${(parseInt(tx.value) / 1e18).toFixed(6)} ETH`,
      date: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString(),
      gasUsed: tx.gasUsed,
      status: tx.isError === "0" ? "✅ Success" : "❌ Failed",
      method: tx.functionName?.split("(")?.[0] || "transfer",
      explorerUrl: chain === "base"
        ? `https://basescan.org/tx/${tx.hash}`
        : `https://etherscan.io/tx/${tx.hash}`,
    }));

    return { success: true, data: { address, chain: chain.toUpperCase(), transactions: txs } };
  } catch (e: unknown) {
    return { success: false, error: `TX history: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getTokenHolders(contractAddress: string, chain: "eth" | "base" = "eth"): Promise<ToolResult> {
  try {
    const r = await evmCall(chain, {
      module: "token", action: "tokeninfo", contractaddress: contractAddress,
    });

    if (!r.success) return r;

    const info = r.data as {
      tokenName: string; symbol: string; totalSupply: string;
      divisor: string; holderCount: string; description: string; website: string;
    };

    return {
      success: true,
      data: {
        contractAddress, chain: chain.toUpperCase(),
        name: info.tokenName, symbol: info.symbol,
        totalSupply: info.totalSupply,
        decimals: info.divisor,
        holders: info.holderCount,
        description: info.description?.slice(0, 200),
        website: info.website,
        explorerUrl: chain === "base"
          ? `https://basescan.org/token/${contractAddress}`
          : `https://etherscan.io/token/${contractAddress}`,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Token info: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Solana ────────────────────────────────────────────────────────────────────

export async function getSolanaWallet(address: string): Promise<ToolResult> {
  try {
    const heliusKey = process.env.HELIUS_API_KEY;

    if (heliusKey) {
      // Helius enhanced API
      const [balR, txR, assetsR] = await Promise.allSettled([
        axios.post(`${HELIUS}/?api-key=${heliusKey}`, {
          jsonrpc: "2.0", id: 1, method: "getBalance", params: [address],
        }, { timeout: 10000 }),
        axios.post(`${HELIUS}/?api-key=${heliusKey}`, {
          jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress",
          params: [address, { limit: 5 }],
        }, { timeout: 10000 }),
        axios.get(`https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${heliusKey}`, { timeout: 10000 }),
      ]);

      const balLamports = balR.status === "fulfilled" ? balR.value.data?.result?.value || 0 : 0;
      const balSOL = (balLamports / 1e9).toFixed(6);

      const recentTxs = txR.status === "fulfilled"
        ? (txR.value.data?.result || []).slice(0, 5).map((tx: { signature: string; slot: number; err: unknown }) => ({
            signature: tx.signature?.slice(0, 20) + "...",
            slot: tx.slot,
            status: tx.err ? "❌ Failed" : "✅ Success",
            explorerUrl: `https://solscan.io/tx/${tx.signature}`,
          }))
        : [];

      const tokens = assetsR.status === "fulfilled"
        ? (assetsR.value.data?.tokens || []).slice(0, 8).map((t: { mint: string; amount: number; decimals: number }) => ({
            mint: t.mint,
            amount: (t.amount / Math.pow(10, t.decimals)).toFixed(4),
          }))
        : [];

      return {
        success: true,
        data: {
          address, chain: "SOLANA",
          balance: `${balSOL} SOL`,
          balanceLamports: balLamports,
          recentTransactions: recentTxs,
          tokenHoldings: tokens,
          explorerUrl: `https://solscan.io/account/${address}`,
        },
      };
    }

    // Fallback: public RPC
    const r = await axios.post("https://api.mainnet-beta.solana.com", {
      jsonrpc: "2.0", id: 1, method: "getBalance", params: [address],
    }, { timeout: 10000 });

    const lamports = r.data?.result?.value || 0;
    return {
      success: true,
      data: {
        address, chain: "SOLANA",
        balance: `${(lamports / 1e9).toFixed(6)} SOL`,
        explorerUrl: `https://solscan.io/account/${address}`,
        note: "Add HELIUS_API_KEY for full token holdings and tx history",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Solana wallet: ${e instanceof Error ? e.message : e}` };
  }
}

export async function getSolanaTokenInfo(mintAddress: string): Promise<ToolResult> {
  try {
    const heliusKey = process.env.HELIUS_API_KEY;

    if (heliusKey) {
      const r = await axios.get(
        `https://api.helius.xyz/v0/token-metadata?api-key=${heliusKey}`,
        { params: { mintAccounts: mintAddress }, timeout: 10000 }
      );
      const token = r.data?.[0];
      if (!token) return { success: false, error: "Token not found" };

      return {
        success: true,
        data: {
          mint: mintAddress,
          name: token.onChainMetadata?.metadata?.data?.name,
          symbol: token.onChainMetadata?.metadata?.data?.symbol,
          uri: token.onChainMetadata?.metadata?.data?.uri,
          supply: token.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.supply,
          decimals: token.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.decimals,
          explorerUrl: `https://solscan.io/token/${mintAddress}`,
        },
      };
    }

    return {
      success: true,
      data: {
        mint: mintAddress,
        explorerUrl: `https://solscan.io/token/${mintAddress}`,
        note: "Add HELIUS_API_KEY for full token metadata",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Solana token: ${e instanceof Error ? e.message : e}` };
  }
}
