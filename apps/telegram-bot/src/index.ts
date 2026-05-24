// ============================================================
// 🌒 @openvesper/telegram-bot
// Standalone Telegram bot that exposes OpenVesper agents
// ============================================================

import "dotenv/config";
import { createVesper } from "@openvesper/core";

// Plugins
import bagsfmPlugin from "@openvesper/plugin-bagsfm";
import pumpfunPlugin from "@openvesper/plugin-pumpfun";
import solanaPlugin from "@openvesper/plugin-solana";
import cryptoPlugin from "@openvesper/plugin-crypto";
import securityPlugin from "@openvesper/plugin-security";
import researchPlugin from "@openvesper/plugin-research";
import defiPlugin from "@openvesper/plugin-defi";
import twitterPlugin from "@openvesper/plugin-twitter";
import onchainPlugin from "@openvesper/plugin-onchain";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USERS = process.env.TELEGRAM_ALLOWED_USERS?.split(",").map((u) => u.trim()) || [];

if (!BOT_TOKEN) {
  console.error("✗ TELEGRAM_BOT_TOKEN required in .env");
  process.exit(1);
}

const vesper = createVesper({
  llm: { provider: (process.env.LLM_PROVIDER as any) || "anthropic" },
})
  .use(bagsfmPlugin).use(pumpfunPlugin).use(solanaPlugin)
  .use(cryptoPlugin).use(securityPlugin)
  .use(researchPlugin).use(defiPlugin).use(twitterPlugin).use(onchainPlugin);

// User state: chat_id → { agent, history }
const userState: Map<number, { agent: string; history: Array<{ role: string; content: string }> }> = new Map();

const AGENTS_LIST = [
  { mode: "auto", icon: "🛸", name: "Auto" },
  { mode: "bagsfm", icon: "🎒", name: "Bags.fm" },
  { mode: "pumpfun", icon: "🚀", name: "Pump.fun" },
  { mode: "solana", icon: "☀️", name: "Solana" },
  { mode: "crypto", icon: "📈", name: "Crypto" },
  { mode: "trading", icon: "📊", name: "Trading" },
  { mode: "security", icon: "🛡", name: "Security" },
  { mode: "research", icon: "🔍", name: "Research" },
  { mode: "defi", icon: "🏦", name: "DeFi" },
  { mode: "twitter", icon: "🐦", name: "Twitter" },
  { mode: "onchain", icon: "⛓", name: "On-Chain" },
];

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function send(chatId: number, text: string, opts: Record<string, unknown> = {}) {
  // Telegram limit is 4096 chars — split if needed
  const chunks: string[] = [];
  let buf = text;
  while (buf.length > 4000) {
    let split = buf.lastIndexOf("\n", 4000);
    if (split < 2000) split = 4000;
    chunks.push(buf.slice(0, split));
    buf = buf.slice(split);
  }
  chunks.push(buf);

  for (const chunk of chunks) {
    try {
      await fetch(`${API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
          parse_mode: "Markdown",
          ...opts,
        }),
      });
    } catch (e) {
      console.error("Send error:", e);
    }
  }
}

async function sendChatAction(chatId: number, action: string) {
  try {
    await fetch(`${API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch { /* ignore */ }
}

function isAllowedStatic(username: string | undefined, userId: number): boolean {
  // Legacy env-based allowlist — used as fallback when gateway is
  // unreachable or pairing policy is "open".
  if (ALLOWED_USERS.length === 0) return true; // No restriction if not set
  if (username && ALLOWED_USERS.includes(username)) return true;
  if (ALLOWED_USERS.includes(String(userId))) return true;
  return false;
}

/**
 * Ask the gateway's pairing endpoint what to do with this sender.
 * Returns one of:
 *   - "process"          → message proceeds to the agent
 *   - "reply-with-code"  → bot replies with pairing code
 *   - "drop"             → silent discard
 *   - "reject"           → polite rejection message
 *
 * On gateway failure, falls back to env-based allowlist.
 */
type GateAction = "process" | "reply-with-code" | "drop" | "reject";

const GATEWAY_URL = process.env.OPENVESPER_GATEWAY_URL || "http://127.0.0.1:18789";
const DM_POLICY = (process.env.TELEGRAM_DM_POLICY || "pairing") as
  | "pairing"
  | "open"
  | "closed";

async function checkPairingGate(
  identity: string,
  displayName?: string
): Promise<{ action: GateAction; code?: string; firstTime?: boolean }> {
  try {
    const res = await fetch(`${GATEWAY_URL}/pairing/gate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "telegram",
        identity,
        policy: DM_POLICY,
        displayName,
      }),
      // Short timeout — gateway may be down, fall back fast
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`gateway ${res.status}`);
    return await res.json();
  } catch (err) {
    // Gateway unreachable — fall back to static allowlist
    console.warn(
      `⚠ Pairing gate unreachable (${err instanceof Error ? err.message : err}), using static allowlist`
    );
    return { action: "process" }; // Static check happens at caller
  }
}

async function handleMessage(msg: any) {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const username = msg.from?.username;
  const text = msg.text || "";

  // ── Step 1: Pairing gate ────────────────────────────────────────
  // Ask the gateway whether this sender is allowed, pending pairing, or
  // explicitly denied. Falls through to static allowlist if gateway is down.
  const identity = String(userId);
  const displayName = username || (msg.from?.first_name as string | undefined);
  const gate = await checkPairingGate(identity, displayName);

  if (gate.action === "drop") {
    // Silently discard — user is on the deny list
    return;
  }
  if (gate.action === "reject") {
    await send(
      chatId,
      "🛑 This bot is configured for pre-approved senders only. " +
        "Ask the operator to add you to the allowlist."
    );
    return;
  }
  if (gate.action === "reply-with-code") {
    const intro = gate.firstTime
      ? "👋 Hi! This bot is in pairing mode."
      : "👋 You already have a pending pairing code.";
    await send(
      chatId,
      `${intro}\n\n` +
        `Your pairing code: \`${gate.code}\`\n\n` +
        `The operator needs to approve you by running:\n` +
        `\`vesper pairing approve telegram ${gate.code}\`\n\n` +
        `Once approved, send your message again.`,
      { parse_mode: "Markdown" }
    );
    return;
  }
  // gate.action === "process" — also enforce static env allowlist for
  // belt-and-suspenders defense if gateway said "open" but env restricts.
  if (DM_POLICY === "open" || gate.action === "process") {
    if (!isAllowedStatic(username, userId)) {
      await send(chatId, "🛑 Sorry, you're not authorized to use this bot.");
      return;
    }
  }

  // Commands
  if (text.startsWith("/start")) {
    const greeting = `🌒 *Welcome to OpenVesper Bot!*

I'm a multi-agent AI assistant with crypto-first plugins.

📋 *Commands:*
/agents — Show all agents
/agent <name> — Switch agent (e.g. /agent bagsfm)
/clear — Clear conversation
/help — Show this

💬 *Just type a message to chat with the current agent.*

Current agent: 🛸 *Auto*`;
    userState.set(chatId, { agent: "auto", history: [] });
    await send(chatId, greeting);
    return;
  }

  if (text.startsWith("/agents")) {
    const list = AGENTS_LIST.map((a) => `${a.icon} \`${a.mode}\` — ${a.name}`).join("\n");
    await send(chatId, `🌒 *Available agents:*\n\n${list}\n\nUse: \`/agent <mode>\` to switch.`);
    return;
  }

  if (text.startsWith("/agent ")) {
    const mode = text.split(" ")[1]?.trim();
    const found = AGENTS_LIST.find((a) => a.mode === mode);
    if (!found) {
      await send(chatId, `❌ Unknown agent: \`${mode}\`. Use /agents to see all.`);
      return;
    }
    const state = userState.get(chatId) || { agent: "auto", history: [] };
    state.agent = mode;
    state.history = []; // Clear history on agent switch
    userState.set(chatId, state);
    await send(chatId, `✓ Switched to ${found.icon} *${found.name}*`);
    return;
  }

  if (text.startsWith("/clear")) {
    const state = userState.get(chatId) || { agent: "auto", history: [] };
    state.history = [];
    userState.set(chatId, state);
    await send(chatId, "🗑 Conversation cleared.");
    return;
  }

  if (text.startsWith("/help")) {
    await send(chatId, "🌒 /agents /agent <name> /clear /help — Or just type a message!");
    return;
  }

  if (text.startsWith("/")) {
    await send(chatId, "❓ Unknown command. Try /help");
    return;
  }

  // Regular message — run through agent
  const state = userState.get(chatId) || { agent: "auto", history: [] };
  state.history.push({ role: "user", content: text });

  await sendChatAction(chatId, "typing");

  try {
    const task = vesper.task({
      agent: state.agent === "auto" ? undefined : state.agent,
      prompt: text,
    });

    // Show tool calls as they happen
    let toolMsg = "";
    task.on("tool_call", ({ name }: any) => {
      toolMsg += `⚙ ${name}\n`;
    });

    const result = await task.run();

    if (result.success && result.output) {
      state.history.push({ role: "assistant", content: result.output });
      userState.set(chatId, state);

      const agentInfo = AGENTS_LIST.find((a) => a.mode === state.agent);
      const prefix = agentInfo ? `${agentInfo.icon} *${agentInfo.name}*\n\n` : "";
      const toolsUsed = result.toolCalls.length > 0
        ? `\n\n_Tools used: ${result.toolCalls.map((t) => t.name).join(", ")}_`
        : "";
      await send(chatId, prefix + result.output + toolsUsed);
    } else {
      await send(chatId, `❌ Error: ${result.error || "Unknown error"}`);
    }
  } catch (e: any) {
    await send(chatId, `❌ Error: ${e.message}`);
  }
}

// Long polling
let offset = 0;
async function poll() {
  try {
    const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=25`);
    const data = await r.json() as { ok: boolean; result?: Array<{ update_id: number; message?: any }> };
    if (data.ok && data.result) {
      for (const update of data.result) {
        offset = update.update_id + 1;
        if (update.message) {
          handleMessage(update.message).catch((e) => console.error("Handler error:", e));
        }
      }
    }
  } catch (e) {
    console.error("Poll error:", e);
    await new Promise((r) => setTimeout(r, 5000));
  }
  setImmediate(poll);
}

console.log("🌒 OpenVesper Telegram Bot starting...");
console.log(`   Provider: ${vesper.getDefaultLLM().provider}`);
console.log(`   Plugins: ${vesper.listPlugins().length}`);
console.log(`   Agents: ${vesper.listAgents().length}`);
console.log(`   Allowed users: ${ALLOWED_USERS.length === 0 ? "OPEN" : ALLOWED_USERS.join(", ")}`);
console.log("");

poll();
