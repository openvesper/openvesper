---
schedule: "0 9 * * *"
enabled: false
---

# Heartbeat — bags-hunter

A short checklist this agent reviews on scheduled heartbeats.

This heartbeat is **disabled by default**. Activate only if you want a daily
Bags.fm scan delivered to your channel of choice.

## Recurring task (daily, 9 AM)

1. Run `bags_trending` for the last 24h.
2. For the top 5 by composite score, run `bags_rug_check` and `bags_holder_distribution`.
3. Filter out anything with:
   - 🔴 Critical rug flags
   - Top holder > 40%
   - Liquidity < $10k
4. Report the survivors with key metrics.

## Daily check-ins

- [ ] No tokens in `bags_trending` show liquidity drain > 50%
- [ ] No creators flagged as serial launchers in user's watchlist
- [ ] HELIUS_API_KEY still working (no auth errors)

## Activation

```bash
# Edit this file: change "enabled: false" to "enabled: true"
# Then add it to your cron job state:
node apps/cli/dist/index.js cron add hb-bags-hunter \
  --schedule "0 9 * * *" \
  --agent bags-hunter \
  --prompt "Run your heartbeat checklist for {{date}}" \
  --deliver-to "telegram:@me"
```
