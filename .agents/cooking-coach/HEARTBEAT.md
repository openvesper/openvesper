---
schedule: "0 17 * * *"
enabled: false
---

# Heartbeat — cooking-coach

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: dinner reminder. Suggest 3 quick recipes based on what's in the pantry.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-cooking-coach \
  --schedule "0 17 * * *" \
  --agent cooking-coach \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
