---
name: scan-and-score
description: |
  Use when the user asks "what's trending on Bags.fm", "what new launches today",
  "find me some Bags tokens", "scan Bags.fm", or any general discovery question
  about Bags.fm Solana memecoins. This skill runs the trending → score → filter
  flow and presents top survivors with concrete metrics.
---

# Scan and Score Flow

When the user wants to discover Bags.fm tokens, follow this exact flow:

## Step 1 — Determine the timeframe

Default to **6h** for "trending" unless the user specifies. For "new launches"
use **24h** unless otherwise stated.

## Step 2 — Pull the candidate list

- If user wants trending → `bags_trending` with their timeframe
- If user wants new launches → `bags_new_launches` with `max_age_hours: 24`
- If user named a token → `bags_search` then jump to Step 4

## Step 3 — Apply first-pass filter

Drop any candidate that fails:
- Liquidity < $10,000
- Age < 1 hour (too volatile to score reliably)
- Volume/liq ratio < 0.1 (dead)

Keep the **top 10** by initial score.

## Step 4 — Deep score the survivors

For each of the top 10 (or top 5 if there are fewer), run `bags_token_analysis`.
This gives a 0-100 composite score.

## Step 5 — Rank and present

Show the top 5 in this format:

```
🎒 Top Bags.fm Tokens — last 6h

1. $SYMBOL — Score 87/100
   Liquidity: $45k | Vol/Liq: 3.2x | Buy/Sell: 1.8 | Age: 18h
   ✅ Strong buy pressure
   🟡 Top holder 18% — moderate concentration

2. $OTHER — Score 72/100
   ...
```

## Step 6 — Risk reminder

Always end with:

> ⚠️ Bags.fm = high-risk memecoins with creator fee-sharing. These scores reflect
> current technicals only. Not financial advice. DYOR.

## Anti-patterns

- ❌ Don't list more than 5 unless user asks for "all" or "full list"
- ❌ Don't include tokens that failed the first-pass filter without flagging them
- ❌ Don't omit the risk flag emoji — users skim
- ❌ Don't recommend "buying" — present the data, let the user decide
