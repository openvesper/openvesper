import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Context Engine</h1>
      <p className="lead">
        Builds the agent's system prompt from typed layers in a deterministic
        order. Each layer is independent and can be enabled, disabled, or
        modified by hooks.
      </p>

      <h2>The 10 layers</h2>
      <p>Top to bottom in the final prompt:</p>

      <table>
        <thead><tr><th>#</th><th>Layer</th><th>Source</th><th>Priority</th></tr></thead>
        <tbody>
          <tr><td>1</td><td><code>bootstrap</code></td><td>Date, timezone, agent name</td><td>100</td></tr>
          <tr><td>2</td><td><code>persona</code></td><td><code>SOUL.md</code></td><td>90</td></tr>
          <tr><td>3</td><td><code>user</code></td><td><code>USER.md</code></td><td>80</td></tr>
          <tr><td>4</td><td><code>identity</code></td><td><code>IDENTITY.md</code></td><td>70</td></tr>
          <tr><td>5</td><td><code>tools</code></td><td><code>TOOLS.md</code></td><td>60</td></tr>
          <tr><td>6</td><td><code>skills</code></td><td>Skill descriptions</td><td>50</td></tr>
          <tr><td>7</td><td><code>memory</code></td><td>Active memory entries</td><td>40</td></tr>
          <tr><td>8</td><td><code>commitments</code></td><td>Open agent promises</td><td>30</td></tr>
          <tr><td>9</td><td><code>standing</code></td><td>User's standing orders</td><td>20</td></tr>
          <tr><td>10</td><td><code>project</code></td><td><code>AGENTS.md</code> (walks up dirs)</td><td>10</td></tr>
        </tbody>
      </table>

      <h2>Inspecting the built context</h2>
      <p>To see what the agent will actually see:</p>

      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/bags-hunter/context \\
  -d '{
    "sessionKey": "user-123",
    "recentMessages": [{"content": "what tokens look good today"}]
  }'`}</code></pre>

      <p>Returns the assembled prompt + a per-layer breakdown (name, priority, char count).</p>

      <h2>Excluding layers</h2>
      <p>For minimal prompts (testing, debugging), exclude layers:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/auto/context \\
  -d '{
    "sessionKey": "user-123",
    "excludeLayers": ["memory", "commitments", "standing"]
  }'`}</code></pre>

      <h2>Resolution order — user vs bundled</h2>
      <p>
        For each agent, the engine first checks{" "}
        <code>~/.openvesper/agents/&lt;mode&gt;/</code>. If the agent is
        installed there, files load from user dir. Otherwise from bundled{" "}
        <code>.agents/&lt;mode&gt;/</code>.
      </p>

      <h2>Project AGENTS.md walk</h2>
      <p>
        The engine walks up to 5 directory levels from <code>process.cwd()</code>{" "}
        looking for <code>AGENTS.md</code>. The first one found becomes the
        project layer. This lets projects inject team
        conventions automatically.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/context-engine.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/templates">Markdown templates</Link></li>
        <li><Link href="/docs/concepts/memory">Memory Engine</Link></li>
      </ul>
    </div>
  );
}
