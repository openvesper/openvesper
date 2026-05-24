<div align="center">

# 🌒 OpenVesper

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E=20-blue.svg)](#)
[![pnpm](https://img.shields.io/badge/pnpm-%3E=9-orange.svg)](#)

[Website](https://openvesper.com) · [Docs](https://openvesper.com/docs/start/getting-started) · [Integrations](https://openvesper.com/integrations)

</div>

---

## What is OpenVesper?

OpenVesper is a framework for building AI agents that run on your own machine.
You bring your own LLM (Anthropic, OpenAI, Groq, Gemini, DeepSeek, Ollama, etc.)
and your own API keys. The framework handles agent personas, tool execution,
memory, scheduling, and chat-channel delivery.

**It is not** a hosted SaaS. There is no account to create. There is no server
of ours that sees your data. Everything runs locally.

### What's in the box

- **16 specialist agents** + a general-purpose `auto` agent — each defined as plain markdown
- **47 plugins** — crypto, DeFi, Solana, GitHub, Telegram, Slack, weather, fitness, etc.
- **36 skills** — modular instruction snippets, each bound to a specific agent
- **12 LLM providers** — bring your own API key
- **Cron + webhook scheduler** — agents that run on a timer or respond to events
- **CLI, Telegram bot, VSCode extension** — talk to your agent from anywhere

### What it is **not**

- ❌ A trading product. OpenVesper does **not** bundle Hyperliquid / Lighter / Drift signing code. You can add your own trading plugin if you want — the framework does not stop you.
- ❌ A wallet. The framework never asks for seed phrases or private keys.
- ❌ A cloud service. There are no OpenVesper servers receiving your data.

---

## Get started

Requires [Node.js 20+](https://nodejs.org) and [pnpm 9+](https://pnpm.io).

```bash
git clone https://github.com/openvesper/openvesper
cd openvesper

pnpm install
pnpm -r build
```

Then configure at least one LLM provider key in `~/.openvesper/.env`:

```bash
mkdir -p ~/.openvesper
cp .env.example ~/.openvesper/.env
# edit and set ANTHROPIC_API_KEY (or any other provider)
```

Run your first agent:

```bash
node apps/cli/dist/index.js -q "What's the price of BTC?"
```

For per-agent setup guides, see [the docs site](https://openvesper.com/docs/start/getting-started).

---

## Documentation

Comprehensive docs ship with the website (48 pages):

- [Getting Started](https://openvesper.com/docs/start/getting-started)
- [Architecture](https://openvesper.com/docs/concepts/architecture)
- [All 16 agents](https://openvesper.com/docs/agents) — each with its own setup guide
- [Security policy](https://openvesper.com/docs/gateway/security)
- [Cron jobs & heartbeats](https://openvesper.com/docs/automation/cron-jobs)
- [Webhook integrations](https://openvesper.com/docs/automation/webhook)

---

## Privacy

OpenVesper is built on three commitments:

1. **Zero data retention.** No telemetry, no analytics, no phone-home. Your
   prompts go only to your chosen LLM provider.
2. **No wallet keys.** The framework never asks for seed phrases or private
   keys. Trading execution and signing are not bundled — build your own plugin if you need them.
3. **Opt-in everything.** Memory, conversation persistence, and heartbeats are
   all disabled by default.

See [`SECURITY.md`](SECURITY.md) for full details and how each commitment is
enforced in code.

---

## Status

Active development. Public release pending CI setup and npm publish.
See [`ROADMAP.md`](ROADMAP.md) for what's done and what's next.

---

## License

MIT. See [`LICENSE`](LICENSE).

---

<div align="center">

🌒 An independent open-source project. Not affiliated with any chain, exchange, or LLM provider.

</div>
