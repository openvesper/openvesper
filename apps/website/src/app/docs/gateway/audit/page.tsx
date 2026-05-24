import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Audit Logs</h1>
      <p className="lead">
        Append-only record of tool calls, approval decisions, commitments,
        tasks, and other significant events. Rotated daily. Lives locally.
      </p>

      <h2>What gets logged</h2>
      <ul>
        <li><code>tool-call</code> / <code>tool-result</code></li>
        <li><code>approval</code> decisions</li>
        <li><code>commitment-created</code> / <code>commitment-fulfilled</code></li>
        <li><code>task-created</code> / <code>task-complete</code></li>
        <li><code>standing-order</code> create/remove/toggle/fired</li>
        <li><code>session-reset</code></li>
        <li><code>compaction</code></li>
        <li><code>agent-switch</code></li>
        <li><code>error</code></li>
      </ul>

      <h2>Reading</h2>
      <pre><code>{`# Last 100 entries
curl http://127.0.0.1:18789/audit?limit=100

# Specific date range
curl "http://127.0.0.1:18789/audit?from=2026-05-20&to=2026-05-21"

# Today's stats
curl http://127.0.0.1:18789/audit/stats
# {
#   "date": "2026-05-21",
#   "total": 342,
#   "byKind": {
#     "tool-call": 145,
#     "tool-result": 145,
#     "approval": 8,
#     "task-created": 12
#   }
# }

# Available dates
curl http://127.0.0.1:18789/audit/dates`}</code></pre>

      <h2>File layout</h2>
      <pre><code>{`~/.openvesper/audit/
├── 2026-05-19.jsonl   # mode 0600
├── 2026-05-20.jsonl
└── 2026-05-21.jsonl   # today, currently being appended`}</code></pre>

      <h2>JSONL entry format</h2>
      <pre><code>{`{
  "timestamp": 1737475200000,
  "isoTime": "2026-05-21T14:30:00.000Z",
  "event": {
    "kind": "tool-call",
    "sessionKey": "user-123",
    "agent": "bags-hunter",
    "tool": "bags_token_score",
    "input": {"address": "ABC..."},
    "permission": "read"
  }
}`}</code></pre>

      <h2>Privacy</h2>
      <p>
        Audit logs stay local. Useful for: debugging, security review,
        understanding what your agents did while you were away.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/audit.ts</code></p>
    </div>
  );
}
