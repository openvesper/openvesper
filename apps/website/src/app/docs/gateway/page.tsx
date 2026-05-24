import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Gateway</h1>
      <p className="lead">
        The Gateway is the persistent process that keeps OpenVesper running.
        Hub-and-spoke architecture: every channel routes through one place,
        with shared sessions, proactive heartbeats, command queue, compaction,
        routing, and delegation.
      </p>

      <h2>Why a persistent process?</h2>
      <ul>
        <li>One session shared across CLI, Telegram, VSCode (channel docking)</li>
        <li>Heartbeats run on schedule — agents message you proactively</li>
        <li>Steer in-flight runs by sending follow-up messages</li>
        <li>Compact long conversations automatically</li>
        <li>Async API for long-running tasks (runId + wait/abort)</li>
        <li>WebSocket transport for real-time streaming</li>
        <li>OAuth flows handled locally with PKCE</li>
      </ul>

      <h2>Starting the gateway</h2>

      <p>Foreground (logs to your terminal):</p>
      <pre><code>{`vesper gateway start`}</code></pre>

      <p>Detached background:</p>
      <pre><code>{`vesper gateway start --detach
vesper gateway status
vesper gateway logs --lines 100
vesper gateway stop`}</code></pre>

      <h2>Channel commands</h2>
      <p>
        Any message starting with <code>/</code> is intercepted before reaching
        the LLM:
      </p>
      <table>
        <thead><tr><th>Command</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td><code>/new</code></td><td>Start a fresh session</td></tr>
          <tr><td><code>/reset</code></td><td>Clear current session messages</td></tr>
          <tr><td><code>/status</code></td><td>Show session info, running run, queue state</td></tr>
          <tr><td><code>/agent &lt;mode&gt;</code></td><td>Switch active agent</td></tr>
          <tr><td><code>/queue &lt;mode&gt;</code></td><td>Set queue mode: steer / followup / collect / default</td></tr>
          <tr><td><code>/compact [hint]</code></td><td>Summarize old messages to free context</td></tr>
          <tr><td><code>/stop</code></td><td>Abort the current run</td></tr>
          <tr><td><code>/help</code></td><td>List available commands</td></tr>
        </tbody>
      </table>

      <h2>Queue modes (handling mid-run messages)</h2>
      <p>
        What happens when you send a new message while the agent is busy?
        Three modes:
      </p>
      <ul>
        <li>
          <strong><code>steer</code></strong> (default) — inject into the active run
          after current tool calls, before the next LLM call. Use this for
          "wait, actually do X instead".
        </li>
        <li>
          <strong><code>followup</code></strong> — queue the message, deliver as a
          new turn after current ends. Debounce 1s by default.
        </li>
        <li>
          <strong><code>collect</code></strong> — batch multiple queued messages
          and deliver as one structured prompt.
        </li>
      </ul>

      <h2>Async API</h2>
      <p>
        For long-running tasks, fire-and-forget then check back:
      </p>
      <pre><code>{`# Returns immediately with { runId, acceptedAt }
curl -X POST http://127.0.0.1:18789/agent/async \\
  -d '{"sessionKey":"u1", "message":"analyze 100 tokens"}'

# Later — block until done (timeout 5 min default)
curl -X POST http://127.0.0.1:18789/agent/run/r_xyz/wait

# Or cancel
curl -X POST http://127.0.0.1:18789/agent/run/r_xyz/abort`}</code></pre>

      <h2>Compaction</h2>
      <p>
        When the context window fills up, OpenVesper compacts the conversation:
        older messages are summarized into a single system message, recent
        messages kept verbatim. Trigger manually with <code>/compact</code> or
        via API:
      </p>
      <pre><code>{`# Check token usage
curl http://127.0.0.1:18789/sessions/u1/tokens

# Compact (keep last 10 messages verbatim)
curl -X POST http://127.0.0.1:18789/sessions/u1/compact \\
  -d '{"keepRecent": 10}'`}</code></pre>

      <h2>Multi-agent routing</h2>
      <p>
        The router examines a message and picks the best specialist agent:
      </p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/route \\
  -d '{"message":"check this Solana token for rugs"}'
# → { "mode": "bags-hunter", "score": 12, "reason": "matched: solana, token, rug" }`}</code></pre>

      <h2>Delegation</h2>
      <p>
        One agent can sub-query another without changing your active agent:
      </p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/delegate \\
  -d '{
    "parentSessionKey": "u1",
    "delegateAgent": "code-reviewer",
    "query": "review this snippet for security issues"
  }'`}</code></pre>

      <p>Or hand off the entire session:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/handoff \\
  -d '{"sessionKey":"u1", "newAgent":"defi-strategist"}'`}</code></pre>

      <h2>OAuth (local PKCE flow)</h2>
      <p>
        Plugins that need Gmail, Calendar, GitHub access can authorize via
        OAuth. The entire flow runs on your machine — tokens never leave it.
      </p>
      <pre><code>{`# Authorize Google (Gmail + Calendar)
vesper oauth login google \\
  --client-id YOUR_GOOGLE_CLIENT_ID \\
  --client-secret YOUR_SECRET

# A URL prints — open it, authorize, browser redirects to localhost:53174,
# tokens save to ~/.openvesper/tokens/google.json (mode 0600).

# List authorized providers
vesper oauth list

# Revoke
vesper oauth logout google`}</code></pre>

      <p>
        Built-in provider templates: <code>google</code>, <code>github</code>,{" "}
        <code>slack</code>. You bring your own Client ID — register an OAuth
        app with the provider.
      </p>

      <h2>Heartbeat daemon</h2>
      <p>
        Scans <code>.agents/</code> for <code>HEARTBEAT.md</code> files with{" "}
        <code>enabled: true</code>. On schedule, the gateway wakes each agent
        with its checklist. If the agent has work, it runs tools and returns a
        reply (delivered via the configured channel). If not, it returns{" "}
        <code>HEARTBEAT_OK</code> — gateway silently suppresses.
      </p>

      <h2>Endpoints</h2>
      <p>
        Bound to <code>127.0.0.1:18789</code> by default. Never exposed publicly.
      </p>

      <h3>Agent</h3>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>POST</td><td><code>/agent</code></td><td>Sync run, returns full reply</td></tr>
          <tr><td>POST</td><td><code>/agent/async</code></td><td>Async run, returns runId</td></tr>
          <tr><td>POST</td><td><code>/agent/stream</code></td><td>SSE streaming reply</td></tr>
          <tr><td>GET</td><td><code>/agent/run/:runId</code></td><td>Run status</td></tr>
          <tr><td>POST</td><td><code>/agent/run/:runId/wait</code></td><td>Block until complete</td></tr>
          <tr><td>POST</td><td><code>/agent/run/:runId/abort</code></td><td>Cancel</td></tr>
          <tr><td>POST</td><td><code>/agent/route</code></td><td>Routing decision</td></tr>
          <tr><td>POST</td><td><code>/agent/delegate</code></td><td>Sub-query another agent</td></tr>
          <tr><td>POST</td><td><code>/agent/handoff</code></td><td>Transfer session</td></tr>
        </tbody>
      </table>

      <h3>Sessions</h3>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/sessions</code></td></tr>
          <tr><td>GET</td><td><code>/sessions/:key</code></td></tr>
          <tr><td>POST</td><td><code>/sessions/:key/reset</code></td></tr>
          <tr><td>POST</td><td><code>/sessions/:key/agent</code></td></tr>
          <tr><td>POST</td><td><code>/sessions/:key/compact</code></td></tr>
          <tr><td>GET</td><td><code>/sessions/:key/tokens</code></td></tr>
          <tr><td>GET</td><td><code>/sessions/:key/queue</code></td></tr>
          <tr><td>POST</td><td><code>/sessions/:key/queue/mode</code></td></tr>
        </tbody>
      </table>

      <h3>OAuth & Heartbeat</h3>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>POST</td><td><code>/oauth/start</code></td></tr>
          <tr><td>GET</td><td><code>/oauth/tokens</code></td></tr>
          <tr><td>GET</td><td><code>/oauth/tokens/:provider</code></td></tr>
          <tr><td>DELETE</td><td><code>/oauth/tokens/:provider</code></td></tr>
          <tr><td>GET</td><td><code>/heartbeat/status</code></td></tr>
          <tr><td>POST</td><td><code>/heartbeat/reload</code></td></tr>
          <tr><td>GET</td><td><code>/lanes</code></td></tr>
          <tr><td>GET</td><td><code>/health</code></td></tr>
          <tr><td>WS</td><td><code>/ws</code></td></tr>
        </tbody>
      </table>

      <h2>Security</h2>
      <ul>
        <li><strong>Loopback bind default.</strong> Gateway listens on <code>127.0.0.1</code> only.</li>
        <li><strong>No remote access without explicit setup.</strong> Use Tailscale, SSH tunnel, or Cloudflare Tunnel.</li>
        <li><strong>Session files mode 0600.</strong> Only your user can read them.</li>
        <li><strong>OAuth tokens mode 0600.</strong> Stored at <code>~/.openvesper/tokens/</code>.</li>
        <li><strong>Tool permissions still enforced.</strong> Mutating tools audit or prompt.</li>
        <li><strong>Zero data retention.</strong> No OpenVesper servers. Nothing leaves your machine.</li>
      </ul>

      <h2>Hooks (extensibility)</h2>
      <p>
        8 lifecycle events: <code>agent:bootstrap</code>,{" "}
        <code>agent:tool-call</code>, <code>agent:tool-result</code>,{" "}
        <code>agent:complete</code>, <code>agent:error</code>,{" "}
        <code>agent:queued</code>, <code>command:new</code>,{" "}
        <code>command:reset</code>.
      </p>
      <pre><code>{`import { hooks } from "@openvesper/gateway/hooks";

hooks.register("agent:bootstrap", async (ctx) => {
  ctx.systemPrompt += "\\n## Local time\\n" + new Date().toISOString();
  return ctx;
});`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/automation/cron-jobs">Cron jobs</Link></li>
        <li><Link href="/docs/channels">Channels</Link></li>
        <li><Link href="/docs/gateway/security">Security policy</Link></li>
      </ul>
    </div>
  );
}
