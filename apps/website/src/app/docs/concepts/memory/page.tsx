import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Memory Engine</h1>
      <p className="lead">
        Beyond <code>MEMORY.md</code> as a static file, the active memory engine
        treats memory as a live store of timestamped entries with tags and
        optional TTL. Agents read relevant entries automatically; write new
        ones explicitly.
      </p>

      <h2>What gets stored</h2>
      <ul>
        <li>Free-text content</li>
        <li>Optional tags for filtering</li>
        <li>Optional sessionKey (per-session scope)</li>
        <li>Optional TTL — entries auto-delete after expiry</li>
        <li>Created + last-accessed timestamps</li>
      </ul>

      <h2>CLI usage</h2>
      <pre><code>{`vesper memory write bags-hunter "User prefers 24h+ liquidity tokens"
vesper memory write bags-hunter "BTC ATH thesis: 200k by Q4" \\
  --tag thesis --ttl-hours 720

vesper memory list bags-hunter
vesper memory list bags-hunter --tag thesis
vesper memory search bags-hunter "ATH thesis"
vesper memory delete bags-hunter m_1737...
vesper memory clear bags-hunter`}</code></pre>

      <h2>API</h2>
      <pre><code>{`POST   /memory/:agent          {content, tags?, sessionKey?, ttlMs?}
GET    /memory/:agent          ?tag=X&sessionKey=Y
POST   /memory/:agent/search   {query, limit?}
DELETE /memory/:agent/:id
DELETE /memory/:agent          (clear all)`}</code></pre>

      <h2>Auto-inclusion in context</h2>
      <p>
        The <Link href="/docs/concepts/context-engine">Context Engine</Link>{" "}
        injects the top 5 most relevant entries into every system prompt.
        Relevance is keyword-scored against recent messages.
      </p>

      <h2>Storage</h2>
      <p>
        User-installed: <code>~/.openvesper/agents/&lt;mode&gt;/memory/&lt;id&gt;.json</code><br/>
        Bundled: <code>.agents/&lt;mode&gt;/memory/&lt;id&gt;.json</code>
      </p>
      <p>File mode 0600. Nothing transmitted off-machine.</p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/memory-engine.ts</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/templates/memory">MEMORY.md template</Link></li>
        <li><Link href="/docs/concepts/compaction">Compaction</Link></li>
      </ul>
    </div>
  );
}
