// ============================================================
// 🌒 @openvesper/plugin-discord
//
// Send messages to Discord via webhook or bot API.
// User configures their own bot/webhook. We do not bundle one.
//
// Required env:
//   DISCORD_WEBHOOK_URL  — for webhook sends
//   DISCORD_BOT_TOKEN    — for bot sends (more powerful)
//
// PRIVACY: Messages go directly from your gateway to Discord's API.
// No OpenVesper servers involved.
// ============================================================

import axios from "axios";
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import type { ToolResult } from "@openvesper/plugin-sdk";

const DISCORD_API = "https://discord.com/api/v10";

async function discordSendWebhook(content: string, opts: { username?: string; embeds?: any[] } = {}): Promise<ToolResult> {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    return { success: false, error: "DISCORD_WEBHOOK_URL not set in env" };
  }
  try {
    const r = await axios.post(
      process.env.DISCORD_WEBHOOK_URL,
      {
        content: content.slice(0, 2000),
        username: opts.username,
        embeds: opts.embeds,
      },
      { timeout: 10000 }
    );
    return { success: true, data: { delivered: true, status: r.status } };
  } catch (e: any) {
    return { success: false, error: `Discord webhook failed: ${e.message}` };
  }
}

async function discordSendBot(channelId: string, content: string): Promise<ToolResult> {
  if (!process.env.DISCORD_BOT_TOKEN) {
    return { success: false, error: "DISCORD_BOT_TOKEN not set in env" };
  }
  try {
    const r = await axios.post(
      `${DISCORD_API}/channels/${channelId}/messages`,
      { content: content.slice(0, 2000) },
      {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        timeout: 10000,
      }
    );
    return { success: true, data: { messageId: r.data.id, channelId } };
  } catch (e: any) {
    return { success: false, error: `Discord bot send failed: ${e.message}` };
  }
}

async function discordSendEmbed(title: string, description: string, opts: { color?: number; fields?: any[]; url?: string } = {}): Promise<ToolResult> {
  return discordSendWebhook("", {
    embeds: [
      {
        title: title.slice(0, 256),
        description: description.slice(0, 4096),
        color: opts.color || 0xf59e0b, // OpenVesper accent
        fields: opts.fields,
        url: opts.url,
      },
    ],
  });
}

export default definePlugin({
  name: "@openvesper/plugin-discord",
  version: "1.0.0",
  description: "Discord channel — webhook + bot send. User-configured credentials.",
  tools: [
    defineTool({
      name: "discord_send",
      description:
        "Send a message to Discord via webhook. Requires DISCORD_WEBHOOK_URL env var. Mutation operation.",
      inputSchema: inputSchema(
        {
          content: { type: "string", description: "Message text (max 2000 chars)" },
          username: { type: "string", description: "Override webhook display name" },
        },
        ["content"]
      ),
      permission: "external",
      handler: async (input) =>
        discordSendWebhook(input.content as string, { username: input.username as string }),
      category: "comms",
    }),
    defineTool({
      name: "discord_send_bot",
      description:
        "Send a message via Discord bot to a specific channel. Requires DISCORD_BOT_TOKEN env var.",
      inputSchema: inputSchema(
        {
          channel_id: { type: "string", description: "Discord channel ID" },
          content: { type: "string", description: "Message text (max 2000 chars)" },
        },
        ["channel_id", "content"]
      ),
      permission: "external",
      handler: async (input) => discordSendBot(input.channel_id as string, input.content as string),
      category: "comms",
    }),
    defineTool({
      name: "discord_send_embed",
      description: "Send a rich embed to Discord via webhook (title + description + optional fields).",
      inputSchema: inputSchema(
        {
          title: { type: "string" },
          description: { type: "string" },
          color: { type: "number", description: "Decimal color (default OpenVesper amber)" },
          url: { type: "string", description: "Optional title link" },
        },
        ["title", "description"]
      ),
      permission: "external",
      handler: async (input) =>
        discordSendEmbed(input.title as string, input.description as string, {
          color: input.color as number,
          url: input.url as string,
        }),
      category: "comms",
    }),
  ],
});
