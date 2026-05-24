---
schedule: "0 9 * * SUN"
enabled: false
---

# Heartbeat — travel-planner

A short checklist this agent reviews on scheduled heartbeats.

Keep this short to avoid token burn.

## Recurring task

Weekly: check upcoming trips, flag any missing bookings, visa deadlines.

## Daily check-ins

- [ ] No pending high-priority issues
- [ ] Memory log up to date
- [ ] Required env vars present

## Activation

This heartbeat is **disabled by default**. To enable:

```bash
vesper cron add hb-travel-planner \
  --schedule "0 9 * * SUN" \
  --agent travel-planner \
  --prompt "Run your heartbeat checklist for {{date}}." \
  --deliver-to "telegram:@me"
```

Or set `enabled: true` in the frontmatter above and run the daemon.
