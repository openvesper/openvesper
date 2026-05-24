import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>IDENTITY.md Template</h1>
      <p className="lead">
        Metadata about the agent: name, mode, icon, version, tags. Used by the
        agent list, routing, and registry.
      </p>

      <h2>Required fields</h2>
      <pre><code>{`# Identity

- **Name**: Bags Hunter
- **Mode**: \`bags-hunter\`
- **Icon**: 🎒
- **Version**: 1.0.0

## What I am

Solana memecoin specialist for Bags.fm. Evaluates tokens with rug
heuristics before any position-level guidance.

## Tags

solana, memecoin, bags.fm, rug-check, contract-analysis, holders

## Recommended LLM

- **Anthropic Claude** — best reasoning for ambiguous safety calls
- **Groq Llama** — fastest for batched scoring`}</code></pre>

      <h2>Why tags matter</h2>
      <p>
        The <Link href="/docs/concepts/multi-agent">multi-agent router</Link>{" "}
        scores incoming messages against each agent's tags. <strong>+5 per
        exact tag match.</strong> So put your top trigger words here.
      </p>

      <h2>Mode naming</h2>
      <p>Must be lowercase, hyphenated, alphanumeric:</p>
      <ul>
        <li>✓ <code>bags-hunter</code>, <code>defi-strategist</code>, <code>my-coach</code></li>
        <li>✗ <code>BagsHunter</code>, <code>defi_strategist</code>, <code>my coach</code></li>
      </ul>

      <h2>Source</h2>
      <p>Parsed in: <code>apps/gateway/src/router.ts</code>, <code>apps/cli/src/commands/agent.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/templates/soul">SOUL.md</Link></li>
        <li><Link href="/docs/concepts/multi-agent">Multi-agent Routing</Link></li>
      </ul>
    </div>
  );
}
