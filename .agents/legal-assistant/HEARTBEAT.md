---
schedule: "0 9 * * MON"
enabled: false
---

# Heartbeat — legal-assistant

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Weekly: check contracts expiring in next 30 days. Review any new agreements.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-legal-assistant \
  --schedule "0 9 * * MON" \
  --agent legal-assistant \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
