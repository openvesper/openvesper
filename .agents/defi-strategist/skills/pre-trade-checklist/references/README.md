# 📋 Pre-Trade Checklist

A reusable skill that runs an 8-section safety check before any crypto trade.

## When it activates

This skill auto-activates when the user's prompt contains: `buy`, `sell`, `snipe`, `ape`, `trade`, `position`, `long`, `short`.

## What it does

Runs a structured pre-trade audit across:
1. Token Security (rug check, honeypot)
2. Distribution (top holders, dev wallet)
3. Volume & Liquidity
4. Sentiment (Twitter, whales, fear/greed)
5. Technical Analysis
6. Macro context (DXY, BTC trend)
7. Position Sizing rules
8. Mental State check

## Tools required (cross-plugin)

This skill uses tools from multiple plugins:
- `plugin-security`: token_security, rugcheck
- `plugin-onchain`: top_holders
- `plugin-crypto`: coin_price, fear_greed_index
- `plugin-twitter`: crypto_twitter_sentiment
- `plugin-whale`: whale_alerts
- `plugin-quant`: technical_analysis

## Usage

Any agent with `allow_all_tools: true` can leverage this skill. When user asks something trade-related, the skill auto-activates and pulls the tools it needs across plugins.

```bash
vesper --agent trading
# user: "Should I ape into BONK right now?"
# → pre-trade-checklist auto-activates
# → agent runs all 8 sections before answering
```

## Disclaimer

⚠️ NOT FINANCIAL ADVICE. DYOR.
