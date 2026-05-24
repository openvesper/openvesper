import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Cron Jobs</h1>
      <p>Schedule recurring agent tasks. Define jobs in <code>config/cron.yaml</code> or manage them via the CLI.</p>

      <h2>Quick example</h2>

      <pre><code>{`# Send a morning brief to Telegram every day at 8 AM
vesper cron add morning-brief \\
  --schedule "0 8 * * *" \\
  --agent auto \\
  --prompt "Good morning, give me the brief for {{date}}" \\
  --deliver-to "telegram:@me"`}</code></pre>

      <h2>Cron expression syntax</h2>

      <p>Standard 5-field crontab: <code>minute hour day-of-month month day-of-week</code></p>

      <table>
        <thead>
          <tr><th>Field</th><th>Range</th><th>Special</th></tr>
        </thead>
        <tbody>
          <tr><td>minute</td><td>0-59</td><td>* */N</td></tr>
          <tr><td>hour</td><td>0-23</td><td>* */N</td></tr>
          <tr><td>day-of-month</td><td>1-31</td><td>* */N</td></tr>
          <tr><td>month</td><td>1-12 or JAN-DEC</td><td>*</td></tr>
          <tr><td>day-of-week</td><td>0-6 or SUN-SAT</td><td>*</td></tr>
        </tbody>
      </table>

      <h3>Shortcuts</h3>
      <ul>
        <li><code>@hourly</code> → <code>0 * * * *</code></li>
        <li><code>@daily</code> → <code>0 0 * * *</code></li>
        <li><code>@weekly</code> → <code>0 0 * * SUN</code></li>
        <li><code>@monthly</code> → <code>0 0 1 * *</code></li>
        <li><code>@yearly</code> → <code>0 0 1 1 *</code></li>
      </ul>

      <h2>Prompt templates</h2>

      <p>Prompts support template variables interpolated at run time:</p>

      <table>
        <thead><tr><th>Variable</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td><code>{"{{now}}"}</code></td><td>ISO timestamp</td></tr>
          <tr><td><code>{"{{date}}"}</code></td><td>YYYY-MM-DD</td></tr>
          <tr><td><code>{"{{yesterday}}"}</code></td><td>Previous day (YYYY-MM-DD)</td></tr>
          <tr><td><code>{"{{time}}"}</code></td><td>HH:MM</td></tr>
          <tr><td><code>{"{{weekday}}"}</code></td><td>Monday / Tuesday / ...</td></tr>
          <tr><td><code>{"{{user}}"}</code></td><td>Current OS user</td></tr>
        </tbody>
      </table>

      <h2>Delivery targets</h2>

      <p>Set <code>deliver_to</code> to send the agent's output somewhere:</p>

      <ul>
        <li><code>telegram:@username</code> — Telegram DM</li>
        <li><code>slack:#channel</code> — Slack channel</li>
        <li><code>discord:#channel</code> — Discord channel</li>
        <li><code>email:user@example.com</code> — Email</li>
        <li><code>log</code> — append to <code>~/.openvesper/logs/cron.log</code></li>
        <li><code>console</code> — stdout (useful for debugging)</li>
        <li><code>none</code> — discard output</li>
      </ul>

      <h2>YAML config</h2>

      <p>Define jobs declaratively in <code>config/cron.yaml</code>:</p>

      <pre><code>{`jobs:
  - id: morning-briefing
    name: Daily morning briefing
    schedule: "0 8 * * *"
    agent: auto
    prompt: |
      Good morning. It is {{date}}. Give me:
      - Top crypto moves overnight
      - Calendar today
      - Weather
    deliver_to: "telegram:@me"
    enabled: false

  - id: friday-retro
    name: Friday weekly retro
    schedule: "0 17 * * FRI"
    agent: productivity-coach
    prompt: "Run my weekly retro for week of {{date}}"
    deliver_to: "telegram:@me"
    enabled: false`}</code></pre>

      <h2>CLI commands</h2>

      <pre><code>{`# List all jobs
vesper cron list

# Show summary stats
vesper cron status

# Add a job
vesper cron add daily-brief \\
  --schedule "0 8 * * *" \\
  --agent auto \\
  --prompt "Give me my daily brief for {{date}}"

# Run a job immediately (bypass schedule)
vesper cron run daily-brief

# Enable/disable
vesper cron toggle daily-brief

# Remove
vesper cron remove daily-brief`}</code></pre>

      <h2>Heartbeats — per-agent autonomous mode</h2>

      <p>Each agent in <code>.agents/&lt;name&gt;/</code> has a <code>HEARTBEAT.md</code> with frontmatter:</p>

      <pre><code>{`---
schedule: "0 9 * * MON"
enabled: false
---

# Heartbeat — code-reviewer

## Recurring task

Weekly: list open PRs older than 3 days. Suggest which to prioritize.`}</code></pre>

      <p>To activate a heartbeat:</p>
      <ol>
        <li>Set <code>enabled: true</code> in the frontmatter</li>
        <li>Run <code>vesper daemon start</code></li>
      </ol>

      <p>The daemon reads all <code>.agents/*/HEARTBEAT.md</code> on startup and schedules each enabled one.</p>

      <h2>Running the scheduler</h2>

      <p>The scheduler runs inside the gateway daemon:</p>

      <pre><code>{`# Start the daemon (auto-loads cron.yaml + HEARTBEAT.md files)
vesper daemon start

# Check status
vesper daemon status

# Stop
vesper daemon stop`}</code></pre>

      <p>Without the daemon running, jobs do not fire on schedule. CLI commands like <code>vesper cron run</code> work without the daemon by triggering immediate execution.</p>

      <h2>State persistence</h2>

      <p>Job state (last run, run count, errors, next run) is stored at:</p>
      <pre><code>~/.openvesper/workspace/heartbeat.json</code></pre>

      <p>File permissions are set to <code>0600</code> on POSIX systems.</p>

      <h2>Privacy</h2>

      <p>All scheduling, execution, and state lives on your local machine. Cron output is never sent to OpenVesper servers — only to the <code>deliver_to</code> target you configure. See{" "}
      <Link href="/docs/gateway/security">Security</Link> for full details.</p>
    </div>
  );
}
