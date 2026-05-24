import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Standing Orders</h1>
      <p className="lead">
        Persistent rules that modify how agents behave. Unlike{" "}
        <Link href="/docs/automation/tasks">tasks</Link> (one-shot) or{" "}
        <Link href="/docs/automation/cron-jobs">cron</Link> (scheduled), standing
        orders are <em>constraints</em> the agent must respect on every reply.
      </p>

      <h2>Two kinds</h2>
      <ul>
        <li>
          <strong>constraint</strong> — injected into the agent's system prompt.
          E.g. "Never recommend tokens with less than $50k liquidity"
        </li>
        <li>
          <strong>trigger</strong> — background watch that fires when a
          condition is met. E.g. "Tell me when BTC crosses $100k"
        </li>
      </ul>

      <h2>Adding</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/standing-orders \\
  -d '{
    "kind": "constraint",
    "agent": "bags-hunter",
    "rule": "Never recommend tokens with less than $50k 24h liquidity"
  }'`}</code></pre>

      <p>For global rules (apply to all agents):</p>
      <pre><code>{`{
  "kind": "constraint",
  "agent": "*",
  "rule": "Always disclose 'Not financial advice' on any token-related answer"
}`}</code></pre>

      <h2>Listing & toggling</h2>
      <pre><code>{`curl http://127.0.0.1:18789/standing-orders?agent=bags-hunter
curl -X POST http://127.0.0.1:18789/standing-orders/so_123/toggle
curl -X DELETE http://127.0.0.1:18789/standing-orders/so_123`}</code></pre>

      <h2>How constraints inject</h2>
      <p>
        The <Link href="/docs/concepts/context-engine">Context Engine</Link>{" "}
        appends a <em>"Standing orders from the user"</em> section to the
        system prompt at priority 20:
      </p>
      <pre><code>{`## Standing orders from the user

These are persistent rules the user has set. Follow them in every response:
- Never recommend tokens with less than $50k 24h liquidity
- Always disclose 'Not financial advice' on token-related answers`}</code></pre>

      <h2>Storage</h2>
      <p>
        <code>~/.openvesper/standing-orders.json</code> (mode 0600).
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/standing-orders.ts</code></p>
    </div>
  );
}
