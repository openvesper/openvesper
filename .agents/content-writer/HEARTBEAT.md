---
schedule: "0 10 * * *"
enabled: false
---

# Heartbeat — content-writer

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: check editorial calendar. Flag posts due in next 48h with no draft.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-content-writer \
  --schedule "0 10 * * *" \
  --agent content-writer \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
