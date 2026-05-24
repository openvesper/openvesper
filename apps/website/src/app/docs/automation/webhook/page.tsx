import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Webhooks</h1>
      <p>Trigger agents from external events. GitHub PR opened? Run code-reviewer. New Stripe charge? Update the CRM. Whale alert? Investigate.</p>

      <h2>How it works</h2>

      <ol>
        <li>External service POSTs to <code>https://&lt;gateway&gt;/webhook/&lt;path&gt;</code></li>
        <li>Gateway verifies HMAC signature using the shared secret</li>
        <li>Payload is parsed as JSON</li>
        <li>Filter conditions checked (e.g., only PR <code>opened</code> events)</li>
        <li>Agent is invoked with the expanded prompt template</li>
        <li>Result delivered to configured target</li>
      </ol>

      <h2>Configuration</h2>

      <p>Define webhooks in <code>config/webhooks.yaml</code>:</p>

      <pre><code>{`webhooks:
  - path: /webhook/github-pr
    secret_env: GITHUB_WEBHOOK_SECRET
    signature_header: x-hub-signature-256
    signature_algo: sha256
    signature_prefix: "sha256="
    agent: code-reviewer
    filter:
      action: opened
    prompt_template: |
      A new PR was opened: {{event.pull_request.title}}
      Repo: {{event.repository.full_name}}
      Author: {{event.pull_request.user.login}}
      URL: {{event.pull_request.html_url}}
      Review it.
    deliver_to: "slack:#engineering"
    enabled: false`}</code></pre>

      <h2>Fields</h2>

      <table>
        <thead>
          <tr><th>Field</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>path</code></td><td>Yes</td><td>URL path (must start with /)</td></tr>
          <tr><td><code>agent</code></td><td>Yes</td><td>Agent mode to invoke</td></tr>
          <tr><td><code>prompt_template</code></td><td>Yes</td><td>Prompt with {`{{event.path}}`} interpolation</td></tr>
          <tr><td><code>secret_env</code></td><td>Recommended</td><td>Env var holding HMAC secret</td></tr>
          <tr><td><code>signature_header</code></td><td>No</td><td>Header containing signature (default: x-hub-signature-256)</td></tr>
          <tr><td><code>signature_algo</code></td><td>No</td><td>sha1 or sha256 (default: sha256)</td></tr>
          <tr><td><code>signature_prefix</code></td><td>No</td><td>Prefix on signature (default: "sha256=")</td></tr>
          <tr><td><code>filter</code></td><td>No</td><td>Map of dot-path → expected value</td></tr>
          <tr><td><code>deliver_to</code></td><td>No</td><td>Where to send agent output</td></tr>
          <tr><td><code>enabled</code></td><td>No</td><td>Default: true</td></tr>
        </tbody>
      </table>

      <h2>Signature verification</h2>

      <p>For every inbound request, the gateway:</p>
      <ol>
        <li>Reads the raw request body</li>
        <li>Computes <code>HMAC-{`<algo>`}(secret, body)</code></li>
        <li>Compares (timing-safe) against the value in the signature header</li>
        <li>Rejects with 401 if invalid</li>
      </ol>

      <p>⚠️ If you omit <code>secret_env</code>, the webhook accepts any caller who knows the URL. Don't do this in production.</p>

      <h2>Prompt template variables</h2>

      <p>Use <code>{`{{event.<json.path>}}`}</code> to reference fields in the webhook payload:</p>

      <pre><code>{`# For a GitHub PR opened event:
{{event.pull_request.title}}        → "Fix race condition in scheduler"
{{event.pull_request.user.login}}    → "alice"
{{event.pull_request.html_url}}      → "https://github.com/.../pull/42"
{{event.repository.full_name}}       → "openvesper/openvesper"`}</code></pre>

      <h2>Filters</h2>

      <p>Use <code>filter</code> to invoke the agent only when conditions match:</p>

      <pre><code>{`# Only on PR opened (skip closed, edited, synchronized)
filter:
  action: opened

# Only on charges over $100 (path traversal)
filter:
  type: charge.succeeded`}</code></pre>

      <p>Filter values are matched as strings. For complex conditions, do filtering inside the prompt and let the agent decide.</p>

      <h2>GitHub setup example</h2>

      <ol>
        <li>Generate a webhook secret (e.g., <code>openssl rand -hex 32</code>)</li>
        <li>Add to <code>~/.openvesper/.env</code>: <code>GITHUB_WEBHOOK_SECRET=...</code></li>
        <li>In repo settings → Webhooks → Add webhook:
          <ul>
            <li>Payload URL: <code>https://your-gateway.com/webhook/github-pr</code></li>
            <li>Content type: <code>application/json</code></li>
            <li>Secret: paste the secret</li>
            <li>Events: select "Pull requests"</li>
          </ul>
        </li>
        <li>Add to <code>config/webhooks.yaml</code></li>
        <li>Restart the daemon: <code>vesper daemon restart</code></li>
      </ol>

      <h2>Async execution</h2>

      <p>Webhook requests return <code>202 Accepted</code> immediately. The agent runs in the background. This prevents external services from timing out while the agent thinks.</p>

      <p>For long-running agents, ensure your <code>deliver_to</code> target can receive the result later (Telegram, Slack, email).</p>

      <h2>Local testing</h2>

      <p>Use ngrok or similar to expose your local gateway:</p>

      <pre><code>{`ngrok http 18789
# → https://abc123.ngrok.io
# Use https://abc123.ngrok.io/webhook/github-pr in GitHub settings`}</code></pre>

      <p>Or test the webhook handler directly:</p>

      <pre><code>{`curl -X POST http://localhost:18789/webhook/github-pr \\
  -H "Content-Type: application/json" \\
  -H "x-hub-signature-256: sha256=<computed>" \\
  -d @sample-pr-opened.json`}</code></pre>

      <h2>Privacy</h2>

      <p>Webhook payloads are processed in-memory and never persisted unless your <code>deliver_to</code> target writes to disk. The gateway never forwards payloads to OpenVesper servers. See{" "}
      <Link href="/docs/gateway/security">Security</Link>.</p>
    </div>
  );
}
