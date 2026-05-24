---
schedule: "30 16 * * MON-FRI"
enabled: false
---

# Heartbeat — investment-researcher

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily after market close: re-validate active theses. Flag any invalidation triggers.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-investment-researcher \
  --schedule "30 16 * * MON-FRI" \
  --agent investment-researcher \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
