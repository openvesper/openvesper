import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Channel Routing</h1>
      <p className="lead">
        Rules that pick which agent handles messages based on channel + identity.
        E.g. "all Telegram messages from chat_id 12345 → defi-strategist".
      </p>

      <h2>Pattern format</h2>
      <p>Patterns match against <code>{`<channel>:<identity>`}</code>. Wildcards (<code>*</code>) supported:</p>
      <ul>
        <li><code>telegram:*</code> — every Telegram message</li>
        <li><code>telegram:12345</code> — only chat_id 12345</li>
        <li><code>slack:U07*</code> — Slack users starting with U07</li>
        <li><code>*</code> — everything (use sparingly)</li>
      </ul>

      <h2>Adding rules</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/channel-routes \\
  -d '{
    "pattern": "telegram:12345",
    "agent": "defi-strategist",
    "priority": 100,
    "label": "Primary Telegram"
  }'`}</code></pre>

      <h2>Resolving a route</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/channel-routes/resolve \\
  -d '{"channel": "telegram", "identity": "12345"}'
# → {"agent": "defi-strategist"}`}</code></pre>

      <h2>Priority</h2>
      <p>
        Higher priority wins on multi-match. Default priority is 0. Add a
        high-priority specific rule above wildcards to handle exceptions.
      </p>

      <h2>Storage</h2>
      <p>
        Rules stored at <code>~/.openvesper/channel-routes.json</code> (mode 0600).
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/channel-routing.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/channels/access-groups">Access Groups</Link></li>
      </ul>
    </div>
  );
}
