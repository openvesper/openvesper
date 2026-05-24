---
schedule: "0 7 * * *"
enabled: false
---

# Heartbeat — stoic-mentor

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: morning reflection. Surface yesterday's wins, today's intention.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-stoic-mentor \
  --schedule "0 7 * * *" \
  --agent stoic-mentor \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
