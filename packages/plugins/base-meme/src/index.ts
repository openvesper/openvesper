import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { clankerTrending, virtualsAgents, aerodromeTopPools, baseTrending } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-base-meme", version: "1.0.0", author: "OpenVesper",
  description: "Base network memes — Clanker, Virtuals AI agents, Aerodrome", license: "MIT",
  tools: [
    defineTool({ name: "clanker_trending", description: "Trending Clanker meme tokens (Farcaster-launched)", inputSchema: inputSchema({}), handler: async () => clankerTrending(), category: "base" }),
    defineTool({ name: "virtuals_agents", description: "Top Virtuals.io AI agent tokens", inputSchema: inputSchema({ limit: { type: "number", description: "Count" } }), handler: async (i) => virtualsAgents((i.limit as number) || 20), category: "base" }),
    defineTool({ name: "aerodrome_pools", description: "Aerodrome Finance top pools on Base", inputSchema: inputSchema({}), handler: async () => aerodromeTopPools(), category: "base" }),
    defineTool({ name: "base_trending", description: "Trending tokens on Base network", inputSchema: inputSchema({}), handler: async () => baseTrending(), category: "base" }),
  ]

});
