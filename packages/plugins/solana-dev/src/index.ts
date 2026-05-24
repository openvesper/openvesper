import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { solanaProgramInfo, fetchAnchorIDL, solanaComputeUnits, token2022Info, compressedNFTinfo, heliusAssetsByOwner, solanaRPCHealth } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-solana-dev", version: "1.0.0", author: "OpenVesper",
  description: "Solana developer tools — IDL, Token-2022, cNFT, compute units, RPC health", license: "MIT",
  tools: [
    defineTool({ name: "solana_program_info", description: "Solana program account info", inputSchema: inputSchema({ program_id: { type: "string", description: "Program ID" } }, ["program_id"]), handler: async (i) => solanaProgramInfo(i.program_id as string), category: "soldev" }),
    defineTool({ name: "anchor_idl", description: "Fetch Anchor IDL for Solana program", inputSchema: inputSchema({ program_id: { type: "string", description: "Program ID" } }, ["program_id"]), handler: async (i) => fetchAnchorIDL(i.program_id as string), category: "soldev" }),
    defineTool({ name: "solana_compute_units", description: "CU + priority fee guidance for tx types", inputSchema: inputSchema({}), handler: async () => solanaComputeUnits(), category: "soldev" }),
    defineTool({ name: "token_2022_info", description: "Token-2022 extension info", inputSchema: inputSchema({ mint: { type: "string", description: "Mint" } }, ["mint"]), handler: async (i) => token2022Info(i.mint as string), category: "soldev" }),
    defineTool({ name: "compressed_nft_info", description: "Compressed NFT lookup via Helius DAS", inputSchema: inputSchema({ asset_id: { type: "string", description: "Asset ID" } }, ["asset_id"]), handler: async (i) => compressedNFTinfo(i.asset_id as string), category: "soldev" }),
    defineTool({ name: "helius_assets_by_owner", description: "All tokens + NFTs for a Solana wallet", inputSchema: inputSchema({ owner: { type: "string", description: "Owner" }, page: { type: "number", description: "Page" } }, ["owner"]), handler: async (i) => heliusAssetsByOwner(i.owner as string, (i.page as number) || 1), category: "soldev" }),
    defineTool({ name: "solana_rpc_health", description: "Solana RPC endpoint latency check", inputSchema: inputSchema({}), handler: async () => solanaRPCHealth(), category: "soldev" }),
  ]

});
