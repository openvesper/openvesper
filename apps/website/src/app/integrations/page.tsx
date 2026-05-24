"use client";

import Link from "next/link";
import { useState } from "react";

interface Integration {
  name: string;
  desc: string;
  hasAgent?: boolean;
  href?: string;
}

interface Category {
  title: string;
  icon: string;
  blurb: string;
  items: Integration[];
}

const CATEGORIES: Category[] = [
  // ── Chat Providers ──
  {
    title: "Chat Providers",
    icon: "💬",
    blurb: "Message OpenVesper from any chat app — it responds right where you are.",
    items: [
      { name: "Telegram", desc: "Bot API + bidirectional messaging" },
      { name: "Slack", desc: "Workspace apps, channels, DMs, threads" },
      { name: "Discord", desc: "Servers, channels & DMs" },
      { name: "Email", desc: "Gmail + IMAP — search, send, label" },
      { name: "WebSocket", desc: "Browser-based UI via /ws" },
    ],
  },

  // ── AI Models ──
  {
    title: "AI Models",
    icon: "🧠",
    blurb: "Use any model — cloud or local. Your keys, your choice.",
    items: [
      { name: "Anthropic", desc: "Claude Opus 4.5, Sonnet, Haiku" },
      { name: "OpenAI", desc: "GPT-4, GPT-5, o1, o3" },
      { name: "Google Gemini", desc: "Gemini 2.5 Pro / Flash (free 15 RPM)" },
      { name: "xAI Grok", desc: "Grok 3 & 4" },
      { name: "Mistral", desc: "Mistral Large + Codestral" },
      { name: "DeepSeek", desc: "DeepSeek V3 + R1" },
      { name: "Groq", desc: "Free tier, ultra-fast inference" },
      { name: "OpenRouter", desc: "Unified gateway to 100+ models" },
      { name: "Together", desc: "Open-source models hosted" },
      { name: "Perplexity", desc: "Search-augmented AI" },
      { name: "Fireworks", desc: "Fast serverless inference" },
      { name: "Nebius", desc: "OpenAI-compatible (free tier)" },
      { name: "DeepInfra", desc: "Open-source models hosted" },
      { name: "Ollama", desc: "Local models, 100% offline, FREE" },
      { name: "LM Studio", desc: "Local GGUF models" },
    ],
  },

  // ── Crypto & DeFi ──
  {
    title: "Crypto & DeFi",
    icon: "💰",
    blurb: "The differentiator. Crypto-native plugins out of the box.",
    items: [
      { name: "Solana", desc: "RPC, accounts, transactions, Token-2022, cNFTs" },
      { name: "Solana Dev", desc: "Anchor IDL, compute units, program info", hasAgent: true },
      { name: "Bags.fm", desc: "Meme launches — tracking, signals, deployment", hasAgent: true },
      { name: "Pump.fun", desc: "Token scanner, holder analysis", hasAgent: true },
      { name: "BonkFun", desc: "Solana meme launchpad" },
      { name: "Kamino Lend", desc: "Solana lending protocol — read-only TVL & rates" },
      { name: "Drift Analytics", desc: "Drift perps stats — read-only OI, funding, liquidations" },
      { name: "Aerodrome", desc: "Base chain DEX + LP — read-only" },
      { name: "Jupiter", desc: "Solana DEX aggregator" },
      { name: "Base Meme", desc: "Base chain tokens — Aerodrome, BaseSwap" },
      { name: "Security (GoPlus)", desc: "Honeypot detection, rug check", hasAgent: true },
      { name: "RugCheck.xyz", desc: "Solana token safety scores" },
      { name: "DefiLlama", desc: "TVL, yield pools, protocol data" },
      { name: "Helius DAS", desc: "Solana RPC + asset queries" },
      { name: "Birdeye", desc: "Solana token analytics" },
      { name: "Whale Alert", desc: "Large transfer notifications" },
      { name: "Airdrop Radar", desc: "Active airdrops + eligibility" },
      { name: "Investment Research", desc: "Falsifiable theses, DD", hasAgent: true },
    ],
  },

  // ── Productivity ──
  {
    title: "Productivity",
    icon: "📋",
    blurb: "Notes, tasks, wikis, and code — works with your favorite tools.",
    items: [
      { name: "Notion", desc: "Workspace, databases, page editing" },
      { name: "GitHub", desc: "Repos, PRs, issues, commits, code search", hasAgent: true },
      { name: "Google Calendar", desc: "Events, scheduling, time-blocking" },
      { name: "Research", desc: "Web search, web fetch, RSS, papers" },
      { name: "News", desc: "HackerNews, Reddit, NewsAPI" },
    ],
  },

  // ── Music & Audio ──
  {
    title: "Music & Audio",
    icon: "🎵",
    blurb: "Control playback, search media.",
    items: [
      { name: "Spotify", desc: "Playback, playlists, search, recommendations" },
      { name: "YouTube", desc: "Search, video info, transcripts" },
    ],
  },

  // ── Smart Home ──
  {
    title: "Smart Home",
    icon: "🏠",
    blurb: "Lights, climate, sensors — via Home Assistant.",
    items: [
      { name: "Home Assistant", desc: "Lights, climate, sensors, services", hasAgent: true },
    ],
  },

  // ── Lifestyle ──
  {
    title: "Lifestyle",
    icon: "✨",
    blurb: "Real-life stuff your agent can actually help with.",
    items: [
      { name: "Weather", desc: "Open-Meteo (FREE) + hourly + historical" },
      { name: "Maps", desc: "OpenStreetMap (FREE) + Google Maps" },
      { name: "Translate", desc: "LibreTranslate (FREE) + DeepL + Google" },
      { name: "Banking", desc: "Stocks (FREE Yahoo), FX, loan/compound calc", hasAgent: true },
      { name: "Fitness", desc: "Strava + wger exercise DB + OpenFoodFacts", hasAgent: true },
      { name: "Gaming", desc: "Steam profile/library + Twitch streams", hasAgent: true },
      { name: "E-commerce", desc: "Shopify — products, orders, inventory", hasAgent: true },
      { name: "Package Tracking", desc: "USPS / UPS / FedEx / DHL auto-detect" },
      { name: "Books", desc: "Google Books + OpenLibrary (FREE)" },
      { name: "Movies & TV", desc: "TMDB — search, details, trending" },
      { name: "Cooking Coach", desc: "Recipes, techniques, dietary adaptations", hasAgent: true },
      { name: "Travel Planner", desc: "Day-by-day itineraries, weather-aware", hasAgent: true },
    ],
  },

  // ── Dev Tools ──
  {
    title: "Dev Tools",
    icon: "⚙️",
    blurb: "Browser control, code execution, databases, DNS.",
    items: [
      { name: "Filesystem", desc: "Read, write, search, list files locally" },
      { name: "Shell", desc: "Execute bash commands with sandboxing" },
      { name: "Code Execution", desc: "Python, JavaScript, TypeScript" },
      { name: "Browser", desc: "Playwright-driven automation + scraping" },
      { name: "Database", desc: "SQLite, Postgres, MongoDB", hasAgent: true },
      { name: "DNS", desc: "Google DoH (FREE), WHOIS, Cloudflare" },
    ],
  },

  // ── Tools & Automation ──
  {
    title: "Tools & Automation",
    icon: "🔧",
    blurb: "Scheduled tasks, webhooks, secrets management.",
    items: [
      { name: "Cron", desc: "Scheduled agent tasks — 5-field cron + shortcuts (@daily, @hourly)" },
      { name: "Webhooks", desc: "HMAC-verified external event triggers — GitHub, Stripe, etc." },
      { name: "Secrets Manager", desc: "macOS Keychain / libsecret / kwallet / 1Password CLI" },
      { name: "Skill Workshop", desc: "Agents propose new workspace skills mid-conversation" },
    ],
  },

  // ── Media & Creative ──
  {
    title: "Media & Creative",
    icon: "🎨",
    blurb: "Generate images, transcribe voice, synthesize speech.",
    items: [
      { name: "Image Generation", desc: "DALL-E, Stable Diffusion, Replicate" },
      { name: "Voice TTS / STT", desc: "OpenAI Whisper, ElevenLabs, OpenAI TTS" },
    ],
  },

  // ── Social ──
  {
    title: "Social",
    icon: "🐦",
    blurb: "Post, search, manage your social presence.",
    items: [
      { name: "Twitter / X", desc: "Tweet, reply, search, sentiment analysis" },
      { name: "Farcaster", desc: "Decentralized social via Neynar" },
      { name: "Email (Gmail)", desc: "Send & read emails, drafts, search" },
    ],
  },

  // ── Platforms ──
  {
    title: "Platforms",
    icon: "🖥",
    blurb: "Run the Gateway anywhere — local or in a container.",
    items: [
      { name: "Linux", desc: "Native support — CLI + systemd daemon" },
      { name: "macOS", desc: "Native support — CLI + launchd daemon" },
      { name: "Windows", desc: "PowerShell installer + WSL2 supported" },
      { name: "Docker", desc: "Multi-arch image (amd64 + arm64) on GHCR" },
    ],
  },
];

// Count all integrations
const TOTAL = CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => {
    if (cat.items.length === 0) return false;
    if (activeCategory && cat.title !== activeCategory) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-bg text-fg font-mono">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">🌒 OpenVesper</Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/integrations" className="text-accent">Integrations</Link>
            <Link href="/docs/start/getting-started" className="hover:text-accent transition">Docs</Link>
            <a href="https://github.com/openvesper/openvesper" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10">
        <h1 className="text-5xl font-bold tracking-tight mb-4">Integrations</h1>
        <p className="text-lg text-fg/70 mb-2">
          {TOTAL} integrations across {CATEGORIES.length} categories.
        </p>
        <p className="text-base text-fg/50 mb-8">
          Every integration listed here is built and shipping today.
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search integrations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-bg-elevated border border-border rounded text-sm focus:outline-none focus:border-accent transition"
        />

        {/* Category filter chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 text-xs border rounded transition ${
              activeCategory === null
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-fg/60 hover:text-fg hover:border-fg/40"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.title}
              onClick={() => setActiveCategory(cat.title)}
              className={`px-3 py-1 text-xs border rounded transition ${
                activeCategory === cat.title
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-fg/60 hover:text-fg hover:border-fg/40"
              }`}
            >
              {cat.icon} {cat.title} <span className="ml-1 text-fg/30">{cat.items.length}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        {filteredCategories.map((cat) => (
          <div key={cat.title} className="mb-16">
            <div className="mb-6">
              <h2 className="text-sm text-fg/50 uppercase tracking-wider">
                ⟩ {cat.icon} {cat.title}
              </h2>
              <p className="text-sm text-fg/40 mt-1">{cat.blurb}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
              {cat.items.map((item) => (
                <div
                  key={item.name}
                  className="bg-bg p-4 hover:bg-bg-elevated transition group relative"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold group-hover:text-accent transition">
                      {item.name}
                    </h3>
                    {item.hasAgent && (
                      <span className="px-1.5 py-0.5 text-[9px] border border-accent/40 text-accent rounded bg-accent/5 shrink-0">
                        AGENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-fg/60 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-16 text-fg/40">
            No integrations found matching &quot;{search}&quot;
          </div>
        )}
      </section>

      {/* Footer info */}
      <section className="max-w-5xl mx-auto px-6 pb-20 border-t border-border pt-12">
        <h2 className="text-base font-semibold mb-3">Want to build your own?</h2>
        <p className="text-sm text-fg/60 mb-3">
          Plugins live in <code className="text-accent">packages/plugins/&lt;name&gt;</code>. Use{" "}
          <code className="text-accent">@openvesper/plugin-sdk</code> with{" "}
          <code className="text-accent">definePlugin()</code> and{" "}
          <code className="text-accent">defineTool()</code>.
        </p>
        <div className="flex gap-4 text-sm">
          <Link href="/docs/concepts/plugins" className="text-accent hover:underline">
            Plugin authoring guide →
          </Link>
          <a
            href="https://github.com/openvesper/openvesper/tree/main/packages/plugins"
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View source on GitHub →
          </a>
        </div>
      </section>
    </div>
  );
}
