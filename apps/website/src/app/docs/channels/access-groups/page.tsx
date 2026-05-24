import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Access Groups</h1>
      <p className="lead">
        Restrict which channels and identities can talk to which agents. Useful
        for shared gateways where multiple people connect.
      </p>

      <h2>Rule shape</h2>
      <pre><code>{`{
  "agent": "bags-hunter",
  "allow": ["telegram:12345", "cli:*"],
  "deny": ["telegram:*"],
  "label": "only primary user + CLI"
}`}</code></pre>

      <h2>Resolution order</h2>
      <ol>
        <li><strong>Deny first</strong> — any matching deny pattern blocks the message immediately</li>
        <li><strong>Allow check</strong> — if an allow list exists for that agent, identity must match</li>
        <li><strong>Default allow</strong> — if no rules touch this agent, access is permitted</li>
      </ol>

      <h2>Adding rules</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/access \\
  -d '{
    "agent": "defi-strategist",
    "allow": ["telegram:12345", "cli:alice"],
    "label": "private agent"
  }'`}</code></pre>

      <h2>Checking access</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/access/check \\
  -d '{"agent":"defi-strategist","channel":"telegram","identity":"99999"}'
# → {"allowed": false, "reason": "not in allow list for \\"private agent\\""}`}</code></pre>

      <h2>Wildcard support</h2>
      <p>Same as routing: <code>telegram:*</code>, <code>cli:*</code>, etc.</p>

      <h2>Storage</h2>
      <p>
        Rules at <code>~/.openvesper/access.json</code> (mode 0600).
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/channel-routing.ts</code></p>
    </div>
  );
}
