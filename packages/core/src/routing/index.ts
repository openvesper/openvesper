// ============================================================
// 🌒 @openvesper/core — Smart Agent Router
// Automatically picks the right agent for a user query
// ============================================================

import { LLMRequest, LLMResponse, ProviderName, AgentDefinition } from "../types";
import { getProvider } from "../providers";

export interface RoutingResult {
  agent: string;
  confidence: number;
  reasoning?: string;
  fallback?: string;
}

/**
 * Simple keyword-based routing (fast, no LLM call needed).
 * Use for hot path. LLM routing for ambiguous cases.
 */
const KEYWORD_RULES: Record<string, RegExp[]> = {
  bagsfm: [/bags\.?fm/i, /bags token/i, /creator fee.*memecoin/i],
  pumpfun: [/pump\.?fun/i, /bonding curve/i, /raydium graduation/i],
  solana: [/\bsolana\b/i, /\bsol\b.*\b(price|token|wallet)/i, /jupiter/i, /raydium/i, /orca/i, /helius/i, /msol|jitosol/i],
  soldev: [/anchor idl/i, /token.?2022/i, /\bcnft\b/i, /compute unit/i, /priority fee/i],
  base: [/clanker/i, /virtuals\.io/i, /aerodrome/i, /\bbase chain\b/i],
  crypto: [/\b(btc|bitcoin|eth|ethereum)\b.*(price|chart|analysis)/i, /fear and greed/i, /crypto market/i],
  quant: [/backtest/i, /strategy/i, /ema cross/i, /\brsi\b/i, /\bmacd\b/i, /bollinger/i],
  security: [/rug.?check/i, /honeypot/i, /token security/i, /phishing/i, /goplus/i],
  research: [/search the web/i, /find article/i, /latest news/i, /rss/i],
  defi: [/\btvl\b/i, /defi.?llama/i, /\byield farm/i, /stablecoin/i, /apy/i],
  twitter: [/twitter.*sentiment/i, /\bx\.com\b/i, /tweet/i],
  onchain: [/wallet (balance|tx|transaction)/i, /onchain/i, /etherscan/i],
  whale: [/\bwhale\b/i, /smart money/i, /large transfer/i, /exchange flow/i],
  github: [/github (repo|issue|pr|profile)/i, /pull request/i, /merge/i],
  telegram: [/send.*telegram/i, /telegram bot/i, /tg alert/i],
  macro: [/dxy/i, /treasury yield/i, /s&p.?500/i, /nasdaq/i, /\bforex\b/i],
  derivatives: [/open interest/i, /liquidat/i, /volatility/i],
  airdrop: [/airdrop/i, /eligib/i],
  memescan: [/meme (token|coin|scanner)/i, /trending meme/i],
  nft: [/\bnft\b.*(floor|trending|collection)/i, /opensea/i],
  imagegen: [/generate.*image/i, /\bdall.?e\b/i, /stable diffusion/i, /flux/i, /create.*picture/i],
  voice: [/\btts\b/i, /text to speech/i, /\bstt\b/i, /transcrib/i, /whisper/i],
  filesystem: [/(read|write|create|delete|list).*(file|directory)/i],
  shell: [/(run|execute).*(command|bash|shell)/i, /\bcd\s|\bls\s/i],
  code: [/(write|run|execute).*(python|javascript|typescript).*code/i, /code interpret/i],
  browser: [/(scrape|crawl).*(web|page)/i, /playwright/i, /screenshot.*url/i],
  email: [/send (an? )?email/i, /gmail (api|message)/i, /imap/i],
  database: [/(sql|sqlite|postgres|mongo).*query/i, /\bselect.*from\b/i],
};

/**
 * Keyword-based routing (sync, fast).
 */
export function routeKeyword(query: string, availableAgents: string[]): RoutingResult | null {
  const matches: Array<{ agent: string; score: number }> = [];

  for (const [agent, patterns] of Object.entries(KEYWORD_RULES)) {
    if (!availableAgents.includes(agent)) continue;
    let score = 0;
    for (const p of patterns) {
      if (p.test(query)) score++;
    }
    if (score > 0) matches.push({ agent, score });
  }

  if (matches.length === 0) return null;
  matches.sort((a, b) => b.score - a.score);
  return {
    agent: matches[0].agent,
    confidence: Math.min(1, matches[0].score / 3),
    reasoning: `Keyword match: ${matches[0].score} patterns hit`,
    fallback: matches[1]?.agent,
  };
}

/**
 * LLM-based routing (uses a small model to classify).
 */
export async function routeLLM(
  query: string,
  availableAgents: AgentDefinition[],
  llm: { provider: ProviderName; model?: string }
): Promise<RoutingResult> {
  const agentList = availableAgents
    .map((a) => `- ${a.mode}: ${a.name || a.mode} (${a.description || ""})`)
    .join("\n");

  const prompt = `Pick the SINGLE best agent for this user query.
Respond ONLY with the agent mode name (e.g. "bagsfm", "crypto", "auto").
If unsure, respond "auto".

Available agents:
${agentList}

User query: ${query}

Best agent:`;

  try {
    const provider = getProvider(llm.provider);
    const response = await provider.call({
      model: llm.model || provider.defaultModel,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 32,
      temperature: 0,
    });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim().toLowerCase();
    const cleanAgent = text.replace(/[^a-z\-]/g, "");
    const isValid = availableAgents.some((a) => a.mode === cleanAgent);
    return {
      agent: isValid ? cleanAgent : "auto",
      confidence: isValid ? 0.85 : 0.3,
      reasoning: `LLM classification: ${cleanAgent}`,
    };
  } catch {
    return { agent: "auto", confidence: 0, reasoning: "LLM routing failed, defaulting to auto" };
  }
}

/**
 * Hybrid routing — keyword first (fast), LLM if no clear match.
 */
export async function smartRoute(
  query: string,
  availableAgents: AgentDefinition[],
  llm: { provider: ProviderName; model?: string }
): Promise<RoutingResult> {
  const modes = availableAgents.map((a) => a.mode);

  // Try keyword first
  const kw = routeKeyword(query, modes);
  if (kw && kw.confidence >= 0.5) return kw;

  // Fall back to LLM
  return routeLLM(query, availableAgents, llm);
}
