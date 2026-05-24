import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import { whaleAlerts, getEthWhaleTransfers, exchangeFlows, smartMoneyFlow, topHolders } from "./tools";

export default definePlugin({
  name: "@openvesper/plugin-whale", version: "1.0.0", author: "OpenVesper",
  description: "Whale tracking & smart money flow", license: "MIT",
  tools: [
    defineTool({ name: "whale_alerts", description: "Large transactions across chains", inputSchema: inputSchema({ min_value: { type: "number", description: "USD" }, limit: { type: "number", description: "Count" } }), handler: async (i) => whaleAlerts((i.min_value as number) || 1000000, (i.limit as number) || 20), category: "whales" }),
    defineTool({ name: "eth_whale_transfers", description: "Large ETH token transfers", inputSchema: inputSchema({ token_contract: { type: "string", description: "Token contract" }, min_tokens: { type: "number", description: "Min tokens" } }), handler: async (i) => getEthWhaleTransfers(i.token_contract as string || undefined, (i.min_tokens as number) || 100000), category: "whales" }),
    defineTool({ name: "exchange_flows", description: "Coin flow in/out of exchanges", inputSchema: inputSchema({ coin: { type: "string", description: "Coin" } }, ["coin"]), handler: async (i) => exchangeFlows(i.coin as string), category: "whales" }),
    defineTool({ name: "smart_money_flow", description: "Track Vitalik, Wintermute, Jump etc.", inputSchema: inputSchema({}), handler: async () => smartMoneyFlow(), category: "whales" }),
    defineTool({ name: "top_holders", description: "Top holders for a coin", inputSchema: inputSchema({ coin_id: { type: "string", description: "Coin ID" } }, ["coin_id"]), handler: async (i) => topHolders(i.coin_id as string), category: "whales" }),
  ]

});
