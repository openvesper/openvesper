---
name: morning-briefing
description: Produce a structured daily morning briefing. Use when the user says good morning, asks for the brief, daily summary, or what's happening. Pulls from 10+ tools across 7 plugins: crypto markets (BTC/ETH/SOL, fear & greed, gainers/losers), whale activity, active airdrops, tech news (HackerNews + crypto RSS), today's calendar, today's weather.
---

# Morning Briefing

Run a structured morning brief:

## 1. Market snapshot
- BTC, ETH, SOL prices (24h change)
- Fear & Greed Index
- Top gainers/losers (last 24h)

## 2. Whale activity
- Notable large transfers (>$1M)
- Smart money flows (CEX in/out)

## 3. Airdrop opportunities
- New airdrops launched
- Claiming deadlines approaching

## 4. News
- Top crypto news (CoinDesk RSS, The Block)
- Top HackerNews (general tech)

## 5. Your day
- Calendar events (next 24h)
- Weather forecast (today)

## Output Format

```
☀️ GOOD MORNING — <date>

📊 MARKETS
BTC: $X (+Y%)  ETH: $A (+B%)  SOL: $C (+D%)
F&G Index: <N> (<label>)

🚀 TOP GAINERS (24h)
1. <coin>: +X%
2. ...

📉 TOP LOSERS
1. <coin>: -X%

🐋 WHALE ACTIVITY
• <event>

🪂 AIRDROPS
• <new airdrop>
• <claim by <date>>

📰 NEWS
• <headline 1>
• <headline 2>

📅 YOUR DAY
• 09:00 — <event>
• 14:30 — <event>

🌤 WEATHER
<location>: <forecast>
```

Be concise. No fluff. Just the brief.
