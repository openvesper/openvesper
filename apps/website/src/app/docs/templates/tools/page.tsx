import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>TOOLS.md Template</h1>
      <p className="lead">
        Tool access policy for this agent. Loaded at priority 60. Used by the
        agent to decide which tools to reach for and which to avoid.
      </p>

      <h2>Sections</h2>
      <pre><code>{`# Tools

## Access policy

Full cross-plugin read access by default. Mutation tools require user
approval (gateway prompts).

## Primary tools

- bags_token_score — composite scoring
- bags_holder_distribution — top-N holder analysis
- bags_rug_heuristics — 4-stage rug check
- web_search — general lookups
- jupiter_quote — read-only price queries

## Out of scope

- Any tool that signs transactions
- Any tool requiring wallet private keys
- jupiter_swap, raydium_swap — never call these
- shell_exec — outside this agent's scope`}</code></pre>

      <h2>Permission categories</h2>
      <p>OpenVesper tools carry one of these permission tags:</p>
      <ul>
        <li><code>read</code> — read-only API calls, file reads</li>
        <li><code>external</code> — makes outbound API calls</li>
        <li><code>mutation</code> — sends messages, posts, writes</li>
        <li><code>filesystem</code> — writes files</li>
        <li><code>shell</code> — runs shell commands</li>
      </ul>
      <p>
        Mutation/filesystem/shell tools route through{" "}
        <Link href="/docs/gateway/approvals">Approvals</Link> by default unless
        a rule auto-allows them.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/gateway/approvals">Approvals system</Link></li>
        <li><Link href="/docs/tools/plugin-sdk">Plugin SDK</Link></li>
      </ul>
    </div>
  );
}
