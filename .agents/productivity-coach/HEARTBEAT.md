---
schedule: "0 8 * * *"
enabled: false
---

# Heartbeat — productivity-coach

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: list overdue tasks, today's calendar, deep work blocks.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-productivity-coach \
  --schedule "0 8 * * *" \
  --agent productivity-coach \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
