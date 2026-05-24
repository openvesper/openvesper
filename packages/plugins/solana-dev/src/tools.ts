// ============================================================
// 🛸 Terminal of UFO — Solana Developer Tools
// IDL fetcher, program analysis, account decoder, Token-2022
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

const SOLANA_RPC = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : "https://api.mainnet-beta.solana.com";

// ── Program Info ──────────────────────────────────────────────────────────────

export async function solanaProgramInfo(programId: string): Promise<ToolResult> {
  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "getAccountInfo",
      params: [programId, { encoding: "jsonParsed", commitment: "confirmed" }],
    }, { timeout: 10000 });

    const acc = r.data?.result?.value;
    if (!acc) return { success: false, error: "Program account not found" };

    return {
      success: true,
      data: {
        programId,
        owner: acc.owner,
        executable: acc.executable,
        lamports: acc.lamports,
        rentEpoch: acc.rentEpoch,
        dataLength: acc.data?.[1] === "base64" ? "Encoded base64" : acc.data?.parsed,
        isUpgradeable: acc.owner === "BPFLoaderUpgradeab1e11111111111111111111111",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Program info: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Anchor IDL Fetcher ────────────────────────────────────────────────────────

export async function fetchAnchorIDL(programId: string): Promise<ToolResult> {
  try {
    // Anchor IDL is typically stored at a PDA derived from the program
    // Public IDL registries
    const r = await axios.get(`https://anchor.so/api/v1/idl/${programId}`, { timeout: 8000 }).catch(() => null);
    if (r?.data) return { success: true, data: { source: "anchor.so", idl: r.data } };

    // Fallback: try Solscan
    const solscanR = await axios.get(`https://api.solscan.io/account?address=${programId}`, {
      timeout: 8000,
    }).catch(() => null);

    return {
      success: true,
      data: {
        programId,
        note: "IDL not in public registries. Check explorer.solana.com or contact program author.",
        solscanData: solscanR?.data,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `IDL fetch: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Compute Unit & Fee Estimator ──────────────────────────────────────────────

export async function solanaComputeUnits(): Promise<ToolResult> {
  return {
    success: true,
    data: {
      basics: {
        defaultCUperTx: 200000,
        maxCUperTx: 1400000,
        defaultPriceLamports: 5000,
      },
      memecoinSniping: {
        recommendedCU: 600000,
        priorityFeeMicroLamports: 1000000,
        reason: "Higher CU + priority fee = faster inclusion during congestion",
      },
      defi: {
        recommendedCU: 400000,
        priorityFeeMicroLamports: 100000,
      },
      simpleSwap: {
        recommendedCU: 250000,
        priorityFeeMicroLamports: 50000,
      },
      tip: "Use getPriorityFeeEstimate via Helius for dynamic pricing during congestion.",
    },
  };
}

// ── Token-2022 (newer Solana token standard) ──────────────────────────────────

export async function token2022Info(mint: string): Promise<ToolResult> {
  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "getAccountInfo",
      params: [mint, { encoding: "jsonParsed" }],
    }, { timeout: 10000 });

    const parsed = r.data?.result?.value?.data?.parsed;
    if (!parsed) return { success: false, error: "Token mint not found" };

    const info = parsed.info;
    const extensions = info.extensions || [];

    return {
      success: true,
      data: {
        mint,
        owner: r.data.result.value.owner,
        isToken2022: r.data.result.value.owner === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        supply: info.supply,
        decimals: info.decimals,
        mintAuthority: info.mintAuthority,
        freezeAuthority: info.freezeAuthority,
        extensions: extensions.map((e: { extension: string; state: unknown }) => ({
          name: e.extension,
          state: e.state,
        })),
        risks: {
          mintable: info.mintAuthority !== null,
          freezable: info.freezeAuthority !== null,
          hasTransferHooks: extensions.some((e: { extension: string }) => e.extension === "transferHook"),
          hasTransferFee: extensions.some((e: { extension: string }) => e.extension === "transferFeeConfig"),
        },
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Token-2022 info: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Compressed NFT (cNFT) Lookup ──────────────────────────────────────────────

export async function compressedNFTinfo(assetId: string): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) {
    return { success: false, error: "HELIUS_API_KEY required for cNFT lookups" };
  }

  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "getAsset", params: { id: assetId },
    }, { timeout: 10000 });

    const asset = r.data?.result;
    if (!asset) return { success: false, error: "Asset not found" };

    return {
      success: true,
      data: {
        id: asset.id,
        compression: asset.compression,
        compressed: asset.compression?.compressed,
        merkleTree: asset.compression?.tree,
        content: {
          name: asset.content?.metadata?.name,
          symbol: asset.content?.metadata?.symbol,
          image: asset.content?.files?.[0]?.uri,
        },
        ownership: asset.ownership,
        creators: asset.creators,
        royalty: asset.royalty,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `cNFT info: ${e instanceof Error ? e.message : e}` };
  }
}

// ── Helius DAS API — Get assets by owner ──────────────────────────────────────

export async function heliusAssetsByOwner(owner: string, page = 1): Promise<ToolResult> {
  if (!process.env.HELIUS_API_KEY) {
    return { success: false, error: "HELIUS_API_KEY required" };
  }

  try {
    const r = await axios.post(SOLANA_RPC, {
      jsonrpc: "2.0", id: 1, method: "getAssetsByOwner",
      params: { ownerAddress: owner, page, limit: 100 },
    }, { timeout: 12000 });

    const result = r.data?.result;
    return {
      success: true,
      data: {
        owner, page,
        total: result?.total,
        itemsThisPage: result?.items?.length,
        items: (result?.items || []).slice(0, 30).map((a: {
          id: string; interface: string;
          content?: { metadata?: { name?: string; symbol?: string } };
          token_info?: { balance: number; decimals: number; symbol: string };
        }) => ({
          id: a.id,
          type: a.interface,
          name: a.content?.metadata?.name,
          symbol: a.content?.metadata?.symbol || a.token_info?.symbol,
          balance: a.token_info ? a.token_info.balance / Math.pow(10, a.token_info.decimals) : null,
        })),
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Helius assets: ${e instanceof Error ? e.message : e}` };
  }
}

// ── RPC Health Checker ────────────────────────────────────────────────────────

export async function solanaRPCHealth(): Promise<ToolResult> {
  const rpcs = [
    { name: "Helius", url: process.env.HELIUS_API_KEY ? SOLANA_RPC : null },
    { name: "Solana Public", url: "https://api.mainnet-beta.solana.com" },
    { name: "Ankr", url: "https://rpc.ankr.com/solana" },
    { name: "PublicNode", url: "https://solana-rpc.publicnode.com" },
  ].filter((r) => r.url);

  const results = await Promise.allSettled(
    rpcs.map(async (rpc) => {
      const start = Date.now();
      const r = await axios.post(rpc.url!, {
        jsonrpc: "2.0", id: 1, method: "getSlot",
      }, { timeout: 5000 });
      return { name: rpc.name, slot: r.data?.result, latency: Date.now() - start };
    })
  );

  return {
    success: true,
    data: {
      rpcs: results.map((r, i) => {
        if (r.status === "fulfilled") {
          const v = r.value as { name: string; slot: number; latency: number };
          return { ...v, status: "🟢 OK", latencyMs: v.latency };
        }
        return { name: rpcs[i].name, status: "🔴 FAIL", error: (r as PromiseRejectedResult).reason?.message };
      }),
    },
  };
}
