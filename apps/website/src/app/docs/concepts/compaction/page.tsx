import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Compaction</h1>
      <p className="lead">
        When the conversation grows too long for the model's context window,
        OpenVesper summarizes older messages into a single system note. Saves
        tokens, keeps the conversation alive.
      </p>

      <h2>Triggers</h2>
      <ul>
        <li><strong>Manual</strong> — user types <code>/compact</code> or hits <code>POST /sessions/:key/compact</code></li>
        <li><strong>Auto</strong> — <code>shouldAutoCompact()</code> exposes a flag when estimated tokens cross 80% of the budget; clients can call <code>/compact</code> when they see it set</li>
      </ul>

      <h2>How it works</h2>
      <ol>
        <li>Keep the most recent N messages verbatim (default: 10)</li>
        <li>Concatenate older messages into a transcript</li>
        <li>(If LLM provided) ask the model to summarize the transcript</li>
        <li>(Fallback) structural summary: "[Compacted N earlier messages, first user message: '...']"</li>
        <li>Replace old messages with a single <code>system</code>-role summary entry</li>
      </ol>

      <h2>Manual compaction</h2>
      <pre><code>{`# Inside a chat
/compact

# Or with a hint
/compact Focus on the trading decisions we discussed

# Or via API
curl -X POST http://127.0.0.1:18789/sessions/user-123/compact \\
  -d '{"keepRecent": 15, "instructions": "Preserve API key locations"}'`}</code></pre>

      <h2>Checking before you compact</h2>
      <pre><code>{`curl http://127.0.0.1:18789/sessions/user-123/tokens
# {
#   "sessionKey": "user-123",
#   "messageCount": 87,
#   "estimatedTokens": 24530,
#   "shouldAutoCompact": false
# }`}</code></pre>

      <p>
        Token estimate is approximate: 1 token ≈ 4 characters. Real provider counts vary.
      </p>

      <h2>Memory flush (advanced)</h2>
      <p>
        Before compaction destroys detail, you can run a "memory flush" — a
        silent LLM turn that asks the agent to write durable notes to{" "}
        <code>MEMORY.md</code>. That way, key facts persist even after the
        original messages are summarized.
      </p>
      <p>
        See <Link href="/docs/concepts/memory">Memory Engine</Link> for the
        active memory system.
      </p>

      <h2>Source</h2>
      <p>
        Implementation: <code>apps/gateway/src/compaction.ts</code>,{" "}
        <code>apps/gateway/src/memory-flush.ts</code>.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/memory">Memory Engine</Link></li>
        <li><Link href="/docs/gateway/slash-commands">Slash Commands</Link></li>
      </ul>
    </div>
  );
}
