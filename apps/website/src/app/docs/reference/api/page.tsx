import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Gateway API Reference</h1>
      <p className="lead">
        Full HTTP + WebSocket surface of the OpenVesper gateway. Default bind:
        <code>127.0.0.1:18789</code>.
      </p>

      <h2>Agent execution</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>POST</td><td><code>/agent</code></td><td>Sync run, returns full reply</td></tr>
          <tr><td>POST</td><td><code>/agent/async</code></td><td>Async run, returns <code>{`{runId, acceptedAt}`}</code></td></tr>
          <tr><td>POST</td><td><code>/agent/stream</code></td><td>SSE streaming</td></tr>
          <tr><td>GET</td><td><code>/agent/run/:runId</code></td><td>Run status</td></tr>
          <tr><td>POST</td><td><code>/agent/run/:runId/wait</code></td><td>Block until done</td></tr>
          <tr><td>POST</td><td><code>/agent/run/:runId/abort</code></td><td>Cancel</td></tr>
        </tbody>
      </table>

      <h2>Routing & delegation</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>POST</td><td><code>/agent/route</code></td></tr>
          <tr><td>GET</td><td><code>/agent/routes</code></td></tr>
          <tr><td>POST</td><td><code>/agent/delegate</code></td></tr>
          <tr><td>POST</td><td><code>/agent/handoff</code></td></tr>
          <tr><td>POST</td><td><code>/agent/subagents</code></td></tr>
          <tr><td>POST</td><td><code>/agent/:agent/context</code></td></tr>
        </tbody>
      </table>

      <h2>Sessions</h2>
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
          <tr><td>POST</td><td><code>/sessions/:key/fork</code></td></tr>
          <tr><td>POST</td><td><code>/sessions/:key/branch</code></td></tr>
        </tbody>
      </table>

      <h2>Tasks, commitments, standing orders, approvals</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>GET/POST</td><td><code>/tasks</code></td></tr>
          <tr><td>DELETE</td><td><code>/tasks/:id</code></td></tr>
          <tr><td>GET/POST</td><td><code>/standing-orders</code></td></tr>
          <tr><td>DELETE/toggle</td><td><code>/standing-orders/:id</code></td></tr>
          <tr><td>GET/POST</td><td><code>/commitments</code></td></tr>
          <tr><td>POST</td><td><code>/commitments/:id/fulfill</code></td></tr>
          <tr><td>POST</td><td><code>/commitments/:id/cancel</code></td></tr>
          <tr><td>GET</td><td><code>/approvals/pending</code></td></tr>
          <tr><td>POST</td><td><code>/approvals/:id/decide</code></td></tr>
          <tr><td>GET/POST</td><td><code>/approvals/rules</code></td></tr>
          <tr><td>DELETE</td><td><code>/approvals/rules/:index</code></td></tr>
        </tbody>
      </table>

      <h2>Memory</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>GET/POST</td><td><code>/memory/:agent</code></td></tr>
          <tr><td>POST</td><td><code>/memory/:agent/search</code></td></tr>
          <tr><td>DELETE</td><td><code>/memory/:agent/:id</code></td></tr>
          <tr><td>DELETE</td><td><code>/memory/:agent</code> (clear all)</td></tr>
        </tbody>
      </table>

      <h2>OAuth, audit, diagnostics</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>POST</td><td><code>/oauth/start</code></td></tr>
          <tr><td>GET</td><td><code>/oauth/tokens</code></td></tr>
          <tr><td>GET</td><td><code>/oauth/tokens/:provider</code></td></tr>
          <tr><td>DELETE</td><td><code>/oauth/tokens/:provider</code></td></tr>
          <tr><td>GET</td><td><code>/audit</code></td></tr>
          <tr><td>GET</td><td><code>/audit/stats</code></td></tr>
          <tr><td>GET</td><td><code>/audit/dates</code></td></tr>
          <tr><td>GET</td><td><code>/diag</code></td></tr>
          <tr><td>POST</td><td><code>/diag/export</code></td></tr>
        </tbody>
      </table>

      <h2>Channels, workspaces, remote</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>GET/POST</td><td><code>/channel-routes</code></td></tr>
          <tr><td>POST</td><td><code>/channel-routes/resolve</code></td></tr>
          <tr><td>DELETE</td><td><code>/channel-routes/:index</code></td></tr>
          <tr><td>GET/POST</td><td><code>/access</code></td></tr>
          <tr><td>POST</td><td><code>/access/check</code></td></tr>
          <tr><td>DELETE</td><td><code>/access/:index</code></td></tr>
          <tr><td>POST</td><td><code>/remote/instructions</code></td></tr>
          <tr><td>GET/POST</td><td><code>/workspaces</code></td></tr>
          <tr><td>DELETE</td><td><code>/workspaces/:name</code></td></tr>
          <tr><td>GET</td><td><code>/workspaces/:name/env</code></td></tr>
        </tbody>
      </table>

      <h2>Heartbeat & health</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/heartbeat/status</code></td></tr>
          <tr><td>POST</td><td><code>/heartbeat/reload</code></td></tr>
          <tr><td>GET</td><td><code>/lanes</code></td></tr>
          <tr><td>GET</td><td><code>/health</code></td></tr>
          <tr><td>WS</td><td><code>/ws</code></td></tr>
        </tbody>
      </table>
    </div>
  );
}
