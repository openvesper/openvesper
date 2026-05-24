import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>🔨 Skill Workshop</h1>
      <p className="lead">
        An agent that helps you write, refine, and test{" "}
        <code>SKILL.md</code> files for other agents.
      </p>

      <h2>What it does</h2>
      <ul>
        <li>Scaffolds a new <code>SKILL.md</code> from a one-line description</li>
        <li>Critiques existing skills (descriptions, tool references, structure)</li>
        <li>Suggests improvements to make skill triggers more reliable</li>
        <li>Helps write good output examples</li>
      </ul>

      <h2>What it doesn't do</h2>
      <ul>
        <li>Writes content for you to copy — never modifies your files automatically</li>
        <li>Invents tools that don't exist — checks the plugin registry first</li>
        <li>Writes skills that bypass safety (transactions, key exfiltration)</li>
      </ul>

      <h2>Usage</h2>
      <pre><code>{`# Run one-off
vesper agent run skill-workshop "Write me a skill for checking Solana token holders"

# Or install + set default
vesper agent install skill-workshop
vesper agent start skill-workshop
vesper -q "Critique this SKILL.md: ..."`}</code></pre>

      <h2>Built-in skills</h2>
      <ul>
        <li><code>scaffold-skill</code> — generate new <code>SKILL.md</code></li>
        <li><code>improve-skill</code> — review and suggest edits</li>
      </ul>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/templates/skill">SKILL.md template</Link></li>
        <li><Link href="/docs/tools/skills">Skills overview</Link></li>
      </ul>
    </div>
  );
}
