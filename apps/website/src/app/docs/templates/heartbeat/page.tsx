import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>HEARTBEAT.md Template</h1>
      <p className="lead">
        Scheduled checklist. When enabled, the gateway wakes this agent on the
        given cron and asks it to work through the checklist.
      </p>

      <h2>Format</h2>
      <pre><code>{`---
schedule: "0 9 * * *"
enabled: true
channel: telegram
---

# Heartbeat — bags-hunter

Daily check on tracked positions and new tokens worth watching.

## Recurring task

- [ ] Review yesterday's watchlist for new patterns
- [ ] Scan top 20 new Bags.fm launches from last 24h
- [ ] Flag any holding tokens that dropped > 20%
- [ ] Update MEMORY.md with thesis changes

## Suppression

If nothing notable, reply: HEARTBEAT_OK

The gateway suppresses this reply — you won't see it. Only meaningful
findings reach your channel.`}</code></pre>

      <h2>Frontmatter fields</h2>
      <table>
        <thead><tr><th>Field</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>schedule</code></td><td>Cron expression (5-field standard)</td></tr>
          <tr><td><code>enabled</code></td><td>Boolean. Default: <code>false</code> (heartbeats opt-in)</td></tr>
          <tr><td><code>channel</code></td><td>Where to deliver findings (telegram, slack, discord, ws)</td></tr>
        </tbody>
      </table>

      <h2>HEARTBEAT_OK suppression</h2>
      <p>
        If the agent's reply contains exactly <code>HEARTBEAT_OK</code>, the
        gateway silently discards it. This lets agents check on schedule
        without spamming you when there's nothing to report.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/heartbeat.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/automation/cron-jobs">Cron Jobs</Link></li>
      </ul>
    </div>
  );
}
