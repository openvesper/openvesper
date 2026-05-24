---
name: portfolio-review
description: |
  Use when the user gives a list of 2-10 Bags.fm token addresses and asks for a
  basket review, portfolio analysis, "how is my Bags portfolio doing", or
  "should I rebalance". Combines portfolio_score, individual rug checks, and
  rebalancing suggestions.
---

# Portfolio Review Flow

When the user wants a portfolio-level read on their Bags.fm basket:

## Step 1 — Parse the input

User typically gives contract addresses. Could be:
- Comma-separated string
- Newline-separated list
- A paste from their wallet UI

Normalize to a clean array. **Maximum 10 addresses** — if more, ask the user to
trim to their top 10 by current value.

## Step 2 — Aggregate analysis

Run `bags_portfolio_score` with the array. This returns:
- Aggregate liquidity, market cap, volume
- Diversification status (WELL_DIVERSIFIED / MODERATELY_CONCENTRATED / HIGHLY_CONCENTRATED)
- Per-position breakdown (% of portfolio)
- 24h performance (green vs red count)

## Step 3 — Per-position rug check

For each position with > 10% allocation, run `bags_rug_check` to flag any
deteriorating positions.

For each position with > 25% allocation, also run `bags_holder_distribution` to
check whale concentration on those large holdings.

## Step 4 — Synthesis

Present the review in this format:

```
🎒 Bags.fm Portfolio Review (5 tokens)

📊 Aggregate
   Total liquidity:  $134k
   Total mcap:       $1.2M
   24h:              3 green, 2 red
   Performance:      60/100

📐 Diversification: MODERATELY_CONCENTRATED
   $TOKEN-A: 42%  🟠 over-concentrated
   $TOKEN-B: 23%
   $TOKEN-C: 18%
   $TOKEN-D: 12%
   $TOKEN-E: 5%

🛡 Risk flags
   $TOKEN-A: Top holder 35% 🟠 high
   $TOKEN-D: Mint authority active 🟠
   Others: 🟢 clean

💡 Suggestions
   - $TOKEN-A is 42% of your basket and has 35% top-holder concentration.
     Consider trimming to < 25%.
   - $TOKEN-D has active mint authority. Either rotate out or accept dilution risk.
   - Total liquidity $134k is healthy. Exit shouldn't be a problem.
```

## Step 5 — Risk reminder

Always end with:

> ⚠️ This analysis uses public on-chain data only. Bags.fm tokens are high-risk.
> Not financial advice. DYOR before any rebalancing.

## When to suggest rebalancing

Suggest reducing a position if **any** of these are true:
- Position > 40% of portfolio
- Top holder > 30% on that token
- Liquidity dropped > 30% in last 24h on that token
- Multiple risk flags on that single token

## When NOT to suggest selling

- Don't suggest selling everything — that's not a "review", that's a panic
- Don't make absolute predictions about price direction
- Don't recommend specific new tokens to rotate into unless asked

## Anti-patterns

- ❌ Don't run individual deep analysis on positions < 5% allocation (not worth the calls)
- ❌ Don't omit the diversification section — concentration is the #1 risk
- ❌ Don't show raw JSON dumps — synthesize into the readable format above
- ❌ Don't editorialize about whether they should be in memecoins at all
