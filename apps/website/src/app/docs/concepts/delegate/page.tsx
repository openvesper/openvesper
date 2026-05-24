import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Delegate & Sub-agents</h1>
      <p className="lead">
        One agent can call another. Two patterns: <strong>delegate</strong>{" "}
        (sub-query without losing your active agent) and <strong>handoff</strong>{" "}
        (transfer the whole session). <strong>Sub-agents</strong> run multiple
        agents in parallel.
      </p>

      <h2>Delegate — sub-query another specialist</h2>
      <p>Keeps your current agent active. Spawns a sub-session keyed by <code>parent::delegate::&lt;target&gt;</code>:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/delegate \\
  -d '{
    "parentSessionKey": "user-123",
    "delegateAgent": "code-reviewer",
    "query": "Review this snippet for race conditions"
  }'`}</code></pre>

      <h2>Handoff — transfer the conversation</h2>
      <p>Changes <code>session.agent</code> permanently. Future messages route to the new agent:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/handoff \\
  -d '{"sessionKey": "user-123", "newAgent": "defi-strategist"}'`}</code></pre>

      <h2>Sub-agents — parallel execution</h2>
      <p>Up to 10 agents in parallel, each with its own sub-session. Useful for second opinions:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/subagents \\
  -d '{
    "parentSessionKey": "user-123",
    "tasks": [
      {"agent": "bags-hunter", "query": "Is $XYZ a rug?"},
      {"agent": "defi-strategist", "query": "Is $XYZ overvalued?"},
      {"agent": "security-reviewer", "query": "Audit $XYZ contract"}
    ]
  }'`}</code></pre>
      <p>
        Returns an array of <code>{`{ agent, query, reply, durationMs, error? }`}</code>. Sub-agents share the global concurrency lane — they queue if all lanes busy.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/delegate.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/multi-agent">Multi-agent Routing</Link></li>
        <li><Link href="/docs/agents">Agent catalog</Link></li>
      </ul>
    </div>
  );
}
