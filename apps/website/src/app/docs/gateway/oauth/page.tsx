import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>OAuth</h1>
      <p className="lead">
        Local PKCE-based OAuth flow for plugins needing authorized API access
        (Gmail, Google Calendar, GitHub, Slack, etc.). Tokens never leave your machine.
      </p>

      <h2>Flow</h2>
      <ol>
        <li>You run <code>vesper oauth login &lt;provider&gt; --client-id &lt;id&gt;</code></li>
        <li>Gateway prints an authorization URL</li>
        <li>You open it in a browser, approve</li>
        <li>Provider redirects to <code>http://127.0.0.1:53174/callback</code></li>
        <li>Gateway captures the code, exchanges for tokens</li>
        <li>Tokens save to <code>~/.openvesper/tokens/&lt;provider&gt;.json</code> (mode 0600)</li>
      </ol>

      <h2>Built-in provider templates</h2>
      <table>
        <thead><tr><th>Provider</th><th>Default scopes</th><th>PKCE</th></tr></thead>
        <tbody>
          <tr><td><code>google</code></td><td>Gmail modify, Calendar</td><td>✓</td></tr>
          <tr><td><code>github</code></td><td>repo, user</td><td>—</td></tr>
          <tr><td><code>slack</code></td><td>chat:write, channels:read</td><td>—</td></tr>
        </tbody>
      </table>

      <h2>Usage</h2>
      <pre><code>{`# Register an OAuth app with the provider, get the client ID
vesper oauth login google \\
  --client-id YOUR_CLIENT_ID \\
  --client-secret YOUR_SECRET

# List authorized providers
vesper oauth list

# Revoke
vesper oauth logout google`}</code></pre>

      <h2>API equivalent</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/oauth/start \\
  -d '{
    "provider": "google",
    "clientId": "...",
    "clientSecret": "...",
    "scopes": ["..."]
  }'

curl http://127.0.0.1:18789/oauth/tokens
curl -X DELETE http://127.0.0.1:18789/oauth/tokens/google`}</code></pre>

      <h2>Privacy</h2>
      <p>
        The entire flow runs on your machine. The provider's auth server sees a
        redirect to <code>127.0.0.1</code> only — not to OpenVesper (we have no
        servers). Tokens are written to disk locally with file mode 0600.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/oauth.ts</code></p>
    </div>
  );
}
