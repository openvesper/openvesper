import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Diagnostics Export</h1>
      <p className="lead">
        Bundle config, plugin list, agent list, recent audit entries, gateway
        logs into one JSON file you can attach to a bug report. Secrets
        auto-redacted.
      </p>

      <h2>Generating</h2>
      <pre><code>{`curl http://127.0.0.1:18789/diag
# Returns the report inline (large JSON)

curl -X POST http://127.0.0.1:18789/diag/export
# {"ok": true, "path": "~/.openvesper/openvesper-diag-1737475200000.json"}`}</code></pre>

      <h2>What's in the report</h2>
      <ul>
        <li>Gateway version, Node version, platform, uptime</li>
        <li>Config (with secrets redacted)</li>
        <li>Bundled + installed agents</li>
        <li>Installed OAuth providers (names only, no tokens)</li>
        <li>Today's audit stats + last 100 entries</li>
        <li>Last 100 lines of gateway log</li>
      </ul>

      <h2>Redacted keys</h2>
      <p>These are replaced with <code>"&lt;REDACTED&gt;"</code> before writing:</p>
      <pre><code>{`apiKey, api_key, token, secret, password, auth,
ANTHROPIC_API_KEY, OPENAI_API_KEY, GROQ_API_KEY,
GEMINI_API_KEY, TELEGRAM_BOT_TOKEN, GITHUB_TOKEN,
SLACK_BOT_TOKEN, HELIUS_API_KEY,
accessToken, refreshToken, clientSecret`}</code></pre>
      <p>Plus any field whose name contains those substrings (case-insensitive).</p>

      <h2>Before sharing</h2>
      <p>
        Always open the exported JSON before sharing it. Redaction is best-effort
        — review for anything sensitive specific to your setup before posting
        publicly.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/diagnostics.ts</code></p>
    </div>
  );
}
