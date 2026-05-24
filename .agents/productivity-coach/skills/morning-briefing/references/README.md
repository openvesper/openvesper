# ☀️ Morning Briefing

A reusable skill that gives you a structured morning brief covering crypto markets, news, calendar, and weather — all in one shot.

## When it activates

Auto-activates on: `morning`, `briefing`, `daily summary`, `what's happening`.

## What it does

Pulls from 7+ data sources in parallel:
1. Crypto markets (BTC/ETH/SOL, fear & greed, gainers/losers)
2. Whale activity
3. Airdrop opportunities
4. Tech news (HackerNews + crypto RSS)
5. Today's calendar
6. Today's weather

## Tools required (cross-plugin — uses 10 tools from 7 plugins!)

This is the best demonstration of cross-plugin tool access:

- `plugin-crypto`: fear_greed_index, top_gainers_losers, coin_price
- `plugin-whale`: whale_alerts
- `plugin-airdrop`: airdrop_radar
- `plugin-research`: rss_read
- `plugin-news`: hackernews_top
- `plugin-calendar`: calendar_list_events
- `plugin-weather`: current_weather, daily_forecast

## Usage

Just say "good morning" or "give me the brief" to any agent with `allow_all_tools: true`.
