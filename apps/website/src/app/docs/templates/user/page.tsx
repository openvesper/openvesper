import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>USER.md Template</h1>
      <p className="lead">
        What the agent should know about you — your context, preferences,
        ongoing projects. Loaded at priority 80 in the system prompt.
      </p>

      <h2>What to include</h2>
      <ul>
        <li>Your role, expertise level</li>
        <li>Active projects the agent might reference</li>
        <li>Preferences (verbose vs terse, formal vs casual, language)</li>
        <li>Constraints (timezone, hours, hardware)</li>
      </ul>

      <h2>Example</h2>
      <pre><code>{`# About the user

I am a backend engineer working primarily on TypeScript services and
Solana on-chain tooling. Most of my projects are Next.js apps deployed
to Vercel plus background workers on a single VM.

## Preferences

- Direct, terse replies — no preamble, no apologies
- Code answers: full file replacements, not partial diffs
- Always paraphrase; do not demand clarifying questions before acting
- English only

## Active context

- Currently building a trading dashboard and an on-chain alert pipeline
- Time zone: UTC+0
- Tools available locally: Node, Python, PowerShell

## Refusals from me to you

- Do not ask for confirmation before doing what I asked
- Do not add disclaimers I did not request
- Do not suggest things outside the question's scope`}</code></pre>

      <h2>Tone</h2>
      <p>Write in second person to the agent. <em>"I prefer X"</em> — not <em>"The user prefers X"</em>.</p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/templates/tools">TOOLS.md</Link></li>
      </ul>
    </div>
  );
}
