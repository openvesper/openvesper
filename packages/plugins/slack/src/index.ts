// ============================================================
// 🌒 @openvesper/plugin-slack
// Slack API — messages, channels, users
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function slackCall(method: string, payload: Record<string, unknown>, isGet = false): Promise<ToolResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return { success: false, error: "SLACK_BOT_TOKEN required" };

  try {
    let url = `https://slack.com/api/${method}`;
    let fetchOpts: RequestInit;

    if (isGet) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) params.set(k, String(v));
      }
      url += "?" + params.toString();
      fetchOpts = { headers: { Authorization: `Bearer ${token}` } };
    } else {
      fetchOpts = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      };
    }

    const r = await fetch(url, fetchOpts);
    const data = await r.json();
    if (!data.ok) return { success: false, error: data.error || "Slack API error", data };
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendMessage(channel: string, text: string, threadTs?: string): Promise<ToolResult> {
  return slackCall("chat.postMessage", { channel, text, thread_ts: threadTs });
}

async function sendBlocks(channel: string, blocksJson: string): Promise<ToolResult> {
  let blocks;
  try { blocks = JSON.parse(blocksJson); } catch { return { success: false, error: "Invalid blocks JSON" }; }
  return slackCall("chat.postMessage", { channel, blocks });
}

async function listChannels(): Promise<ToolResult> {
  const r = await slackCall("conversations.list", { types: "public_channel,private_channel", limit: 100 }, true);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      channels: ((r.data as any).channels || []).map((c: any) => ({
        id: c.id, name: c.name, is_private: c.is_private, member_count: c.num_members,
      })),
    },
  };
}

async function listUsers(): Promise<ToolResult> {
  const r = await slackCall("users.list", { limit: 100 }, true);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      users: ((r.data as any).members || []).filter((u: any) => !u.deleted && !u.is_bot).map((u: any) => ({
        id: u.id, name: u.real_name || u.name, email: u.profile?.email,
      })),
    },
  };
}

async function getChannelHistory(channel: string, limit: number): Promise<ToolResult> {
  const r = await slackCall("conversations.history", { channel, limit: limit || 20 }, true);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      channel,
      messages: ((r.data as any).messages || []).map((m: any) => ({
        ts: m.ts, user: m.user, text: m.text, type: m.type,
      })),
    },
  };
}

async function createChannel(name: string, isPrivate: boolean): Promise<ToolResult> {
  return slackCall("conversations.create", { name, is_private: isPrivate });
}

async function reactToMessage(channel: string, timestamp: string, reaction: string): Promise<ToolResult> {
  return slackCall("reactions.add", { channel, timestamp, name: reaction });
}

async function searchMessages(query: string): Promise<ToolResult> {
  const r = await slackCall("search.messages", { query }, true);
  if (!r.success) return r;
  return {
    success: true,
    data: {
      query,
      results: (((r.data as any).messages?.matches) || []).slice(0, 20).map((m: any) => ({
        channel: m.channel?.name, user: m.username, text: m.text, ts: m.ts, permalink: m.permalink,
      })),
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-slack",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Slack — send messages, manage channels, search",
  license: "MIT",
  tools: [
    defineTool({ name: "slack_send_message", description: "Send message to Slack channel/user. Use #channel-name or @user.", inputSchema: inputSchema({ channel: { type: "string", description: "Channel ID, #name, or @user" }, text: { type: "string", description: "Message text" }, thread_ts: { type: "string", description: "Optional thread timestamp for replies" } }, ["channel", "text"]), handler: async (i) => sendMessage(i.channel as string, i.text as string, i.thread_ts as string), category: "slack", permission: "external" }),
    defineTool({ name: "slack_send_blocks", description: "Send rich message blocks (JSON)", inputSchema: inputSchema({ channel: { type: "string", description: "Channel" }, blocks: { type: "string", description: "JSON array of Slack Block Kit blocks" } }, ["channel", "blocks"]), handler: async (i) => sendBlocks(i.channel as string, i.blocks as string), category: "slack", permission: "external" }),
    defineTool({ name: "slack_list_channels", description: "List all Slack channels", inputSchema: inputSchema({}), handler: async () => listChannels(), category: "slack" }),
    defineTool({ name: "slack_list_users", description: "List Slack workspace members", inputSchema: inputSchema({}), handler: async () => listUsers(), category: "slack" }),
    defineTool({ name: "slack_channel_history", description: "Read recent messages from a channel", inputSchema: inputSchema({ channel: { type: "string", description: "Channel ID" }, limit: { type: "number", description: "Max messages" } }, ["channel"]), handler: async (i) => getChannelHistory(i.channel as string, (i.limit as number) || 20), category: "slack" }),
    defineTool({ name: "slack_create_channel", description: "Create a new Slack channel", inputSchema: inputSchema({ name: { type: "string", description: "Channel name (lowercase, no spaces)" }, is_private: { type: "boolean", description: "Private channel?" } }, ["name"]), handler: async (i) => createChannel(i.name as string, Boolean(i.is_private)), category: "slack", permission: "write" }),
    defineTool({ name: "slack_react", description: "Add emoji reaction to a message", inputSchema: inputSchema({ channel: { type: "string", description: "Channel" }, timestamp: { type: "string", description: "Message timestamp" }, reaction: { type: "string", description: "Emoji name (no colons, e.g. 'thumbsup')" } }, ["channel", "timestamp", "reaction"]), handler: async (i) => reactToMessage(i.channel as string, i.timestamp as string, i.reaction as string), category: "slack" }),
    defineTool({ name: "slack_search", description: "Search messages across the workspace", inputSchema: inputSchema({ query: { type: "string", description: "Search query" } }, ["query"]), handler: async (i) => searchMessages(i.query as string), category: "slack" }),
  ]

});
