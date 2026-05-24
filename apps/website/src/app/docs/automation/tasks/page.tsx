import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Background Tasks</h1>
      <p className="lead">
        Long-running agent work, scheduled reminders, recurring jobs. Persisted
        to disk and resumed across gateway restarts.
      </p>

      <h2>Three kinds of task</h2>
      <ul>
        <li><strong>reminder</strong> — notify at time T with a message (no LLM)</li>
        <li><strong>deferred-run</strong> — at time T, run agent loop with a prompt</li>
        <li><strong>deferred-now</strong> — run agent loop now in background, notify when done</li>
      </ul>

      <h2>Examples</h2>
      <pre><code>{`# Set a reminder for 1 hour
curl -X POST http://127.0.0.1:18789/tasks \\
  -d '{
    "kind": "reminder",
    "sessionKey": "user-123",
    "channel": "telegram",
    "payload": "BTC daily check time",
    "runAt": ${'$('}date +%s${'000)'}
  }'

# Schedule recurring daily summary at 9am
curl -X POST http://127.0.0.1:18789/tasks \\
  -d '{
    "kind": "deferred-run",
    "sessionKey": "user-123",
    "channel": "telegram",
    "agent": "defi-strategist",
    "payload": "Give me yesterday market summary",
    "runAt": 1737475200000,
    "recurEveryMs": 86400000
  }'`}</code></pre>

      <h2>Status & cancel</h2>
      <pre><code>{`curl http://127.0.0.1:18789/tasks
curl http://127.0.0.1:18789/tasks?status=scheduled
curl -X DELETE http://127.0.0.1:18789/tasks/t_173...`}</code></pre>

      <h2>Storage</h2>
      <p>
        Tasks persist at <code>~/.openvesper/tasks/&lt;id&gt;.json</code> (mode 0600). Daemon ticks every 5s by default.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/tasks.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/automation/standing-orders">Standing Orders</Link> (different from tasks)</li>
        <li><Link href="/docs/automation/commitments">Commitments</Link></li>
      </ul>
    </div>
  );
}
