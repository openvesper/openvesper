"use client";

import Link from "next/link";
import { useState } from "react";

const INTEGRATIONS = [
  "Solana", "Bags.fm", "Pump.fun", "BonkFun", "Base", "Ethereum",
  "Telegram", "Slack", "Discord", "Gmail", "Notion", "Calendar",
  "Twitter", "Farcaster", "GitHub", "Linear",
  "Spotify", "YouTube", "Strava", "Home Assistant", "Shopify", "TMDB",
  "OpenAI", "Anthropic", "Groq", "Gemini", "Ollama", "DeepSeek",
];

const USE_CASES = [
  {
    title: "Morning Brief",
    desc: "Wake up to a 5-bullet summary delivered to Telegram. Crypto moves overnight, your calendar today, weather, macro releases.",
    example: "Daily 8 AM digest, sent to your phone before you grab your coffee.",
  },
  {
    title: "Whale Alert Pipeline",
    desc: "Monitor wallets you care about. Get pinged when a known whale moves > $1M, with the on-chain context already attached.",
    example: "Telegram message: \"Wallet 7xK...y3 moved 12,000 SOL to Coinbase.\"",
  },
  {
    title: "Solana Meme Scanner",
    desc: "Trending coins on Pump.fun, BonkFun, Bags.fm scored by liquidity, volume, holder distribution, and buy pressure.",
    example: "Score > 80? Pinged. Below? Ignored. No noise.",
  },
  {
    title: "Code Reviewer in Slack",
    desc: "GitHub webhook → agent reviews the PR → posts findings to your engineering Slack channel.",
    example: "\"PR #142 looks good except line 87 — possible SQL injection in raw query.\"",
  },
  {
    title: "Weekly Retro",
    desc: "Every Friday at 5 PM, agent pulls your week's GitHub commits, calendar events, and tasks into a retro draft.",
    example: "Saves 30 minutes of Friday afternoon scrolling.",
  },
  {
    title: "Local AI, Your Data",
    desc: "Run everything on your machine. Use Ollama for fully offline, Anthropic for top quality, Groq for speed. Your choice.",
    example: "No accounts, no sign-ups, no data shipped to anyone.",
  },
];

const FEATURES = [
  {
    title: "Open Source",
    desc: "MIT licensed. Audit the code yourself — every line is on GitHub. No black boxes, no surprises.",
    href: "https://github.com/openvesper/openvesper",
    external: true,
  },
  {
    title: "Self-Hosted",
    desc: "Runs on your laptop, your server, your Raspberry Pi. We have no servers to depend on.",
    href: "/docs/start/getting-started",
  },
  {
    title: "Zero Data Retention",
    desc: "No telemetry, no analytics, no phone-home. Your prompts never leave your machine except to your chosen LLM.",
    href: "/docs/gateway/security",
  },
  {
    title: "Bring Your Own Keys",
    desc: "Use any LLM provider. Anthropic, OpenAI, Groq, Gemini, DeepSeek, Ollama. Mix and match per agent.",
    href: "/docs/start/getting-started",
  },
  {
    title: "No Wallet Keys",
    desc: "OpenVesper never asks for your seed phrase or private key. Read-only crypto data, never signing.",
    href: "/docs/gateway/security",
  },
  {
    title: "Chat App Native",
    desc: "Talk to your agents from Telegram, Slack, Discord. Bidirectional — they message you back when something happens.",
    href: "/integrations",
  },
];

const QUICK_START_CODE = `# Requires Node.js 20+ and pnpm 9+
git clone https://github.com/openvesper/openvesper
cd openvesper

pnpm install
pnpm -r build`;

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(QUICK_START_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg text-fg font-mono">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            🌒 OpenVesper
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/integrations" className="hover:text-accent transition">Integrations</Link>
            <Link href="/docs/start/getting-started" className="hover:text-accent transition">Docs</Link>
            <a
              href="https://github.com/openvesper/openvesper"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-8">
        <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6">
          🌒 OpenVesper
        </h1>
        <p className="text-2xl text-fg/80 mb-3">
          A local-first agent framework.
        </p>
        <p className="text-base text-fg/60 leading-relaxed max-w-2xl">
          Bring your own LLM. Bring your own API keys. The framework provides
          agent personas, tool execution, scheduled heartbeats, and channel
          delivery to Telegram, Slack, Discord, CLI, and your browser — all
          running on your machine.
        </p>

        <div className="mt-8 flex gap-3 flex-wrap">
          <Link
            href="/docs/start/getting-started"
            className="inline-flex items-center gap-2 px-5 py-2 border border-accent/40 bg-accent/10 text-accent text-sm rounded hover:bg-accent/20 transition"
          >
            Get started →
          </Link>
          <a
            href="https://github.com/openvesper/openvesper"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 border border-border text-fg/80 text-sm rounded hover:border-accent/60 hover:text-accent transition"
          >
            ⭐ Star on GitHub
          </a>
        </div>

        <div className="mt-6 text-xs text-fg/40">
          MIT licensed · No accounts · No telemetry · Your data never leaves your machine
        </div>
      </section>

      {/* ── What You Can Do With It ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-sm text-fg/50 uppercase tracking-wider mb-2">⟩ What You Can Do With It</h2>
        <p className="text-base text-fg/60 mb-8 max-w-2xl">
          OpenVesper isn't a chatbot. It's a framework for building agents that
          actually do work for you, on your schedule, in your tools.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="bg-bg p-6">
              <h3 className="text-lg font-semibold mb-2 text-accent">{uc.title}</h3>
              <p className="text-sm text-fg/70 leading-relaxed mb-3">{uc.desc}</p>
              <p className="text-xs text-fg/40 italic">{uc.example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why OpenVesper ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-sm text-fg/50 uppercase tracking-wider mb-2">⟩ Why OpenVesper</h2>
        <p className="text-base text-fg/60 mb-8 max-w-2xl">
          Six things that set this apart from chatbot SaaS products.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
          {FEATURES.map((feat) =>
            feat.external ? (
              <a
                key={feat.title}
                href={feat.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-bg p-6 hover:bg-bg-elevated transition group"
              >
                <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition">
                  {feat.title}
                </h3>
                <p className="text-sm text-fg/60 leading-relaxed">{feat.desc}</p>
              </a>
            ) : (
              <Link
                key={feat.title}
                href={feat.href}
                className="bg-bg p-6 hover:bg-bg-elevated transition group"
              >
                <h3 className="text-lg font-semibold mb-2 group-hover:text-accent transition">
                  {feat.title}
                </h3>
                <p className="text-sm text-fg/60 leading-relaxed">{feat.desc}</p>
              </Link>
            )
          )}
        </div>
      </section>

      {/* ── Quick Start ─────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-sm text-fg/50 uppercase tracking-wider mb-2">⟩ Get Started</h2>
        <p className="text-base text-fg/60 mb-6 max-w-2xl">
          Clone, install, build. Then head to the docs for agent-specific setup.
        </p>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex border-b border-border bg-bg-elevated items-center">
            <div className="px-4 py-2 text-sm text-accent">Install</div>
            <div className="ml-auto pr-2 py-1 flex items-center">
              <button
                onClick={copyCode}
                className="px-3 py-1 text-xs text-fg/50 hover:text-accent transition"
              >
                {copied ? "✓ copied" : "copy"}
              </button>
            </div>
          </div>
          <pre className="p-4 text-sm overflow-x-auto bg-bg/50">
            <code className="text-fg/90">{QUICK_START_CODE}</code>
          </pre>
        </div>

        <p className="text-sm text-fg/60 mt-4">
          That installs the framework. Now pick which agent you want to run —
          each one has its own setup guide.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/docs/agents/auto" className="text-xs px-3 py-1 border border-border rounded hover:border-accent/60 hover:text-accent transition">
            🤖 auto
          </Link>
          <Link href="/docs/agents/bags-hunter" className="text-xs px-3 py-1 border border-border rounded hover:border-accent/60 hover:text-accent transition">
            🎒 bags-hunter
          </Link>
          <Link href="/docs/agents/defi-strategist" className="text-xs px-3 py-1 border border-border rounded hover:border-accent/60 hover:text-accent transition">
            🏦 defi-strategist
          </Link>
          <Link href="/docs/agents/security-reviewer" className="text-xs px-3 py-1 border border-border rounded hover:border-accent/60 hover:text-accent transition">
            🛡 security-reviewer
          </Link>
          <Link href="/docs/agents/productivity-coach" className="text-xs px-3 py-1 border border-border rounded hover:border-accent/60 hover:text-accent transition">
            ⚡ productivity-coach
          </Link>
          <Link href="/docs/agents" className="text-xs px-3 py-1 text-accent hover:underline">
            View all 17 agents →
          </Link>
        </div>
      </section>

      {/* ── Works With Everything ───────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-sm text-fg/50 uppercase tracking-wider mb-2">⟩ Works With Everything</h2>
        <p className="text-base text-fg/60 mb-8 max-w-2xl">
          47 plugins, 114+ integrations. Bring the LLM of your choice and connect
          to the services you already use.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {INTEGRATIONS.map((name) => (
            <span
              key={name}
              className="px-3 py-1 text-xs border border-border rounded bg-bg-elevated text-fg/70"
            >
              {name}
            </span>
          ))}
        </div>
        <Link
          href="/integrations"
          className="text-sm text-accent hover:underline"
        >
          View all 114+ integrations →
        </Link>
      </section>

      {/* ── Built For ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-border">
        <h2 className="text-sm text-fg/50 uppercase tracking-wider mb-8">⟩ Built For</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-fg/40 text-xs mb-1">SOLANA DEVS</div>
            <p className="text-fg/80">
              First-class Anchor + Token-2022 + cNFT support. Helius RPC built in.
              Parse program accounts, decode IDLs, watch transactions in real time.
            </p>
          </div>
          <div>
            <div className="text-fg/40 text-xs mb-1">DEFI RESEARCHERS</div>
            <p className="text-fg/80">
              Read-only DeFi analytics across all major chains. DefiLlama TVL,
              yield rotation, whale flow analysis, position monitoring.
            </p>
          </div>
          <div>
            <div className="text-fg/40 text-xs mb-1">DEGENS</div>
            <p className="text-fg/80">
              Pump.fun + BonkFun + Bags.fm scanning with multi-source scoring.
              Generate Pine Script strategies for TradingView.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA Bar ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-bg-elevated">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <a
              href="https://github.com/openvesper/openvesper"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition"
            >
              <div className="text-fg/40 text-xs mb-1">GITHUB</div>
              <div>Read the source →</div>
            </a>
            <Link href="/docs/start/getting-started" className="hover:text-accent transition">
              <div className="text-fg/40 text-xs mb-1">DOCS</div>
              <div>Learn the system →</div>
            </Link>
            <Link href="/integrations" className="hover:text-accent transition">
              <div className="text-fg/40 text-xs mb-1">INTEGRATIONS</div>
              <div>47+ plugins, 114+ integrations →</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-6 py-8 text-xs text-fg/40">
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div>
            🌒 OpenVesper. MIT licensed.
          </div>
          <div className="flex gap-4">
            <Link href="/docs/start/getting-started">Docs</Link>
            <Link href="/integrations">Integrations</Link>
            <a
              href="https://github.com/openvesper/openvesper"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
        <div className="mt-2 text-fg/30">
          Independent open-source project. Not affiliated with any chain or exchange.
        </div>
      </footer>
    </div>
  );
}
