import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Markdown Templates</h1>
      <p className="lead">
        Every OpenVesper agent is a directory of markdown files. No code, no
        compilation — just text the runtime reads.
      </p>

      <h2>Required files</h2>
      <table>
        <thead><tr><th>File</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><Link href="/docs/templates/soul">SOUL.md</Link></td><td>Persona, voice, refusals</td></tr>
          <tr><td><Link href="/docs/templates/identity">IDENTITY.md</Link></td><td>Name, mode, icon, tags, version</td></tr>
          <tr><td><Link href="/docs/templates/user">USER.md</Link></td><td>What the agent should know about you</td></tr>
          <tr><td><Link href="/docs/templates/tools">TOOLS.md</Link></td><td>Tool access policy</td></tr>
          <tr><td><Link href="/docs/templates/heartbeat">HEARTBEAT.md</Link></td><td>Scheduled checklist (optional, disabled by default)</td></tr>
          <tr><td><Link href="/docs/templates/memory">MEMORY.md</Link></td><td>Durable notes</td></tr>
          <tr><td><Link href="/docs/templates/skill">skills/&lt;name&gt;/SKILL.md</Link></td><td>Specialized instruction sets</td></tr>
        </tbody>
      </table>

      <h2>Scaffolding</h2>
      <p>Generate all six files at once:</p>
      <pre><code>{`vesper agent create my-new-agent`}</code></pre>
      <p>Creates <code>~/.openvesper/agents/my-new-agent/</code> with templates pre-filled.</p>

      <h2>Resolution order</h2>
      <p>
        For each file, the runtime first checks{" "}
        <code>~/.openvesper/agents/&lt;mode&gt;/</code>. If the agent is
        installed there (i.e. <code>SOUL.md</code> exists), all files load from
        the user dir. Otherwise from <code>.agents/&lt;mode&gt;/</code> (bundled).
      </p>
      <p>
        This lets you fork a bundled agent without modifying the source — just
        <code>vesper agent install &lt;mode&gt;</code> first, then edit freely.
      </p>
    </div>
  );
}
