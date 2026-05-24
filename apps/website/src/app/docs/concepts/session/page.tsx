import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Sessions</h1>
      <p className="lead">
        A session is one conversation thread, identified by{" "}
        <code>sessionKey</code>. It can span channels, fork into branches, and
        survive gateway restarts.
      </p>

      <h2>Anatomy</h2>
      <pre><code>{`{
  "id": "s_173...",
  "sessionKey": "telegram:12345",
  "agent": "bags-hunter",
  "messages": [
    { "role": "user", "content": "...", "timestamp": ..., "channel": "telegram" },
    { "role": "assistant", "content": "...", "timestamp": ..., "channel": "telegram" }
  ],
  "createdAt": ...,
  "updatedAt": ...,
  "metadata": { ... }
}`}</code></pre>

      <h2>Storage</h2>
      <p>
        Each session is one JSON file at{" "}
        <code>~/.openvesper/workspace/sessions/&lt;safe-key&gt;.json</code>{" "}
        with file mode 0600. Last 200 messages kept; older auto-trimmed.
      </p>

      <h2>Reset</h2>
      <pre><code>{`# From inside chat
/reset

# Or API
curl -X POST http://127.0.0.1:18789/sessions/user-123/reset`}</code></pre>

      <h2>Switch agent</h2>
      <pre><code>{`# From inside chat
/agent defi-strategist

# Or API
curl -X POST http://127.0.0.1:18789/sessions/user-123/agent \\
  -d '{"agent":"defi-strategist"}'`}</code></pre>

      <h2>Fork — duplicate at current point</h2>
      <p>
        Create a new session with the same message history. Both can diverge
        from here independently:
      </p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/sessions/user-123/fork \\
  -d '{"newSessionKey": "user-123-experiment-a"}'`}</code></pre>

      <h2>Branch — fork at a specific message</h2>
      <p>Create a new session with only messages 0..N from the parent:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/sessions/user-123/branch \\
  -d '{"newSessionKey": "user-123-rewind", "messageIndex": 5}'`}</code></pre>
      <p>
        Useful when you want to "rewind" — try a different path from message N
        without losing the original.
      </p>

      <h2>Token budget check</h2>
      <pre><code>{`curl http://127.0.0.1:18789/sessions/user-123/tokens
# { "messageCount": 87, "estimatedTokens": 24530, "shouldAutoCompact": false }`}</code></pre>

      <h2>Privacy</h2>
      <p>All session data on your machine. Not transmitted. See <Link href="/docs/gateway/security">Security policy</Link>.</p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/channel-docking">Channel Docking</Link></li>
        <li><Link href="/docs/concepts/compaction">Compaction</Link></li>
        <li><Link href="/docs/concepts/command-queue">Command Queue</Link></li>
      </ul>
    </div>
  );
}
