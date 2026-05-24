---
schedule: "0 8 * * *"
enabled: false
---

# Heartbeat — defi-strategist

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: check positions, yields, IL on active LPs. Flag any < 5% APR vs 4.5% risk-free.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-defi-strategist \
  --schedule "0 8 * * *" \
  --agent defi-strategist \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
