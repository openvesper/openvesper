---
schedule: "0 10 * * *"
enabled: false
---

# Heartbeat — tdd-coach

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: review tests added since yesterday. Flag any new code without tests.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-tdd-coach \
  --schedule "0 10 * * *" \
  --agent tdd-coach \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
