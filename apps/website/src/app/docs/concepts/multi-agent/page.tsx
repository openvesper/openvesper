import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Multi-agent Routing</h1>
      <p className="lead">
        Instead of always running the default agent, the router examines each
        message and picks the best specialist based on tag + keyword scoring.
      </p>

      <h2>Scoring</h2>
      <ul>
        <li><strong>+10</strong> if message contains the agent's mode name (e.g. "ask defi-strategist...")</li>
        <li><strong>+5</strong> per exact tag match (from <code>IDENTITY.md</code>)</li>
        <li><strong>+1</strong> per keyword match (name, description, tags as keywords)</li>
      </ul>
      <p>Threshold: score ≥ 2 to override current agent.</p>

      <h2>Querying the router</h2>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/agent/route \\
  -d '{"message": "is this Solana token a rug?"}'

# → {"mode":"bags-hunter","score":12,"reason":"matched: solana, token, rug"}`}</code></pre>

      <h2>Improving routing</h2>
      <p>Add tags to <code>IDENTITY.md</code>:</p>
      <pre><code>{`# bags-hunter/IDENTITY.md
## Tags

solana, memecoin, bags.fm, rug, contract, holders`}</code></pre>

      <h2>Auto-loading</h2>
      <p>On gateway start, the router scans bundled + user agent dirs. To reload after adding new agents:</p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/heartbeat/reload`}</code></pre>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/router.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/delegate">Delegate & Sub-agents</Link></li>
        <li><Link href="/docs/templates/identity">IDENTITY.md template</Link></li>
      </ul>
    </div>
  );
}
