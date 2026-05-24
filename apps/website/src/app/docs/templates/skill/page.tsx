import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>SKILL.md Template</h1>
      <p className="lead">
        Specialized instruction sets the agent loads when relevant. Sit at{" "}
        <code>.agents/&lt;mode&gt;/skills/&lt;skill-name&gt;/SKILL.md</code>.
      </p>

      <h2>Frontmatter</h2>
      <pre><code>{`---
name: rug-check-deep
description: |
  Use when user asks "is this token a rug", "vet this contract",
  "check this Bags.fm token for safety", or any safety/rug evaluation
  question. Runs a 4-stage rug check.
---`}</code></pre>
      <p>
        The <code>description</code> is what the runtime keyword-matches
        against. Be specific — include the trigger phrases users say.
      </p>

      <h2>Body structure</h2>
      <ol>
        <li><strong>Step-by-step flow</strong> — numbered, concrete</li>
        <li><strong>Output format</strong> — example showing the response shape</li>
        <li><strong>Anti-patterns</strong> — what to avoid</li>
        <li><strong>Closing note</strong> — disclaimers ("not financial advice")</li>
      </ol>

      <h2>Example</h2>
      <pre><code>{`# Deep Rug Check

Run when a user asks if a Bags.fm token is safe.

## Steps

1. \`bags_token_score\` → composite score
2. \`bags_holder_distribution\` → top 10 holders %
3. \`bags_lp_status\` → LP locked? Until when?
4. \`bags_mint_authority\` → mint/freeze authority status

## Output

\`\`\`
🎒 Rug check: <token>

Score:    <0-100>
Holders:  Top 10 = <X>%
LP:       <locked until DATE | UNLOCKED ⚠>
Mint:     <revoked | active ⚠>

Verdict: <SAFE | CAUTION | RUG>
\`\`\`

## Anti-patterns

- Don't tell user it's "safe" — only describe risk factors
- Don't predict price
- Always: "Not financial advice"`}</code></pre>

      <h2>Scaffolding</h2>
      <p>Use the skill-workshop agent to scaffold new skills:</p>
      <pre><code>{`vesper agent run skill-workshop "Write a skill for X"`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/tools/skills">Skills overview</Link></li>
        <li><Link href="/docs/agents/skill-workshop">Skill Workshop agent</Link></li>
      </ul>
    </div>
  );
}
