---
schedule: "0 9 * * *"
enabled: false
---

# Heartbeat — sales-coach

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: deal pipeline check. Flag deals with no contact in 7+ days.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-sales-coach \
  --schedule "0 9 * * *" \
  --agent sales-coach \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
