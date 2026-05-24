# OpenVesper Roadmap

Honest status of where the project is and where it's heading.

## ✅ Done

- 47 plugins across crypto, DeFi, comms, productivity, lifestyle
- 16 specialist agents + general-purpose `auto`
- 36 skills — all agent-bound
- 12 LLM provider adapters (Anthropic, OpenAI, Groq, Gemini, DeepSeek, Mistral, Together, OpenRouter, Ollama, LM Studio, Perplexity, xAI)
- Plugin SDK with `definePlugin / defineTool / defineAgent / inputSchema`
- Cross-plugin tool registry (no whitelists)
- Cron scheduler with HEARTBEAT.md autonomous mode
- Webhook router with HMAC verification
- VSCode extension with encrypted secretStorage
- CLI with subcommands: doctor, onboard, agent, skill, cron, memory
- 48-page documentation site
- Privacy: zero data retention, no wallet keys, opt-in persistence
- Security: 6 web headers, CSP, HSTS, sandboxed filesystem/shell

## 🚧 In progress

- Public GitHub repo at github.com/openvesper/openvesper
- Vercel deploy of openvesper.com
- First-time-user installer script (replace `git clone` with `curl | sh`)

## 📋 Next

### Stability
- Real integration tests covering common agent flows
- CI workflow (lint, typecheck, build, test on push)
- Per-plugin README expansion (currently many are stubs)

### Distribution
- npm publish (`@openvesper/cli`, `@openvesper/core`, `@openvesper/plugin-sdk`)
- One-liner installer script: `curl -fsSL openvesper.com/install.sh | bash`
- Brew formula for macOS

### Runtime
- Standalone daemon mode so cron jobs and webhooks run without manual invocation
- Vector store / embeddings for skill retrieval (currently keyword-only)
- Per-agent observability dashboard (local-only)

### Channels
- Discord bot adapter beyond the current scaffold
- WhatsApp Business API channel
- Matrix bridge

### Community
- Plugin marketplace pattern (publish your own plugin to npm under `@openvesper/plugin-*`)
- Skill hub (publish your `SKILL.md` for others)

## ❌ Out of scope

These are deliberate non-goals:

- **Perpetual DEX trading** is not bundled by default. The reference plugins are read-only. Users who want trading can author their own plugin — the framework imposes no restriction. See `SECURITY.md` for the rationale.
- **Wallet key handling.** Never. The runtime won't accept seed phrases or main wallet keys.
- **Centralized server.** No accounts, no telemetry, no usage tracking. The framework is self-hosted by design.
- **Built-in token / on-chain governance.** OpenVesper is a tool, not a token project.

## How to help

This is an indie open-source project. The most helpful things you can do:

1. Run it on your machine, find bugs, open issues.
2. Write a plugin for a service you use and submit a PR.
3. Suggest agent personas / skills for use cases we haven't covered.

Issues and PRs welcome at https://github.com/openvesper/openvesper.
