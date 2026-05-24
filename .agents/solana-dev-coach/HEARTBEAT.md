---
schedule: "0 9 * * MON"
enabled: false
---

# Heartbeat — solana-dev-coach

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Weekly: scan recent program upgrades, anchor releases, ecosystem grants.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-solana-dev-coach \
  --schedule "0 9 * * MON" \
  --agent solana-dev-coach \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
