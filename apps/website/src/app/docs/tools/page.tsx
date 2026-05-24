import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Tools</h1>
      <p className="lead">
        Plugins, skills, and individual tools agents can call.
      </p>

      <h2>Plugin development</h2>
      <ul>
        <li><Link href="/docs/tools/plugin-sdk">Plugin SDK</Link> — write tools and agents in TypeScript</li>
        <li><Link href="/docs/tools/manifest">Plugin Manifest</Link> — declare permissions, exports, config</li>
        <li><Link href="/docs/tools/testing">Testing Helpers</Link> — mock runtime + assertions</li>
      </ul>

      <h2>Skills</h2>
      <p>
        Specialized instruction sets loaded when relevant. See{" "}
        <Link href="/docs/tools/skills">Skills</Link> and{" "}
        <Link href="/docs/templates/skill">SKILL.md template</Link>.
      </p>

      <h2>Notable bundled tools</h2>
      <ul>
        <li><Link href="/docs/tools/web-search">Web Search</Link> — DuckDuckGo, Brave, Tavily, SerpApi, SearXNG</li>
        <li><Link href="/docs/tools/pdf">PDF</Link> — read + search local PDFs</li>
        <li><Link href="/docs/tools/apply-patch">Apply Patch</Link> — unified diffs to files</li>
      </ul>

      <h2>Installing user plugins</h2>
      <pre><code>{`# Local directory
vesper plugin install ~/dev/my-plugin

# Inspect bundled
vesper plugin list --all
vesper plugin info @openvesper/plugin-web-search`}</code></pre>

      <h2>Tool permissions</h2>
      <p>
        See <Link href="/docs/gateway/approvals">Approvals</Link>. Mutation,
        filesystem, and shell tools require user OK unless an auto-allow rule
        matches.
      </p>
    </div>
  );
}
