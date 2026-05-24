import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { nftFloorPrice, nftTrending, airdropRadar, checkAirdropEligibility, dxyAndYields, cryptoStockCorrelation, multiWalletPortfolio, jupiterQuote, oneInchQuote, upcomingUnlocks, fundingArbScanner } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-airdrop", version: "1.0.0", author: "OpenVesper",
  description: "Airdrop radar + bonus tools (NFT floor, unlocks, arb scanner)", license: "MIT",
  tools: [
    defineTool({ name: "airdrop_radar", description: "Currently active airdrops", inputSchema: inputSchema({}), handler: async () => airdropRadar(), category: "airdrop" }),
    defineTool({ name: "airdrop_eligibility", description: "Check wallet eligibility for airdrop", inputSchema: inputSchema({ address: { type: "string", description: "Wallet" }, project: { type: "string", description: "Project" } }, ["address", "project"]), handler: async (i) => checkAirdropEligibility(i.address as string, i.project as string), category: "airdrop" }),
    defineTool({ name: "nft_floor_price", description: "NFT collection floor price", inputSchema: inputSchema({ collection_slug: { type: "string", description: "Slug" } }, ["collection_slug"]), handler: async (i) => nftFloorPrice(i.collection_slug as string), category: "nft" }),
    defineTool({ name: "nft_trending", description: "Trending NFT collections", inputSchema: inputSchema({}), handler: async () => nftTrending(), category: "nft" }),
    defineTool({ name: "dxy_yields", description: "DXY + treasury yields", inputSchema: inputSchema({}), handler: async () => dxyAndYields(), category: "macro" }),
    defineTool({ name: "crypto_stock_correlation", description: "BTC vs SPY/QQQ correlation", inputSchema: inputSchema({}), handler: async () => cryptoStockCorrelation(), category: "macro" }),
    defineTool({ name: "multi_wallet_portfolio", description: "Aggregated portfolio for multiple wallets", inputSchema: inputSchema({ wallets: { type: "string", description: "JSON array" } }, ["wallets"]), handler: async (i) => { let w = []; try { w = JSON.parse(i.wallets as string); } catch {} return multiWalletPortfolio(w as any); }, category: "onchain" }),
    defineTool({ name: "oneinch_quote", description: "1inch swap quote", inputSchema: inputSchema({ chain_id: { type: "number", description: "Chain ID" }, from_token: { type: "string", description: "From" }, to_token: { type: "string", description: "To" }, amount: { type: "string", description: "Amount" } }, ["chain_id", "from_token", "to_token", "amount"]), handler: async (i) => oneInchQuote((i.chain_id as number) || 1, i.from_token as string, i.to_token as string, i.amount as string), category: "defi" }),
    defineTool({ name: "upcoming_unlocks", description: "Token unlock schedule", inputSchema: inputSchema({}), handler: async () => upcomingUnlocks(), category: "macro" }),
    defineTool({ name: "funding_arb_scanner", description: "Funding rate arbitrage scanner", inputSchema: inputSchema({}), handler: async () => fundingArbScanner(), category: "trading" }),
  ]

});
