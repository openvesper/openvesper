import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Command Queue</h1>
      <p className="lead">
        What happens when you send a new message while an agent is already
        running? Three modes: <strong>steer</strong>, <strong>followup</strong>,
        <strong>collect</strong>.
      </p>

      <h2>Why this matters</h2>
      <p>
        Without queuing, parallel messages cause race conditions: two agent runs
        overwrite each other's session state. Without steering, you can't
        interrupt a long-running task to redirect it. The Command Queue solves both.
      </p>

      <h2>The three modes</h2>

      <h3><code>steer</code> (default)</h3>
      <p>
        New messages inject into the active run. Delivered to the LLM after
        current tool calls finish but before the next LLM call.
      </p>
      <p>
        <strong>Use when:</strong> you want "wait, do X instead" semantics.
        Most chat-like interactions benefit from this.
      </p>

      <h3><code>followup</code></h3>
      <p>
        Don't steer. Queue messages for a new turn after the current one ends.
        Default debounce: 1 second (multiple rapid messages coalesce).
      </p>
      <p>
        <strong>Use when:</strong> the running task is critical and shouldn't
        be interrupted. Followups happen after, naturally.
      </p>

      <h3><code>collect</code></h3>
      <p>
        Don't steer. Hold messages until run ends, then format them as a single
        structured prompt: "you said A, then B, then C". Useful when batching
        related items.
      </p>

      <h2>Setting mode per session</h2>
      <p>From inside a chat:</p>
      <pre><code>{`/queue steer       # default
/queue followup
/queue collect
/queue default     # reset`}</code></pre>

      <p>Or via API:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/sessions/user-123/queue/mode \\
  -d '{"mode": "followup", "debounceMs": 2000, "cap": 30}'`}</code></pre>

      <h2>Overflow policy</h2>
      <p>
        Each session's queue has a cap (default 20). When exceeded, the
        <code>drop</code> policy decides:
      </p>
      <ul>
        <li><code>summarize</code> (default) — drop oldest, prepend "[Summary of N dropped]" note when draining</li>
        <li><code>oldest</code> — drop oldest silently</li>
        <li><code>newest</code> — drop incoming</li>
      </ul>

      <h2>Session Lane</h2>
      <p>
        Underneath the queue is the Session Lane — a per-session mutex.
        Lane manager also enforces a global concurrency cap (default 4 parallel runs across all sessions). Override:
      </p>
      <pre><code>{`OPENVESPER_MAX_CONCURRENT=8 vesper gateway start`}</code></pre>

      <h2>Source</h2>
      <p>
        Implementation: <code>apps/gateway/src/queue.ts</code> and{" "}
        <code>apps/gateway/src/session-lane.ts</code>.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/agent-loop">Agent Loop</Link></li>
        <li><Link href="/docs/gateway/slash-commands">Slash Commands</Link></li>
      </ul>
    </div>
  );
}
