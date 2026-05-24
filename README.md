<div align="center">

![Header](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=220&section=header&text=OpenVesper&fontSize=64&fontColor=00FFD4&animation=fadeIn&fontAlignY=40&desc=Local-first%20AI%20agent%20framework%20v1.16.0&descAlignY=62&descAlign=50&descSize=18)

[![Version](https://img.shields.io/badge/version-1.16.0-00FFD4?style=for-the-badge&labelColor=0a0a0a)](https://github.com/openvesper/openvesper/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0a0a0a)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white&labelColor=0a0a0a)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge&labelColor=0a0a0a)](LICENSE)
[![ZDR](https://img.shields.io/badge/Zero%20Data%20Retention-🔒-10B981?style=for-the-badge&labelColor=0a0a0a)](SECURITY.md)

[![Providers](https://img.shields.io/badge/🧠%20LLM%20Providers-15-00FFD4?style=flat-square&labelColor=0a0a0a)](#-llm-providers)
[![Agents](https://img.shields.io/badge/🤖%20Agents-26-F59E0B?style=flat-square&labelColor=0a0a0a)](#-agents)
[![Plugins](https://img.shields.io/badge/🔌%20Plugins-52-8B5CF6?style=flat-square&labelColor=0a0a0a)](#-plugins)
[![Integrations](https://img.shields.io/badge/🌐%20Integrations-78-10B981?style=flat-square&labelColor=0a0a0a)](https://openvesper.com/integrations)
[![Docs](https://img.shields.io/badge/📚%20Docs-82+%20pages-EC4899?style=flat-square&labelColor=0a0a0a)](https://openvesper.com/docs)

</div>

```
 ██████╗ ██████╗ ███████╗███╗   ██╗██╗   ██╗███████╗███████╗██████╗ ███████╗██████╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██║   ██║██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██║   ██║█████╗  ███████╗██████╔╝█████╗  ██████╔╝
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██╔══╝  ╚════██║██╔═══╝ ██╔══╝  ██╔══██╗
╚██████╔╝██║     ███████╗██║ ╚████║ ╚████╔╝ ███████╗███████║██║     ███████╗██║  ██║
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝  ╚═══╝  ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
                                                                          🌒 local-first
```

> **OpenVesper** is a local-first AI agent framework. You bring your own LLM (Anthropic, OpenAI, Groq, Gemini, DeepSeek, Ollama, etc.) and your own keys. The framework handles agent personas, tool execution, multi-source skills, persistent memory, scheduling, and chat-channel delivery — all on your machine.

<div align="center">

**[🌐 Website](https://openvesper.com) · [📦 Install](#-installation) · [🤖 Agents](#-agents) · [💡 Examples](#-examples) · [⚙️ Config](#%EF%B8%8F-configuration) · [📚 Docs](https://openvesper.com/docs)**

</div>

---

## 📖 Table of Contents

- [Why OpenVesper](#-why-openvesper)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [LLM Providers](#-llm-providers)
- [Agents](#-agents)
- [Plugins](#-plugins)
- [Skills System](#-skills-system)
- [Channels](#-channels)
- [Configuration](#%EF%B8%8F-configuration)
- [CLI Reference](#-cli-reference)
- [Examples](#-examples)
- [Privacy & Security](#-privacy--security)
- [Project Structure](#-project-structure)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌒 Why OpenVesper

Most AI agent frameworks are wrappers that send your data through their servers. **OpenVesper is the opposite.**

| Feature | Typical AI Framework | OpenVesper |
|---------|---------------------|------------|
| Where state lives | Their cloud | **Your disk (~/.openvesper/)** |
| Runtime | Library you import | **Persistent gateway daemon** |
| LLM choice | Locked to one vendor | **15 providers, swap any time** |
| Agent definition | Python/TS code | **Plain markdown personas** |
| Telemetry | Always-on | **None. Zero. Never.** |
| Channels | DIY | **Telegram, Slack, Discord, Email, WS built-in** |
| Cron scheduling | DIY | **Built-in heartbeats + webhooks** |
| Crypto-native tools | Add yourself | **22 crypto plugins out of the box** |

### What's in the box

- 🧠 **15 LLM providers** — Anthropic, OpenAI, Gemini, Groq, DeepSeek, Mistral, Together, OpenRouter, Fireworks, Nebius, DeepInfra, xAI, Perplexity, Ollama, LM Studio
- 🤖 **26 specialist agents** — all defined as plain markdown personas (bags-hunter, github-pm, code-reviewer, quant-analyst, etc.)
- 🔌 **52 plugins** — crypto, DeFi, Solana, GitHub, Telegram, Slack, weather, fitness, gaming, e-commerce, and more
- 🎯 **Multi-source skill system** — 6 precedence levels (workspace > project-agent > personal-agent > managed > bundled > extra) with gating + allowlists
- 💬 **5 channels** — CLI, Telegram, Slack, Discord, WebSocket — all bidirectional
- ⏰ **Cron + webhook scheduler** — agents run on a timer or respond to events
- 🔐 **OS keychain integration** — macOS Keychain, libsecret, kwallet, 1Password CLI
- 🛡 **Approval queue + audit log** — review every tool call before execution
- 📦 **One-line install** — `curl ... | sh` on macOS/Linux, `iwr ... | iex` on Windows

### What it is NOT

- ❌ **A hosted SaaS.** There is no openvesper.com account. There are no OpenVesper servers receiving your data.
- ❌ **A wallet.** The framework never asks for seed phrases or private keys.
- ❌ **A trading bot.** Crypto plugins are read-only — they query data, they don't sign transactions. You can write your own signing plugin if you need to, but it's not bundled.
- ❌ **Locked to one model.** Switch from Claude to GPT to a local Ollama model with one env var.

---

## 🏗 Architecture

```
                    ┌─────────────────────────────┐
                    │       You — the user        │
                    │  (CLI · Telegram · Slack)   │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   OpenVesper Gateway        │
                    │   127.0.0.1:18789 (loopback)│
                    │                             │
                    │  ┌───────────────────────┐  │
                    │  │  Agent Router         │  │
                    │  │  Tool Dispatcher      │  │
                    │  │  Session Lanes        │  │
                    │  │  Approval Queue       │  │
                    │  │  Cron Scheduler       │  │
                    │  │  Memory Manager       │  │
                    │  └──────────┬────────────┘  │
                    └─────────────┼───────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
       ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
       │   LLM API   │    │   Plugins   │    │ ~/.openvesper│
       │ (your key)  │    │ (52 built-in)│   │  (your state)│
       └─────────────┘    └─────────────┘    └─────────────┘
       Anthropic           bagsfm, github,    sessions
       OpenAI              telegram, weather,  audit logs
       Gemini              22 crypto plugins,  OAuth tokens
       Groq                productivity tools  cron jobs
       (+ 11 more)         + your own          .env
```

### The Persistent Gateway

The gateway is a long-running daemon bound to `127.0.0.1:18789`. It's the single source of truth for your agent state. Channels (CLI, Telegram, Slack) are clients that talk to the gateway — they're not stateful themselves.

```
User Query (any channel)
      │
      ▼
┌─────────────────────────────────────┐
│  Gateway receives request           │
│  → Resolves session (or creates)    │
│  → Routes to correct agent          │
│  → Loads eligible skills (gated)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  LLM call (with tools + skills)     │
│                                     │
│  Model decides which tools to run   │
└──────────────┬──────────────────────┘
               │  tool_use
               ▼
┌─────────────────────────────────────┐
│  Tool dispatcher executes           │
│  → Approval queue (if needed)       │
│  → Audit log entry                  │
│  → Permission check                 │
└──────────────┬──────────────────────┘
               │  results
               ▼
┌─────────────────────────────────────┐
│  Loop back to LLM until done        │
│  → Persist session                  │
│  → Emit response to channel         │
└─────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| One LLM API key | — | Anthropic, OpenAI, Groq, or any of the 15 providers |

### Method 1 — One-line installer (recommended)

**macOS / Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/openvesper/openvesper/main/scripts/install.sh | bash
```

**Windows (PowerShell):**

```powershell
iwr -useb https://raw.githubusercontent.com/openvesper/openvesper/main/scripts/install.ps1 | iex
```

The installer:
1. Detects / auto-installs Node.js (via `fnm` on Unix, winget/MSI on Windows)
2. Detects / auto-installs pnpm
3. Clones the repo to `~/.local/share/openvesper` (or `%LOCALAPPDATA%\openvesper` on Windows)
4. Builds all packages
5. Installs a `vesper` shim to your PATH
6. Runs `vesper onboard` for guided setup

### Method 2 — Manual install

```bash
git clone https://github.com/openvesper/openvesper
cd openvesper

pnpm install --ignore-scripts
pnpm -r build

# Guided setup
node apps/cli/dist/index.js onboard
```

### Method 3 — Docker

```bash
docker run -d \
  --name openvesper \
  -p 127.0.0.1:18789:18789 \
  -v "$HOME/.openvesper:/home/vesper/.openvesper" \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  ghcr.io/openvesper/openvesper:latest
```

Or with docker-compose:

```bash
git clone https://github.com/openvesper/openvesper
cd openvesper
cp .env.example .env  # add your keys
docker-compose up -d
```

Multi-arch images available (`linux/amd64` + `linux/arm64`).

---

## ⚡ Quick Start

After install, run the wizard:

```bash
vesper onboard
```

The wizard asks 5 questions:
1. **Workspace location** (default: `~/.openvesper`)
2. **LLM provider** (Anthropic / OpenAI / Groq / Gemini / ... 15 options)
3. **API key** (paste once, stored in `~/.openvesper/.env` with mode 0600)
4. **Default agent** (auto / bags-hunter / code-reviewer / ...)
5. **Test message** (sends a "hello" query to verify everything works)

Then ask your first question:

```bash
vesper -q "What's the price of BTC right now?"
```

Or open an interactive REPL:

```bash
vesper repl
```

Start the gateway as a daemon (for Telegram / Slack / cron):

```bash
vesper gateway start -d        # detached / background
vesper gateway install-daemon  # auto-start at boot (systemd / launchd)
```

Check health:

```bash
vesper doctor
```

---

## 🧠 LLM Providers

OpenVesper supports **15 providers**. Set one key, you're done. Set multiple, switch with `--provider` flag.

| Provider | Best Model | Free Tier | Notes |
|----------|-----------|-----------|-------|
| **Anthropic** | claude-opus-4-5 | No | Best tool use, recommended |
| **OpenAI** | gpt-4o, o1, o3 | No | Universal compatibility |
| **Google Gemini** | gemini-2.5-pro | ✅ 15 RPM | Free tier, fast |
| **Groq** | llama-3.3-70b | ✅ | Ultra-fast inference |
| **DeepSeek** | deepseek-v3 / r1 | No | Cheap, good reasoning |
| **xAI Grok** | grok-4 | No | Real-time web access |
| **Mistral** | mistral-large | No | EU-hosted |
| **OpenRouter** | 100+ models | Pay-as-you-go | Unified gateway |
| **Together** | Open-source models | No | Hosted Llama / Mixtral |
| **Perplexity** | sonar | No | Search-augmented |
| **Fireworks** | Llama / Mixtral | No | Fast serverless |
| **Nebius** | OpenAI-compatible | ✅ | Generous free tier |
| **DeepInfra** | Open-source | No | Affordable |
| **Ollama** | llama3.2, mistral, etc | ✅ Local | 100% offline |
| **LM Studio** | Any GGUF model | ✅ Local | Local GUI |

```bash
# Switch providers per-query
vesper -q "BTC price" --provider groq --model llama-3.3-70b-versatile

# Or set default in ~/.openvesper/.env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🤖 Agents

OpenVesper ships with **26 specialist agents**, each defined as a markdown persona in `.agents/<mode>/`. Use `vesper -a <mode>` to invoke one directly.

### Crypto / Web3 (8)

| Agent | Specialty |
|-------|-----------|
| 🎒 **bags-hunter** | Bags.fm Solana memecoin tracking + scoring |
| 🚀 **pumpfun-hunter** | Pump.fun bonding curve analysis + holder scans |
| 🐸 **base-hunter** | Base chain memecoin specialist (Aerodrome, BaseSwap) |
| 🎁 **airdrop-hunter** | Multi-chain airdrop tracking + eligibility |
| 🖼 **nft-analyst** | NFT collection floor, holders, rarity |
| 🏦 **defi-strategist** | DeFi yields, TVL, liquidity analysis |
| 📊 **quant-analyst** | TA, indicators, backtests |
| 📈 **investment-researcher** | Falsifiable theses, DD, market research |

### Development (5)

| Agent | Specialty |
|-------|-----------|
| 🔬 **code-reviewer** | PR review, code quality, bug detection |
| 🐙 **github-pm** | PR triage, issue management, repo health |
| 🛠 **solana-dev-coach** | Anchor, IDL, compute units, dApp helper |
| 🛡 **security-reviewer** | Code + token security audit |
| 🧪 **tdd-coach** | Test-driven development guidance |

### General (12)

| Agent | Specialty |
|-------|-----------|
| 🛸 **auto** | Universal — picks tools automatically |
| ✍ **content-writer** | Drafts posts, articles, marketing copy |
| 🐦 **social-strategist** | Twitter/X trend + posting strategy |
| 📋 **productivity-coach** | Calendar, tasks, email triage |
| 📐 **data-analyst** | SQL, CSV, charts, statistics |
| ⚖ **legal-assistant** | Reads contracts, summarizes legal docs |
| 🗣 **language-tutor** | Language learning conversation partner |
| 🌍 **travel-planner** | Day-by-day itineraries, weather-aware |
| 🍳 **cooking-coach** | Recipes, techniques, dietary adaptations |
| 🎮 **gaming-companion** | Steam profile, Twitch, game stats |
| 💪 **fitness-coach** | Strava + wger + OpenFoodFacts |
| 🏠 **smart-home-controller** | Home Assistant integration |

### Defining your own agent

Drop a markdown file at `.agents/<your-mode>/manifest.md`:

```yaml
---
mode: my-agent
icon: 🦅
name: My Custom Agent
description: Does my specific thing
tools: ["web_search", "github_repo", "*"]
---

You are a helpful assistant specialized in <your domain>.
Be concise and direct.
```

Run it: `vesper -a my-agent -q "your question"`.

---

## 🔌 Plugins

**52 built-in plugins** provide tools the agent can call. Each plugin can expose multiple tools.

<details>
<summary><b>🔍 Click to expand full plugin list</b></summary>

### Crypto & Web3 (22)
- `bagsfm` `pumpfun` `bonkfun` `base-meme` `solana` `solana-dev`
- `kamino` `drift` `aerodrome` `jupiter`
- `security-goplus` `rugcheck` `defi` `helius`
- `birdeye` `whale-alert` `airdrop` `farcaster`
- `derivatives` `memescan` `onchain` `crypto`

### Productivity (5)
- `notion` `github` `gcal` `research` `news`

### Channels (5)
- `telegram` `slack` `discord` `email` `farcaster`

### Lifestyle (8)
- `weather` `maps` `translate` `banking` `fitness`
- `gaming` `shopify` `package-tracking`

### Media (4)
- `spotify` `youtube` `image-gen` `voice`

### Dev Tools (6)
- `filesystem` `shell` `code-exec` `browser` `database` `dns`

### Automation (2)
- `cron` `webhooks`

### Meta (1)
- `skill-workshop` — agents propose new skills mid-conversation

</details>

### Authoring your own plugin

```bash
vesper plugin scaffold weather
# Creates ./weather/ with package.json, tsconfig.json, src/index.ts
```

```typescript
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";

export default definePlugin({
  name: "@your-org/plugin-weather",
  version: "0.1.0",
  tools: [
    defineTool({
      name: "weather_get",
      description: "Get current weather for a city",
      inputSchema: inputSchema(
        { city: { type: "string" } },
        ["city"]
      ),
      handler: async ({ city }) => {
        const data = await fetch(`https://api.open-meteo.com/...`);
        return { success: true, data };
      },
    }),
  ],
});
```

Then `pnpm install && pnpm run build`, and the agent picks it up automatically.

---

## 🎯 Skills System

Skills are markdown instruction snippets that agents load on demand. v1.16.0 introduces a **multi-source loader** with strict precedence:

```
1. <workspace>/skills/              ← highest priority (your project)
2. <workspace>/.agents/skills/      ← project-agent specific
3. ~/.agents/skills/                ← your personal skills
4. ~/.openvesper/skills/            ← managed (vesper skills install)
5. (bundled with install)
6. config.skills.load.extraDirs     ← lowest priority
```

Same name in multiple sources? The higher source wins. Mirrors [AgentSkills spec](https://github.com/anthropics/anthropic-cookbook).

### Skill gating

A skill can declare requirements that filter it out at load time:

```yaml
---
name: image-lab
description: Generate images with Gemini
metadata:
  openvesper:
    requires:
      env: ["GEMINI_API_KEY"]
      bins: ["uv"]
    os: ["darwin", "linux"]
---

When the user asks for an image, use the Gemini image API...
```

Without the env var? The skill is hidden — agent doesn't even see it. **No silent failures.**

### Installing skills

```bash
# From GitHub
vesper skills install git:owner/repo
vesper skills install git:owner/repo@v1.2.0

# From local directory
vesper skills install ./my-skill

# Globally (~/.openvesper/skills)
vesper skills install ./my-skill --global

# List with source + gating status
vesper skills list
vesper skills list --all      # include gated/filtered
vesper skills info gif-attribution
vesper skills sources         # show all 6 source dirs
```

### Per-agent skill allowlists

In `openvesper.json`:

```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" },                              // inherits defaults
      { id: "researcher", skills: ["docs-search"] }, // replaces (no merge)
      { id: "locked", skills: [] },                  // no skills at all
    ],
  },
}
```

---

## 💬 Channels

Talk to your agent from anywhere. All channels go through the same gateway.

| Channel | Setup | Direction |
|---------|-------|-----------|
| **CLI** | None | Both |
| **Telegram** | Bot token | Both (DMs + groups) |
| **Slack** | App + webhook | Both |
| **Discord** | Bot token | Both |
| **Email** | Gmail OAuth or IMAP | Both |
| **WebSocket** | None (built into gateway) | Both |

### DM Pairing

When an unknown user DMs your bot, the gateway issues a 6-character pairing code:

```
Unknown user → "hey"
Bot          → "Hi! I'm gated. Ask the operator to approve code: A3B7K2"
You (CLI)    → vesper pairing approve telegram A3B7K2
Bot          → "✓ Approved. You're in."
```

No more open bots that anyone can spam.

---

## ⚙️ Configuration

All config lives in `~/.openvesper/`:

```
~/.openvesper/
├── .env                  # API keys (mode 0600)
├── config.json           # General settings
├── openvesper.json       # Agent + skill allowlists
├── sessions/             # Per-session state
├── audit/                # Tool call audit log
├── tokens/               # OAuth tokens
├── pairings.json         # Channel pairing state
├── skills/               # Managed skills (vesper skills install)
└── skills-registry.json  # Skill install registry
```

### `.env` — API keys

```bash
# Required: at least one LLM provider
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...

# Optional: channels
TELEGRAM_BOT_TOKEN=
SLACK_BOT_TOKEN=
DISCORD_BOT_TOKEN=

# Optional: extra services
GITHUB_TOKEN=
HELIUS_API_KEY=
```

### `config.json` — Behaviour

```json
{
  "llm": {
    "provider": "anthropic",
    "model": "claude-opus-4-5",
    "temperature": 0.7,
    "maxIterations": 12
  },
  "memory": {
    "enabled": true,
    "maxItems": 100
  },
  "gateway": {
    "host": "127.0.0.1",
    "port": 18789
  }
}
```

### OS Keychain (opt-in)

Don't want plaintext .env? Use your OS keychain:

```bash
vesper secret backend         # detect: macOS Keychain / libsecret / kwallet / 1Password
vesper secret set ANTHROPIC_API_KEY
vesper secret list
vesper secret rm ANTHROPIC_API_KEY
```

---

## 📋 CLI Reference

### Core

| Command | Purpose |
|---------|---------|
| `vesper -q "<query>"` | One-shot question |
| `vesper repl` | Interactive prompt with slash commands |
| `vesper onboard` | 5-step setup wizard |
| `vesper doctor` | 13-check health diagnostic |
| `vesper monitor` | Live TUI dashboard |
| `vesper init <template>` | Quick-start (crypto-watcher / code-reviewer / blog-writer) |

### Agents & plugins

| Command | Purpose |
|---------|---------|
| `vesper -a <mode> -q "<q>"` | Run specific agent |
| `vesper --list-agents` | All 26 agents |
| `vesper --list-providers` | All 15 LLM providers |
| `vesper --list-tools` | Every tool from every plugin |
| `vesper plugin scaffold <name>` | Generate plugin skeleton |
| `vesper plugin list` | All 52 bundled plugins |

### Skills

| Command | Purpose |
|---------|---------|
| `vesper skills list [--all]` | Eligible skills with source |
| `vesper skills info <name>` | Details + gating status |
| `vesper skills sources` | All 6 source dirs |
| `vesper skills install <src>` | From git / local path |
| `vesper skills update <name>` | Re-fetch git-installed skill |
| `vesper skills uninstall <name>` | Remove |

### Gateway & daemon

| Command | Purpose |
|---------|---------|
| `vesper gateway start [-d]` | Start gateway (foreground or detached) |
| `vesper gateway stop` | Stop gateway |
| `vesper gateway status` | Health check |
| `vesper gateway install-daemon` | systemd / launchd / Windows scheduled task |
| `vesper gateway logs` | Tail audit log |

### Lifecycle

| Command | Purpose |
|---------|---------|
| `vesper update` | Pull latest + rebuild (git-installed only) |
| `vesper update --channel dev` | Switch to dev channel |
| `vesper uninstall [--purge]` | Remove install (`--purge` also wipes workspace) |
| `vesper migrate` | Apply workspace schema migrations |

### Pairing & secrets

| Command | Purpose |
|---------|---------|
| `vesper pairing list` | Pending channel pairings |
| `vesper pairing approve <channel> <code>` | Approve a pairing code |
| `vesper pairing deny <channel> <code>` | Reject |
| `vesper secret <backend\|set\|get\|rm>` | OS keychain integration |

### Cron & webhooks

| Command | Purpose |
|---------|---------|
| `vesper cron list` | All scheduled jobs |
| `vesper cron add <job>` | Add cron job |
| `vesper cron remove <id>` | Remove |

---

## 💡 Examples

### Example 1 — Crypto deep dive

```bash
vesper -a bags-hunter -q "Top 5 Solana memecoins by 24h volume, score each"
```

```
  ⚡ bagsfm_top_movers (limit=5, sortBy=volume)
  ✓ bagsfm_top_movers — 5 tokens returned

  ⚡ bagsfm_score_token (mint=...) × 5
  ✓ bagsfm_score_token — 5 scores computed

  ⚡ security_goplus_check × 5
  ✓ security_goplus_check — 5 rugcheck results

──────────────────────────────────────────────────
🌒 OpenVesper ›

## Top 5 Solana Memecoins (24h Volume)

| Rank | Token  | Volume | Score | Rug Risk |
|------|--------|--------|-------|----------|
| 1    | $WIF   | $42M   | 82/100| 🟢 Low   |
| 2    | $BONK  | $31M   | 76/100| 🟢 Low   |
| 3    | $PEPE  | $18M   | 71/100| 🟡 Med   |
| 4    | $POPCAT| $14M   | 68/100| 🟢 Low   |
| 5    | $MEW   | $11M   | 64/100| 🟡 Med   |

Top pick by score: $WIF — large holder distribution,
established team, liquidity locked.

⚠ Not financial advice. DYOR.
```

### Example 2 — GitHub PR review

```bash
vesper -a code-reviewer -q "Review PR #42 on openvesper/openvesper"
```

```
  ⚡ github_pr_details (repo=openvesper/openvesper, pr=42)
  ⚡ github_pr_diff (repo=openvesper/openvesper, pr=42)
  ⚡ github_repo_conventions (repo=openvesper/openvesper)

──────────────────────────────────────────────────
🌒 OpenVesper ›

## PR #42 — "Add Vercel deployment config"

**Summary:** Adds `vercel.json` and updates docker-compose
to use GHCR image.

### ✓ Looks good
- Workspace install command correctly uses --ignore-scripts
- Output directory matches Next.js convention

### ⚠ Concerns
- `vercel.json` should use `installCommand` not `buildCommand`
  for `pnpm install`
- Missing `framework: "nextjs"` field

### Suggested changes
```diff
- "buildCommand": "pnpm install && pnpm -r build && ..."
+ "installCommand": "pnpm install --frozen-lockfile",
+ "buildCommand": "pnpm -r build && cd apps/website && pnpm build",
+ "framework": "nextjs"
```

### Tests
No tests added. Consider a smoke test that pulls /health
after deploy.

Verdict: 🟡 Request changes (small)
```

### Example 3 — Cron-based daily summary

```yaml
# ~/.openvesper/cron.yaml
jobs:
  - name: daily-sol-summary
    schedule: "0 9 * * *"   # 09:00 every day
    agent: defi-strategist
    prompt: |
      Daily Solana ecosystem summary:
      - SOL price action vs ETH/BTC
      - Top 3 protocols by 24h TVL change
      - Notable token launches in last 24h
      Send to Telegram chat 123456789. Keep it short.
    channels:
      - telegram:123456789
```

```bash
vesper cron add ./daily-sol-summary.yaml
vesper gateway install-daemon
```

Now every day at 09:00 you get a Telegram message with the summary. No babysitting needed.

---

## 🔐 Privacy & Security

OpenVesper is built on three commitments — all enforced in code, not just documented.

### 1. Zero Data Retention

- **No telemetry.** Grep the source: `grep -rn "telemetry\|analytics" packages/` returns zero.
- **No phone-home.** The gateway makes outbound calls only to:
  - The LLM provider you configured (your key, your call)
  - APIs explicitly invoked by tools you triggered
- **No third-party tracking.** No Google Analytics, no Sentry, no PostHog.

### 2. Loopback by default

- Gateway binds to `127.0.0.1:18789` only
- Inbound external access requires explicit `OPENVESPER_GATEWAY_HOST=0.0.0.0`
- Channels (Telegram etc.) connect *outbound* to provider APIs — never inbound

### 3. No wallet keys

- The framework never asks for seed phrases or private keys
- Crypto plugins are **read-only** — they query data, they don't sign transactions
- If you write a signing plugin, you handle the keys (we recommend OS keychain via `vesper secret`)

### File permissions

- All workspace files: mode 0600 (owner read/write only)
- All workspace dirs: mode 0700
- Verified by `vesper doctor` health check

### Audit log

Every tool call is logged to `~/.openvesper/audit/<date>.jsonl`:

```json
{"ts":"2026-05-24T11:23:45Z","session":"abc","agent":"bags-hunter","tool":"bagsfm_score_token","input":{"mint":"..."},"approved":true,"result":"success"}
```

Browse with `vesper gateway logs` or just `tail ~/.openvesper/audit/*.jsonl`.

See [`SECURITY.md`](SECURITY.md) for the full security model.

---

## 🗂 Project Structure

```
openvesper/
│
├── apps/
│   ├── cli/                       ← `vesper` CLI binary
│   ├── gateway/                   ← Persistent daemon (127.0.0.1:18789)
│   ├── telegram-bot/              ← Telegram channel adapter
│   ├── website/                   ← Next.js docs site (openvesper.com)
│   └── vscode-extension/          ← VSCode integration
│
├── packages/
│   ├── core/                      ← Runtime, types, providers, skill loader
│   ├── plugin-sdk/                ← definePlugin / defineTool helpers
│   └── plugins/                   ← 52 bundled plugins
│       ├── bagsfm/                ← Bags.fm memecoin tracking
│       ├── pumpfun/               ← Pump.fun analysis
│       ├── github/                ← GitHub API integration
│       ├── telegram/              ← Telegram channel tools
│       ├── skill-workshop/        ← Propose/approve new skills
│       └── ... (47 more)
│
├── .agents/                       ← 26 markdown agent personas
│   ├── bags-hunter/manifest.md
│   ├── code-reviewer/manifest.md
│   └── ... (24 more)
│
├── scripts/
│   ├── install.sh                 ← One-line Unix installer
│   ├── install.ps1                ← Windows PowerShell installer
│   └── publish-packages.sh        ← npm publish helper
│
├── test/
│   └── integration.test.ts        ← 18 vitest tests
│
├── .github/
│   └── workflows/
│       ├── build.yml              ← CI: build + test on every push
│       └── docker.yml             ← Multi-arch GHCR publish
│
├── Dockerfile                     ← Multi-stage production image
├── docker-compose.yml             ← Quick docker run
├── package.json                   ← Monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
├── CHANGELOG.md
├── ROADMAP.md
├── VISION.md
├── SECURITY.md
└── README.md                      ← You are here
```

---

## ❓ FAQ

**Q: Do I need all 15 LLM provider keys?**
No, just one. Anthropic and OpenAI work best for tool-heavy agents. If you want free, use Groq or Gemini.

**Q: What does it cost?**
The framework is free (MIT). LLM costs vary:
- Claude Sonnet: ~$0.003 / 1K in + $0.015 / 1K out (~$0.01–0.05 per query)
- Groq / Gemini free tier: $0 with rate limits
- Local Ollama: $0, runs on your hardware

**Q: Can I use it for trading?**
The framework is for analysis. Crypto plugins are **read-only** — they don't sign transactions. You can write your own signing plugin, but key handling is your responsibility.

**Q: Does it work offline?**
Yes — use Ollama or LM Studio as the provider. Some plugins need internet (`web_search`, etc.), but the agent loop itself runs locally.

**Q: How is this different from LangChain?**
LangChain is a library you import into your code. OpenVesper is a **persistent daemon** with channels, scheduling, and approval queues built in. See [`/docs/comparison`](https://openvesper.com/docs/comparison) for a detailed table.

**Q: Will my data go anywhere?**
- Your prompts go to **your chosen LLM provider** (Anthropic, OpenAI, etc.)
- Tool calls go to **the APIs they query** (Binance, GitHub, etc.)
- Nothing goes to OpenVesper servers (there are none)
- Memory is stored locally in `~/.openvesper/`

**Q: Can I run multiple agents at once?**
Yes. The gateway routes per-session, so one user can have multiple parallel agent conversations. Telegram + CLI + Slack can all be active simultaneously.

**Q: Windows support?**
Yes. PowerShell installer, native `vesper.cmd` shim, daemon via Task Scheduler. WSL2 also works.

**Q: How do I add a new LLM provider that isn't in the 15?**
Implement the `LLMProvider` interface in `packages/core/src/providers/`. ~100 lines of code. PR welcome.

**Q: Is the workspace encrypted?**
Files are mode 0600 (POSIX). For at-rest encryption, use OS keychain (`vesper secret`) for API keys or full-disk encryption (FileVault / LUKS / BitLocker).

---

## 🤝 Contributing

PRs welcome. Active areas:

- [ ] More LLM providers (Cohere, AI21, Replicate)
- [ ] More chat channels (Matrix, Signal, IRC)
- [ ] More crypto plugins (Hyperliquid stats, Jito, Eigenlayer)
- [ ] More skills (community-contributed)
- [ ] Better TUI dashboard (more panels)
- [ ] i18n for CLI messages

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup and conventions.

```bash
git clone https://github.com/openvesper/openvesper
cd openvesper
pnpm install --ignore-scripts
pnpm -r build
pnpm test             # 18 vitest tests
```

---

## 📄 License

MIT — see [`LICENSE`](LICENSE).

OpenVesper is an independent open-source project. Not affiliated with any chain, exchange, or LLM provider.

---

<div align="center">

**[🌐 openvesper.com](https://openvesper.com) · [📚 Docs](https://openvesper.com/docs) · [🐙 GitHub](https://github.com/openvesper/openvesper) · [📝 Changelog](CHANGELOG.md)**

[![Stars](https://img.shields.io/github/stars/openvesper/openvesper?style=for-the-badge&logo=github&labelColor=0a0a0a&color=00FFD4)](https://github.com/openvesper/openvesper/stargazers)
[![Issues](https://img.shields.io/github/issues/openvesper/openvesper?style=for-the-badge&logo=github&labelColor=0a0a0a&color=F59E0B)](https://github.com/openvesper/openvesper/issues)
[![Release](https://img.shields.io/github/v/release/openvesper/openvesper?style=for-the-badge&logo=github&labelColor=0a0a0a&color=8B5CF6)](https://github.com/openvesper/openvesper/releases)

*Local-first. Bring your own keys. Zero data retention.* 🌒

![Footer](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer)

</div>
