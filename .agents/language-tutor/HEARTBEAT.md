---
schedule: "0 8 * * *"
enabled: false
---

# Heartbeat — language-tutor

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Daily: send the user a single new phrase + 2 example sentences in their target language.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-language-tutor \
  --schedule "0 8 * * *" \
  --agent language-tutor \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
