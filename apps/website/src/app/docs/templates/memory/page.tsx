import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>MEMORY.md Template</h1>
      <p className="lead">
        Durable notes the agent persists across conversations. There's a static
        file and an active memory engine — both end up here.
      </p>

      <h2>Static file format</h2>
      <pre><code>{`# Memory

## 2026-05-21 (compacted from earlier session)

- User prefers tokens with > $50k 24h volume
- BTC ATH thesis: 200k by Q4 (sentiment, not financial advice)
- Active watchlist: $BAGS, $PUMP, $WIF
- User's Solana wallet (read-only): ABC123...XYZ

## 2026-05-22

- New rule: skip tokens < 24h old until liquidity proven
- BAGS thesis confirmed by recent dev activity`}</code></pre>

      <h2>Active memory entries</h2>
      <p>
        Beyond the static file, the{" "}
        <Link href="/docs/concepts/memory">Memory Engine</Link> stores
        structured entries with tags, sessionKey, and TTL in
        <code>{` <agent>/memory/<id>.json`}</code> files.
      </p>

      <h2>Privacy</h2>
      <p>
        Memory lives in the agent's own directory. Never sent off-machine.
        File mode 0600.
      </p>

      <p>
        Don't store secrets here (API keys, private keys, passwords). They
        belong in environment variables or the OAuth token store.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/memory">Memory Engine</Link></li>
        <li><Link href="/docs/concepts/compaction">Compaction</Link></li>
      </ul>
    </div>
  );
}
