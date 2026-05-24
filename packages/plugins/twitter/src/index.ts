import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { searchTweets, getTwitterProfile, getCryptoTwitterSentiment } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-twitter",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Twitter/X — sentiment, profiles, search",
  license: "MIT",
  tools: [
    defineTool({ name: "twitter_search", description: "Search tweets", inputSchema: inputSchema({ query: { type: "string", description: "Query" }, limit: { type: "number", description: "Count" } }, ["query"]), handler: async (i) => searchTweets(i.query as string, (i.limit as number) || 10), category: "social", permission: "external" }),
    defineTool({ name: "twitter_profile", description: "Get user profile", inputSchema: inputSchema({ username: { type: "string", description: "Username" } }, ["username"]), handler: async (i) => getTwitterProfile(i.username as string), category: "social", permission: "external" }),
    defineTool({ name: "crypto_twitter_sentiment", description: "Twitter sentiment for crypto", inputSchema: inputSchema({ coin: { type: "string", description: "Coin" } }, ["coin"]), handler: async (i) => getCryptoTwitterSentiment(i.coin as string), category: "social", permission: "external" }),
  ]

});
