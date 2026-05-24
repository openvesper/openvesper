import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Slash Commands</h1>
      <p className="lead">
        Messages starting with <code>/</code> are intercepted before reaching
        the LLM. Use them inline from any channel — CLI, Telegram, Slack, Discord, WebSocket.
      </p>

      <h2>Available commands</h2>
      <table>
        <thead><tr><th>Command</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td><code>/help</code></td><td>List commands</td></tr>
          <tr><td><code>/new</code></td><td>Start a fresh session (resets messages)</td></tr>
          <tr><td><code>/reset</code></td><td>Clear current session messages</td></tr>
          <tr><td><code>/status</code></td><td>Show session info: agent, message count, run state, queue mode</td></tr>
          <tr><td><code>/agent &lt;mode&gt;</code></td><td>Switch active agent for this session</td></tr>
          <tr><td><code>/queue &lt;mode&gt;</code></td><td>Set queue mode: <code>steer</code> / <code>followup</code> / <code>collect</code> / <code>default</code></td></tr>
          <tr><td><code>/compact [hint]</code></td><td>Summarize old messages to free context</td></tr>
          <tr><td><code>/stop</code></td><td>Abort the current run</td></tr>
        </tbody>
      </table>

      <h2>From the CLI</h2>
      <pre><code>{`vesper -q "/status"
vesper -q "/agent bags-hunter"
vesper -q "/reset"`}</code></pre>

      <h2>From Telegram</h2>
      <p>Just send the message as text. The bot relays to the gateway which intercepts.</p>

      <h2>From the API</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent \\
  -d '{"sessionKey":"user-123","message":"/status","channel":"rest"}'

# → {"reply":"🌒 Session status\\n\\n   Session: ...","status":"command"}`}</code></pre>

      <h2>How interception works</h2>
      <p>
        The first thing the agent loop does (after intake) is call{" "}
        <code>tryHandleCommand()</code>. If the message starts with <code>/</code>{" "}
        and matches a known command, the handler returns a reply directly —
        skipping LLM, lane acquisition, and tools entirely.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/commands.ts</code></p>
    </div>
  );
}
