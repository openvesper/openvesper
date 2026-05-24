import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Streaming</h1>
      <p className="lead">
        Stream agent replies as they generate. Available via SSE
        (<code>POST /agent/stream</code>) or WebSocket (<code>/ws</code>).
      </p>

      <h2>Event types</h2>
      <table>
        <thead><tr><th>Type</th><th>Fired when</th></tr></thead>
        <tbody>
          <tr><td><code>start</code></td><td>Run begins</td></tr>
          <tr><td><code>message_start</code></td><td>LLM starts generating</td></tr>
          <tr><td><code>block_start</code></td><td>A block (text / tool_use / thinking) begins</td></tr>
          <tr><td><code>token</code></td><td>Each text token</td></tr>
          <tr><td><code>thinking</code></td><td>Extended-thinking content (Anthropic, OpenAI o-series)</td></tr>
          <tr><td><code>tool-call</code></td><td>LLM decided to call a tool</td></tr>
          <tr><td><code>tool-result</code></td><td>Tool returned</td></tr>
          <tr><td><code>block_end</code></td><td>Current block finished</td></tr>
          <tr><td><code>message_end</code></td><td>LLM done, includes token usage</td></tr>
          <tr><td><code>done</code></td><td>Whole run complete, includes reply + durationMs</td></tr>
          <tr><td><code>error</code></td><td>Something failed</td></tr>
        </tbody>
      </table>

      <h2>SSE</h2>
      <pre><code>{`curl -N -X POST http://127.0.0.1:18789/agent/stream \\
  -H "Content-Type: application/json" \\
  -d '{"sessionKey": "user-123", "message": "Hello"}'

# data: {"type":"start","sessionId":"s_...","agent":"auto"}
# data: {"type":"token","text":"Hi"}
# data: {"type":"token","text":" there"}
# data: {"type":"done","reply":"Hi there!","durationMs":1240}`}</code></pre>

      <h2>WebSocket</h2>
      <pre><code>{`const ws = new WebSocket("ws://127.0.0.1:18789/ws");
ws.onopen = () => {
  ws.send(JSON.stringify({type:"register",sessionKey:"u1",channel:"web"}));
  ws.send(JSON.stringify({type:"message",sessionKey:"u1",message:"Hi"}));
};
ws.onmessage = (e) => {
  const event = JSON.parse(e.data);
  if (event.type === "token") process.stdout.write(event.text);
};`}</code></pre>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/streaming.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/agent-loop">Agent Loop</Link></li>
        <li><Link href="/docs/reference/api">Gateway API reference</Link></li>
      </ul>
    </div>
  );
}
