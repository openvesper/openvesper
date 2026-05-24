---
schedule: "0 7 * * MON,WED,FRI"
enabled: false
---

# Heartbeat — fitness-trainer

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Workout days: deliver today's session plan. Yesterday's recovery check.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-fitness-trainer \
  --schedule "0 7 * * MON,WED,FRI" \
  --agent fitness-trainer \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
