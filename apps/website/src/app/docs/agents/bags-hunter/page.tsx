import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>🎒 Bags Hunter</h1>
      <p className="lead">
        <strong>Mode:</strong> <code>bags-hunter</code> · <strong>Category:</strong> Crypto / Solana Memecoins
      </p>

      <p>
        Solana memecoin specialist for the Bags.fm launchpad. Read-only research,
        0-100 scoring, multi-source rug checking, and portfolio review.
      </p>

      <p className="callout">
        🔒 <strong>Bags Hunter never asks for wallet private keys, seed phrases, or passwords.</strong>{" "}
        Every tool uses only public APIs and public on-chain data. The agent
        cannot execute trades or move funds.
      </p>

      <h2>Quick run</h2>
      <p>From the repo root, after <code>pnpm -r build</code>:</p>
      <pre><code>{`node apps/cli/dist/index.js -a bags-hunter -q "What's trending on Bags.fm right now?"`}</code></pre>

      <h2>Requirements</h2>

      <h3>LLM provider</h3>
      <p>Recommended: <strong>Anthropic Claude</strong> for nuanced risk explanations, <strong>Groq</strong> for fast iteration.</p>
      <ul>
        <li><code>ANTHROPIC_API_KEY</code> (or any other LLM provider key)</li>
        <li><code>HELIUS_API_KEY</code> — optional but recommended (enables holder distribution + creator analysis)</li>
      </ul>

      <h3>Plugins used</h3>
      <p>
        <code>bagsfm</code> (10 tools), <code>solana</code>, <code>whale</code>, <code>security</code>
      </p>

      <h3>Skills bundled</h3>
      <ul>
        <li><code>bags-hunter:scan-and-score</code> — discovery flow (trending → score → filter → present)</li>
        <li><code>bags-hunter:rug-check-deep</code> — 4-stage rug heuristic (liquidity, authority, holders, creator)</li>
        <li><code>bags-hunter:portfolio-review</code> — basket analysis with rebalancing suggestions</li>
      </ul>

      <h2>The 10 Bags.fm tools</h2>

      <table>
        <thead><tr><th>Tool</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>bags_search</code></td><td>Find tokens by name or symbol</td></tr>
          <tr><td><code>bags_trending</code></td><td>Hottest tokens in last 1h / 6h / 24h</td></tr>
          <tr><td><code>bags_new_launches</code></td><td>Fresh launches by max age (hours)</td></tr>
          <tr><td><code>bags_token_analysis</code></td><td>Deep 0-100 score with liquidity, buy/sell, volume, age</td></tr>
          <tr><td><code>bags_compare</code></td><td>1-5 tokens side-by-side ranking with composite score</td></tr>
          <tr><td><code>bags_rug_check</code></td><td>Multi-source rug heuristic (DexScreener + GoPlus)</td></tr>
          <tr><td><code>bags_holder_distribution</code></td><td>Top-20 holders + concentration risk levels</td></tr>
          <tr><td><code>bags_volume_pattern</code></td><td>5m / 1h / 24h momentum and pattern detection</td></tr>
          <tr><td><code>bags_creator_analysis</code></td><td>Creator wallet history — serial-launcher detection</td></tr>
          <tr><td><code>bags_portfolio_score</code></td><td>Basket (up to 10) diversification + performance</td></tr>
        </tbody>
      </table>

      <h2>Example sessions</h2>

      <h3>Discovery — what's hot right now</h3>
      <pre><code>{`node apps/cli/dist/index.js -a bags-hunter -q "What's trending on Bags.fm in the last 6 hours? Show top 5 with scores."`}</code></pre>
      <p>
        Agent runs <code>bags_trending</code>, applies first-pass filter, then{" "}
        <code>bags_token_analysis</code> on the survivors. Returns top 5 with scores,
        liquidity, buy/sell ratios, and risk flags.
      </p>

      <h3>Vet a specific token</h3>
      <pre><code>{`node apps/cli/dist/index.js -a bags-hunter -q "Vet this Bags.fm token: 7xKXtg2CW87d3a4...y3 — should I be worried?"`}</code></pre>
      <p>
        Agent runs the full <code>rug-check-deep</code> flow: liquidity health,
        mint/freeze authority, holder concentration, creator history. Returns a
        structured verdict.
      </p>

      <h3>Compare alternatives</h3>
      <pre><code>{`node apps/cli/dist/index.js -a bags-hunter -q "Compare these 3 Bags tokens for me: AAA111, BBB222, CCC333. Which has the best fundamentals?"`}</code></pre>
      <p>
        Uses <code>bags_compare</code> for the side-by-side composite score, then
        a quick rug check on the winner.
      </p>

      <h3>Portfolio review</h3>
      <pre><code>{`node apps/cli/dist/index.js -a bags-hunter -q "Review my Bags.fm basket: contracts AAA, BBB, CCC, DDD, EEE. Any rebalancing suggestions?"`}</code></pre>
      <p>
        Runs <code>bags_portfolio_score</code> + targeted rug checks on
        positions over 10% allocation. Reports diversification status and
        suggests trims for over-concentrated positions.
      </p>

      <h3>Watching for entry/exit signals</h3>
      <pre><code>{`node apps/cli/dist/index.js -a bags-hunter -q "Analyze volume patterns for contract XYZ — any buy or sell signals?"`}</code></pre>
      <p>
        Uses <code>bags_volume_pattern</code> to detect 5m bursts, cooling,
        accumulation, or distribution patterns.
      </p>

      <h2>Scheduled mode (optional)</h2>
      <p>
        Bags Hunter ships with a heartbeat checklist in{" "}
        <code>.agents/bags-hunter/HEARTBEAT.md</code>. Default schedule: daily at 9 AM.
        <strong> Disabled by default.</strong>
      </p>
      <p>To enable a daily Bags.fm scan delivered to Telegram:</p>
      <pre><code>{`# Edit .agents/bags-hunter/HEARTBEAT.md and set "enabled: true"

# Then register the cron job:
node apps/cli/dist/index.js cron add hb-bags-hunter \\
  --schedule "0 9 * * *" \\
  --agent bags-hunter \\
  --prompt "Run your heartbeat checklist for {{date}}" \\
  --deliver-to "telegram:@me"`}</code></pre>

      <h2>What Bags Hunter will NOT do</h2>
      <ul>
        <li>Ask for wallet private keys, seed phrases, or passwords (ever)</li>
        <li>Execute trades or move funds</li>
        <li>Promote or shill tokens</li>
        <li>Give financial advice — only data and patterns</li>
        <li>Make absolute predictions about price direction</li>
      </ul>

      <h2>Files</h2>
      <p>Agent files at <code>.agents/bags-hunter/</code>:</p>
      <ul>
        <li><code>SOUL.md</code> — persona and principles</li>
        <li><code>IDENTITY.md</code> — metadata, model preferences</li>
        <li><code>USER.md</code> — user context</li>
        <li><code>TOOLS.md</code> — tool policy</li>
        <li><code>HEARTBEAT.md</code> — scheduled checklist (opt-in)</li>
        <li><code>MEMORY.md</code> — long-term memory</li>
        <li><code>skills/scan-and-score/SKILL.md</code></li>
        <li><code>skills/rug-check-deep/SKILL.md</code></li>
        <li><code>skills/portfolio-review/SKILL.md</code></li>
      </ul>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/agents">Browse all 17 agents</Link></li>
        <li><Link href="/docs/concepts/agent">Agent format reference</Link></li>
        <li><Link href="/docs/concepts/crypto">Crypto plugin overview</Link></li>
      </ul>
    </div>
  );
}
