---
schedule: "0 9 * * MON"
enabled: false
---

# Heartbeat — security-reviewer

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Weekly: scan recently merged PRs for security issues. Audit any new dependencies added in the last 7 days.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-security-reviewer \
  --schedule "0 9 * * MON" \
  --agent security-reviewer \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
