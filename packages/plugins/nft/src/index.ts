import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import axios from "axios";

const OPENSEA = "https://api.opensea.io/api/v2";

async function nftFloorPrice(collectionSlug: string): Promise<ToolResult> {
  try {
    const headers: any = { "Accept": "application/json" };
    if (process.env.OPENSEA_API_KEY) headers["X-API-KEY"] = process.env.OPENSEA_API_KEY;
    const r = await axios.get(`${OPENSEA}/collections/${collectionSlug}/stats`, { headers, timeout: 10000 });
    const stats = r.data?.total;
    return {
      success: true,
      data: {
        collection: collectionSlug,
        floorPriceETH: r.data?.total?.floor_price,
        volumeETH: stats?.volume,
        salesCount: stats?.sales,
        avgPriceETH: stats?.average_price,
        marketCapETH: stats?.market_cap,
        owners: stats?.num_owners,
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function nftTrending(): Promise<ToolResult> {
  try {
    const r = await axios.get("https://api.coingecko.com/api/v3/nfts/list", { params: { per_page: 30, page: 1, order: "h24_volume_usd_desc" }, timeout: 10000 });
    return {
      success: true,
      data: {
        trending: (r.data || []).slice(0, 20).map((n: any) => ({
          name: n.name, symbol: n.symbol, id: n.id,
          marketCapUSD: n.market_cap_usd, floorPriceUSD: n.floor_price_usd,
          volume24h: n.volume_24h_usd, ownersCount: n.number_of_unique_addresses,
        })),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-nft", version: "1.0.0", author: "OpenVesper",
  description: "NFT floor prices and trending collections", license: "MIT",
  tools: [
    defineTool({ name: "nft_floor_price", description: "OpenSea floor price + stats", inputSchema: inputSchema({ collection_slug: { type: "string", description: "Collection slug (bayc, pudgypenguins)" } }, ["collection_slug"]), handler: async (i) => nftFloorPrice(i.collection_slug as string), category: "nft" }),
    defineTool({ name: "nft_trending", description: "Trending NFT collections by volume", inputSchema: inputSchema({}), handler: async () => nftTrending(), category: "nft" }),
  ]

});
