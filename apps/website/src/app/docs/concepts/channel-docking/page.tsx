import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Channel Docking</h1>
      <p className="lead">
        One conversation, many channels. Start in Telegram, continue in CLI,
        finish from VSCode — all the same session.
      </p>

      <h2>How it works</h2>
      <p>
        Every message has a <code>sessionKey</code>. The gateway uses this key,
        not the channel name, to look up session state. So as long as you reuse
        the same key, the conversation continues:
      </p>

      <pre><code>{`# On Telegram bot (sessionKey = chat_id "12345")
> "What is the BTC status?"

# Later from CLI (passing sessionKey="12345"):
curl -X POST http://127.0.0.1:18789/agent \\
  -d '{
    "sessionKey": "12345",
    "message": "More detail on what I asked earlier",
    "channel": "cli"
  }'
# → agent remembers BTC context from Telegram message`}</code></pre>

      <h2>Choosing sessionKey</h2>
      <p>
        The sessionKey identifies <em>you</em>, not the channel. Common patterns:
      </p>
      <ul>
        <li><strong>Telegram chat_id</strong> — natural per-user key</li>
        <li><strong>Slack user_id</strong> — same person across DM and channels</li>
        <li><strong>Your username</strong> — for CLI/VSCode (e.g. <code>process.env.USER</code>)</li>
        <li><strong>Workspace name</strong> — separate work vs personal threads</li>
      </ul>

      <h2>Storage</h2>
      <p>
        Sessions live in <code>~/.openvesper/workspace/sessions/&lt;safe-key&gt;.json</code> with file mode 0600. Each session holds:
      </p>
      <ul>
        <li>Session ID, sessionKey, active agent</li>
        <li>Last 200 messages (older auto-trimmed)</li>
        <li>Created/updated timestamps</li>
        <li>Free-form metadata</li>
      </ul>

      <p>
        Cached in-memory (LRU, max 100 active). Disk read on cold start.
      </p>

      <h2>Privacy</h2>
      <p>
        All session data stays on your machine. Nothing transmitted to OpenVesper
        (we have no servers). LLM calls go directly from your gateway to your
        chosen provider per their privacy policy.
      </p>

      <h2>Channel attribution</h2>
      <p>
        Each message records which channel it arrived through. Useful for debugging
        ("the user asked this from Telegram on phone, that's why response was short").
      </p>

      <h2>Source</h2>
      <p>
        Implementation: <code>apps/gateway/src/sessions.ts</code>.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/session">Sessions deep-dive (fork, branch, reset)</Link></li>
        <li><Link href="/docs/channels">Channels overview</Link></li>
        <li><Link href="/docs/channels/routing">Channel routing rules</Link></li>
      </ul>
    </div>
  );
}
