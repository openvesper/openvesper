// ============================================================
// 🌒 @openvesper/plugin-security
// Token security: GoPlus, RugCheck, phishing, approvals
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const GOPLUS = "https://api.gopluslabs.io/api/v1";
const RUGCHECK = "https://api.rugcheck.xyz/v1";

const CHAIN_IDS: Record<string, string> = {
  ethereum: "1", eth: "1", bsc: "56", binance: "56",
  polygon: "137", matic: "137", arbitrum: "42161", arb: "42161",
  base: "8453", avalanche: "43114", avax: "43114",
  optimism: "10", op: "10", solana: "solana", sol: "solana",
};

async function tokenSecurity(contractAddress: string, chain: string): Promise<ToolResult> {
  const chainId = CHAIN_IDS[chain.toLowerCase()] || "1";

  if (chainId === "solana") {
    try {
      const r = await axios.get(`${RUGCHECK}/tokens/${contractAddress}/report`, { timeout: 12000 });
      const d = r.data;
      const risks = (d?.risks || []).map((r: any) => ({ name: r.name, level: r.level }));
      const score = d?.score || 0;
      return {
        success: true,
        data: {
          mint: contractAddress, chain: "solana", score,
          verdict: score < 100 ? "🟢 GOOD" : score < 500 ? "🟡 MODERATE" : score < 1500 ? "🟠 HIGH RISK" : "🔴 DANGER",
          risks, lpLocked: d?.lpLockedPct,
          mintable: d?.token?.mintAuthority !== null,
          freezable: d?.token?.freezeAuthority !== null,
        },
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  try {
    const r = await axios.get(`${GOPLUS}/token_security/${chainId}`, {
      params: { contract_addresses: contractAddress.toLowerCase() }, timeout: 12000,
    });
    const data = r.data?.result?.[contractAddress.toLowerCase()];
    if (!data) return { success: false, error: "Token not found in GoPlus" };

    const risks: string[] = [];
    let safetyScore = 100;
    if (data.is_honeypot === "1") { risks.push("🔴 HONEYPOT — cannot sell!"); safetyScore -= 50; }
    if (data.cannot_sell_all === "1") { risks.push("🔴 Cannot sell entire balance"); safetyScore -= 30; }
    if (data.is_mintable === "1") { risks.push("⚠️ Mintable"); safetyScore -= 10; }
    if (data.is_proxy === "1") { risks.push("⚠️ Proxy contract (upgradeable)"); safetyScore -= 8; }
    if (data.owner_change_balance === "1") { risks.push("🔴 Owner can change balances!"); safetyScore -= 25; }
    if (data.hidden_owner === "1") { risks.push("🔴 Hidden owner"); safetyScore -= 20; }
    if (data.selfdestruct === "1") { risks.push("🔴 Self-destruct!"); safetyScore -= 30; }
    if (data.is_open_source === "0") { risks.push("⚠️ Source NOT verified"); safetyScore -= 15; }

    safetyScore = Math.max(0, safetyScore);
    return {
      success: true,
      data: {
        contractAddress, chain,
        tokenName: data.token_name, tokenSymbol: data.token_symbol,
        safetyScore: `${safetyScore}/100`,
        verdict: safetyScore >= 80 ? "🟢 SAFE" : safetyScore >= 60 ? "🟡 MODERATE" : safetyScore >= 30 ? "🟠 HIGH RISK" : "🔴 DANGER",
        risks,
        buyTax: data.buy_tax ? (parseFloat(data.buy_tax) * 100).toFixed(2) + "%" : "0%",
        sellTax: data.sell_tax ? (parseFloat(data.sell_tax) * 100).toFixed(2) + "%" : "0%",
        sourceVerified: data.is_open_source === "1",
        holderCount: data.holder_count,
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function addressSecurity(address: string, chain: string): Promise<ToolResult> {
  const chainId = CHAIN_IDS[chain.toLowerCase()] || "1";
  if (chainId === "solana") return { success: false, error: "Solana address security not available via GoPlus" };
  try {
    const r = await axios.get(`${GOPLUS}/address_security/${address}`, { params: { chain_id: chainId }, timeout: 10000 });
    const d = r.data?.result;
    if (!d) return { success: false, error: "Address not found" };
    const flags: string[] = [];
    if (d.cybercrime === "1") flags.push("🔴 Cybercrime");
    if (d.money_laundering === "1") flags.push("🔴 Money laundering");
    if (d.phishing_activities === "1") flags.push("🔴 Phishing");
    if (d.sanctioned === "1") flags.push("🔴 SANCTIONED");
    if (d.honeypot_related_address === "1") flags.push("🔴 Honeypot related");
    return {
      success: true,
      data: { address, chain, risk: flags.length ? "🔴 RISKY" : "🟢 NO KNOWN RISKS", flags },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function phishingCheck(url: string): Promise<ToolResult> {
  try {
    const r = await axios.get(`${GOPLUS}/phishing_site`, { params: { url }, timeout: 10000 });
    const isPhishing = r.data?.result?.phishing_site === 1;
    return {
      success: true,
      data: { url, isPhishing, verdict: isPhishing ? "🔴 PHISHING DETECTED" : "🟢 No phishing flags" },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function checkApprovals(address: string, chain: string): Promise<ToolResult> {
  const chainId = CHAIN_IDS[chain.toLowerCase()] || "1";
  try {
    const r = await axios.get(`${GOPLUS}/approval_security/${chainId}/${address}`, { timeout: 12000 });
    const approvals = r.data?.result || [];
    const risky = approvals.filter((a: any) => a.trust_list !== "1" || a.doubt_list === "1");
    return {
      success: true,
      data: {
        address, chain,
        totalApprovals: approvals.length, riskyApprovals: risky.length,
        approvals: approvals.slice(0, 20).map((a: any) => ({
          contract: a.contract, name: a.contract_name,
          trusted: a.trust_list === "1", risky: a.doubt_list === "1",
        })),
        recommendation: risky.length > 0 ? "⚠️ Revoke risky approvals at revoke.cash" : "✅ Safe",
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-security",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Token security, rug check, phishing detection",
  license: "MIT",
  tools: [
    defineTool({ name: "token_security", description: "GoPlus token security check (honeypot, mintable). Multi-chain.", inputSchema: inputSchema({ contract_address: { type: "string", description: "Token contract" }, chain: { type: "string", description: "ethereum, bsc, base, solana etc" } }, ["contract_address"]), handler: async (i) => tokenSecurity(i.contract_address as string, (i.chain as string) || "ethereum"), category: "security", permission: "read" }),
    defineTool({ name: "address_security", description: "Check if wallet has malicious flags", inputSchema: inputSchema({ address: { type: "string", description: "Address" }, chain: { type: "string", description: "Chain" } }, ["address"]), handler: async (i) => addressSecurity(i.address as string, (i.chain as string) || "ethereum"), category: "security", permission: "read" }),
    defineTool({ name: "check_approvals", description: "Check wallet approvals — find risky ones", inputSchema: inputSchema({ address: { type: "string", description: "Address" }, chain: { type: "string", description: "Chain" } }, ["address"]), handler: async (i) => checkApprovals(i.address as string, (i.chain as string) || "ethereum"), category: "security", permission: "read" }),
    defineTool({ name: "phishing_check", description: "Check if URL is phishing", inputSchema: inputSchema({ url: { type: "string", description: "URL" } }, ["url"]), handler: async (i) => phishingCheck(i.url as string), category: "security", permission: "read" }),
  ]

});
