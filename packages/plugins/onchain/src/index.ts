import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { getWalletBalance, getWalletTxHistory, getTokenHolders, getSolanaWallet, getSolanaTokenInfo } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-onchain", version: "1.0.0", author: "OpenVesper",
  description: "On-chain wallet & token analysis (ETH, Base, Solana)", license: "MIT",
  tools: [
    defineTool({ name: "wallet_balance", description: "Get EVM wallet balance (ETH/Base)", inputSchema: inputSchema({ address: { type: "string", description: "Address" }, chain: { type: "string", description: "eth or base" } }, ["address"]), handler: async (i) => getWalletBalance(i.address as string, (i.chain as any) || "eth"), category: "onchain" }),
    defineTool({ name: "wallet_transactions", description: "Recent transactions for EVM wallet", inputSchema: inputSchema({ address: { type: "string", description: "Address" }, chain: { type: "string", description: "Chain" }, limit: { type: "number", description: "Count" } }, ["address"]), handler: async (i) => getWalletTxHistory(i.address as string, (i.chain as any) || "eth", (i.limit as number) || 10), category: "onchain" }),
    defineTool({ name: "token_info_evm", description: "EVM token info & holders", inputSchema: inputSchema({ contract_address: { type: "string", description: "Contract" }, chain: { type: "string", description: "Chain" } }, ["contract_address"]), handler: async (i) => getTokenHolders(i.contract_address as string, (i.chain as any) || "eth"), category: "onchain" }),
    defineTool({ name: "solana_wallet", description: "Solana wallet balance & tokens", inputSchema: inputSchema({ address: { type: "string", description: "Solana address" } }, ["address"]), handler: async (i) => getSolanaWallet(i.address as string), category: "onchain" }),
    defineTool({ name: "solana_token", description: "Solana token info", inputSchema: inputSchema({ mint_address: { type: "string", description: "Mint" } }, ["mint_address"]), handler: async (i) => getSolanaTokenInfo(i.mint_address as string), category: "onchain" }),
  ]

});
