// ============================================================
// 🌒 @openvesper/core — Smart Agent Router
// Auto-pick the best agent based on user query content
// ============================================================

export interface AgentRoutingRule {
  agent: string;
  keywords: string[];
  patterns?: RegExp[];
  weight?: number;
}

export interface RoutingResult {
  agent: string;
  confidence: number;
  matchedKeywords: string[];
  alternatives: Array<{ agent: string; score: number }>;
}

const DEFAULT_RULES: AgentRoutingRule[] = [
  {
    agent: "bagsfm",
    keywords: ["bags.fm", "bagsfm", "bags fm", "meteora", "creator fee"],
    weight: 1.5,
  },
  {
    agent: "pumpfun",
    keywords: ["pump.fun", "pumpfun", "pump fun", "bonding curve", "raydium migration", "graduation"],
    patterns: [/pump\.?fun/i, /king of the hill/i],
    weight: 1.5,
  },
  {
    agent: "solana",
    keywords: ["solana", "sol ", "jupiter", "raydium", "orca", "drift", "kamino", "helius", "lst", "jitosol", "msol", "marinade"],
    patterns: [/\bsol\b/i, /solana/i],
    weight: 1.2,
  },
  {
    agent: "soldev",
    keywords: ["anchor idl", "token-2022", "cnft", "compressed nft", "compute units", "priority fee", "solana program"],
    weight: 1.4,
  },
  {
    agent: "base",
    keywords: ["clanker", "virtuals", "aerodrome", "base network", "farcaster meme"],
    weight: 1.3,
  },
  {
    agent: "trading",
    keywords: ["funding rate", "leverage", "open interest"],
    patterns: [/perp[s]?/i, /funding rate/i, /open interest/i],
    weight: 1.3,
  },
  {
    agent: "quant",
    keywords: ["backtest", "strategy", "ema cross", "rsi", "macd", "bollinger", "moving average", "sharpe"],
    weight: 1.3,
  },
  {
    agent: "security",
    keywords: ["rug", "honeypot", "scam", "phishing", "audit", "security check", "approvals", "revoke", "safe"],
    patterns: [/rug pull/i, /is.*safe/i, /check.*token.*security/i],
    weight: 1.4,
  },
  {
    agent: "research",
    keywords: ["search", "find", "look up", "news", "what is", "explain", "research", "tell me about"],
    patterns: [/^what (is|are)/i, /^who is/i, /^search for/i, /^find /i],
    weight: 1.0,
  },
  {
    agent: "defi",
    keywords: ["tvl", "yield", "apy", "stablecoin", "uniswap", "aave", "compound", "lido", "defi"],
    patterns: [/yield farm/i, /tvl/i],
    weight: 1.2,
  },
  {
    agent: "crypto",
    keywords: ["price", "bitcoin", "ethereum", "btc", "eth", "fear and greed", "fear & greed", "market cap", "trending coins"],
    patterns: [/\$\w{2,5}\s+price/i, /price of/i],
    weight: 1.0,
  },
  {
    agent: "twitter",
    keywords: ["twitter", "tweet", "x.com", "sentiment", "social"],
    weight: 1.2,
  },
  {
    agent: "onchain",
    keywords: ["wallet", "address", "0x", "transaction", "tx hash", "etherscan", "basescan", "balance"],
    patterns: [/0x[a-fA-F0-9]{40}/, /\bwallet\b/i],
    weight: 1.3,
  },
  {
    agent: "whale",
    keywords: ["whale", "smart money", "large transaction", "exchange flow", "vitalik", "wintermute"],
    weight: 1.4,
  },
  {
    agent: "github",
    keywords: ["github", "repo", "repository", "pull request", "pr ", "issue", "commit"],
    patterns: [/github\.com/i],
    weight: 1.5,
  },
  {
    agent: "telegram",
    keywords: ["telegram", "send alert", "notify me", "send message to telegram"],
    weight: 1.2,
  },
  {
    agent: "macro",
    keywords: ["dxy", "treasury", "fed", "yields", "spy", "qqq", "stock market", "forex", "macro"],
    weight: 1.2,
  },
  {
    agent: "derivatives",
    keywords: ["liquidation", "long short ratio", "volatility ranking"],
    weight: 1.3,
  },
  {
    agent: "airdrop",
    keywords: ["airdrop", "claim", "eligibility", "free tokens"],
    weight: 1.3,
  },
  {
    agent: "nft",
    keywords: ["nft", "opensea", "floor price", "collection"],
    weight: 1.3,
  },
  {
    agent: "memescan",
    keywords: ["memecoin", "meme coin", "shitcoin", "low cap gem", "trending memes"],
    weight: 1.3,
  },
  {
    agent: "code",
    keywords: ["write code", "python script", "javascript code", "calculate", "compute", "run code"],
    patterns: [/```/, /def \w+\(/, /function \w+\(/],
    weight: 1.4,
  },
  {
    agent: "filesystem",
    keywords: ["read file", "write file", "list directory", "save to file", "edit file"],
    weight: 1.4,
  },
  {
    agent: "shell",
    keywords: ["run command", "execute shell", "bash"],
    weight: 1.4,
  },
  {
    agent: "browser",
    keywords: ["scrape", "screenshot", "automate browser", "fill form"],
    weight: 1.4,
  },
  {
    agent: "email",
    keywords: ["send email", "read inbox", "gmail"],
    weight: 1.4,
  },
  {
    agent: "database",
    keywords: ["sql query", "sqlite", "postgres", "mongodb", "database query"],
    weight: 1.4,
  },
  {
    agent: "imagegen",
    keywords: ["generate image", "create image", "dall-e", "stable diffusion", "draw"],
    weight: 1.4,
  },
  {
    agent: "voice",
    keywords: ["text to speech", "speak this", "transcribe audio", "voice over"],
    weight: 1.4,
  },
];

export class SmartRouter {
  private rules: AgentRoutingRule[];

  constructor(customRules?: AgentRoutingRule[]) {
    this.rules = customRules || DEFAULT_RULES;
  }

  addRule(rule: AgentRoutingRule): void {
    this.rules.push(rule);
  }

  /**
   * Route a user query to the best agent.
   */
  route(query: string): RoutingResult {
    const lower = query.toLowerCase();
    const scores: Map<string, { score: number; matched: string[] }> = new Map();

    for (const rule of this.rules) {
      let score = 0;
      const matched: string[] = [];
      const weight = rule.weight || 1.0;

      for (const kw of rule.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          score += 1 * weight;
          matched.push(kw);
        }
      }

      for (const pattern of rule.patterns || []) {
        if (pattern.test(query)) {
          score += 1.5 * weight;
          matched.push(pattern.source);
        }
      }

      if (score > 0) {
        const existing = scores.get(rule.agent) || { score: 0, matched: [] };
        scores.set(rule.agent, {
          score: existing.score + score,
          matched: [...existing.matched, ...matched],
        });
      }
    }

    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    if (sorted.length === 0) {
      return { agent: "auto", confidence: 0, matchedKeywords: [], alternatives: [] };
    }

    const [topAgent, topData] = sorted[0];
    const maxScore = topData.score;
    const confidence = Math.min(1, maxScore / 5);

    return {
      agent: topAgent,
      confidence,
      matchedKeywords: topData.matched,
      alternatives: sorted.slice(1, 4).map(([a, d]) => ({ agent: a, score: d.score })),
    };
  }

  /**
   * Get all available agents in routing rules.
   */
  listAgents(): string[] {
    return [...new Set(this.rules.map((r) => r.agent))];
  }
}
