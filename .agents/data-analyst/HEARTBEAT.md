---
schedule: "0 9 * * MON"
enabled: false
---

# Heartbeat — data-analyst

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Weekly: data quality checks across key tables. Flag null rate changes > 10%.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-data-analyst \
  --schedule "0 9 * * MON" \
  --agent data-analyst \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
