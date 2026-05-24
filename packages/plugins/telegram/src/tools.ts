// ============================================================
// 🛸 Terminal of UFO — Telegram Integration Tool
// Users add their own BOT_TOKEN + CHAT_ID in .env
// ============================================================

import axios from "axios";
import { ToolResult } from "@openvesper/plugin-sdk";

const TG_BASE = "https://api.telegram.org/bot";

function getBot(): { token: string; chatId: string } | null {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

// ── Send Messages ─────────────────────────────────────────────────────────────

export async function sendTelegramMessage(text: string, chatId?: string): Promise<ToolResult> {
  const bot = getBot();
  if (!bot) {
    return {
      success: false,
      error: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID not set in .env\n" +
             "Setup guide:\n" +
             "1. Message @BotFather on Telegram → /newbot\n" +
             "2. Copy the bot token → TELEGRAM_BOT_TOKEN=...\n" +
             "3. Message @userinfobot to get your chat ID → TELEGRAM_CHAT_ID=...\n" +
             "4. Start a chat with your bot first (send /start)",
    };
  }

  try {
    const targetChat = chatId || bot.chatId;
    const r = await axios.post(`${TG_BASE}${bot.token}/sendMessage`, {
      chat_id: targetChat,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }, { timeout: 10000 });

    return {
      success: true,
      data: {
        sent: true,
        messageId: r.data.result?.message_id,
        chatId: targetChat,
        text: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
      },
    };
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Telegram send failed: ${err}` };
  }
}

export async function sendTelegramAlert(
  type: "price" | "signal" | "news" | "custom",
  data: Record<string, unknown>
): Promise<ToolResult> {
  const bot = getBot();
  if (!bot) return { success: false, error: "Telegram not configured. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to .env" };

  let text = "";

  switch (type) {
    case "price":
      text = [
        `🛸 <b>UFO Price Alert</b>`,
        ``,
        `🪙 <b>${data.coin}</b>`,
        `💰 Price: <b>${data.price}</b>`,
        `📈 24h: <b>${data.change24h}</b>`,
        `📊 Volume: ${data.volume || "N/A"}`,
        ``,
        `⏰ ${new Date().toLocaleString()}`,
      ].join("\n");
      break;

    case "signal":
      text = [
        `🛸 <b>UFO Trading Signal</b>`,
        ``,
        `🎯 <b>${data.coin}</b> — ${data.signal}`,
        `📊 RSI: ${data.rsi || "N/A"}`,
        `📈 MACD: ${data.macd || "N/A"}`,
        `🔥 Trend: ${data.trend || "N/A"}`,
        ``,
        data.signals ? `Signals:\n${(data.signals as string[]).map((s: string) => `• ${s}`).join("\n")}` : "",
        ``,
        `⚠️ Not financial advice`,
        `⏰ ${new Date().toLocaleString()}`,
      ].filter(Boolean).join("\n");
      break;

    case "news":
      text = [
        `🛸 <b>UFO News Alert</b>`,
        ``,
        `📰 <b>${data.title}</b>`,
        ``,
        data.summary ? `${String(data.summary).slice(0, 300)}...` : "",
        ``,
        data.url ? `🔗 <a href="${data.url}">Read more</a>` : "",
        `📡 Source: ${data.source || "Unknown"}`,
        `⏰ ${new Date().toLocaleString()}`,
      ].filter(Boolean).join("\n");
      break;

    case "custom":
    default:
      text = String(data.message || JSON.stringify(data));
  }

  return sendTelegramMessage(text, data.chatId as string | undefined);
}

export async function sendCryptoReport(
  coin: string,
  priceData: Record<string, unknown>,
  technicalData: Record<string, unknown>
): Promise<ToolResult> {
  const bot = getBot();
  if (!bot) return { success: false, error: "Telegram not configured" };

  const trend = String(technicalData.trend || "NEUTRAL");
  const trendEmoji = {
    STRONG_UP: "🟢🟢", UP: "🟢", NEUTRAL: "⚪",
    DOWN: "🔴", STRONG_DOWN: "🔴🔴"
  }[trend] || "⚪";

  const text = [
    `🛸 <b>UFO Crypto Report — ${coin.toUpperCase()}</b>`,
    ``,
    `💰 Price: <b>${priceData.price || "N/A"}</b>`,
    `📈 24h Change: ${priceData.change24h || "N/A"}`,
    `💹 Market Cap: ${priceData.marketCap || "N/A"}`,
    ``,
    `📊 <b>Technical Analysis</b>`,
    `• RSI(14): ${technicalData.rsi14 || "N/A"}`,
    `• MACD: ${technicalData.macd || "N/A"}`,
    `• SMA20: ${technicalData.sma20 || "N/A"}`,
    `• SMA50: ${technicalData.sma50 || "N/A"}`,
    ``,
    `${trendEmoji} Overall Trend: <b>${trend}</b>`,
    ``,
    `⚠️ Not financial advice. DYOR.`,
    `⏰ ${new Date().toLocaleString()}`,
  ].join("\n");

  return sendTelegramMessage(text);
}

export async function sendMemeTokenAlert(tokenData: Record<string, unknown>): Promise<ToolResult> {
  const bot = getBot();
  if (!bot) return { success: false, error: "Telegram not configured" };

  const score = Number(tokenData.score || 0);
  const scoreEmoji = score >= 70 ? "🟢" : score >= 50 ? "🟡" : score >= 30 ? "🟠" : "🔴";

  const text = [
    `🛸 <b>UFO Meme Token Alert</b>`,
    ``,
    `🪙 <b>${tokenData.name} (${tokenData.symbol})</b>`,
    `⛓ Chain: ${tokenData.chain}`,
    `💰 Price: ${tokenData.price}`,
    ``,
    `📈 Price Changes:`,
    `• 1h: ${tokenData.change1h}`,
    `• 6h: ${tokenData.change6h}`,
    `• 24h: ${tokenData.change24h}`,
    ``,
    `💧 Liquidity: ${tokenData.liquidity}`,
    `📊 Volume 24h: ${tokenData.volume24h}`,
    `🔄 Buy Pressure: ${tokenData.buyPressure}`,
    `⏰ Age: ${tokenData.ageHours}`,
    ``,
    `${scoreEmoji} Signal Score: <b>${score}/100</b>`,
    ``,
    tokenData.dexUrl ? `🔗 <a href="${tokenData.dexUrl as string}">View on DEX</a>` : "",
    ``,
    `⚠️ DYOR. Meme tokens are extremely high risk.`,
  ].filter(Boolean).join("\n");

  return sendTelegramMessage(text);
}

export async function getTelegramBotInfo(): Promise<ToolResult> {
  const bot = getBot();
  if (!bot) return { success: false, error: "Telegram not configured" };

  try {
    const r = await axios.get(`${TG_BASE}${bot.token}/getMe`, { timeout: 8000 });
    return {
      success: true,
      data: {
        configured: true,
        botUsername: r.data.result?.username,
        botName: r.data.result?.first_name,
        chatId: bot.chatId,
        status: "✅ Bot connected and ready",
      },
    };
  } catch (e: unknown) {
    return { success: false, error: `Bot check failed: ${e instanceof Error ? e.message : e}` };
  }
}
