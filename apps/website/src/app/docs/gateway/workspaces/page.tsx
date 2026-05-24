import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Workspaces</h1>
      <p className="lead">
        Run multiple gateways on the same machine for isolation between
        contexts (work vs personal, project A vs project B). Each gets its own
        port, agents dir, config, and PID file.
      </p>

      <h2>Why?</h2>
      <ul>
        <li>Separate sessions, memory, tasks per workspace</li>
        <li>Different default agents, OAuth tokens, standing orders</li>
        <li>Independent gateway lifecycle — restart one without touching others</li>
      </ul>

      <h2>Creating</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/workspaces \\
  -d '{"name": "personal"}'
# {
#   "name": "personal",
#   "port": 18790,
#   "agentsDir": "~/.openvesper/workspaces/personal/agents",
#   "configDir": "~/.openvesper/workspaces/personal",
#   "pidFile": "~/.openvesper/workspaces/personal/gateway.pid"
# }`}</code></pre>

      <p>Each new workspace gets the next free port starting from 18789.</p>

      <h2>Starting a gateway for a workspace</h2>
      <pre><code>{`curl http://127.0.0.1:18789/workspaces/personal/env
# Returns env vars to use:
# {
#   "OPENVESPER_GATEWAY_PORT": "18790",
#   "OPENVESPER_AGENTS_DIR": "...",
#   "OPENVESPER_CONFIG_DIR": "...",
#   "OPENVESPER_PID_FILE": "..."
# }

# Then start gateway with those env vars
OPENVESPER_GATEWAY_PORT=18790 \\
OPENVESPER_AGENTS_DIR=~/.openvesper/workspaces/personal/agents \\
vesper gateway start --detach`}</code></pre>

      <h2>Listing & removing</h2>
      <pre><code>{`curl http://127.0.0.1:18789/workspaces
curl -X DELETE http://127.0.0.1:18789/workspaces/personal`}</code></pre>

      <h2>Storage</h2>
      <p>
        Workspace registry: <code>~/.openvesper/workspaces.json</code> (mode 0600).<br/>
        Per-workspace data: <code>~/.openvesper/workspaces/&lt;name&gt;/</code>
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/workspaces.ts</code></p>
    </div>
  );
}
