# 🌒 OpenVesper Telegram Bot

Standalone Telegram bot that exposes OpenVesper agents.

## Setup

1. Create a bot via [@BotFather](https://t.me/BotFather) → `/newbot` → copy token
2. Set in `.env`:
   ```
   TELEGRAM_BOT_TOKEN=...
   ANTHROPIC_API_KEY=...    # or any other LLM provider
   TELEGRAM_ALLOWED_USERS=  # comma-separated usernames/IDs (empty = open)
   ```
3. Run:
   ```bash
   pnpm install
   pnpm dev
   ```

## Commands

- `/start` — initialize
- `/agents` — show all agents
- `/agent <mode>` — switch agent (e.g. `/agent bagsfm`)
- `/clear` — clear conversation
- `/help` — show help

## Deploy

Works on any Node.js host: Railway, Fly.io, Render, GCP VM, your home server.

```bash
pnpm build
pnpm start
```
