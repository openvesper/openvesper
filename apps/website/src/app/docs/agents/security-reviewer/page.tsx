import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>🛡 Security Reviewer</h1>
      <p className="lead">
        <strong>Mode:</strong> <code>security-reviewer</code> · <strong>Category:</strong> Development
      </p>

      <p>Reviewing code for security issues, secret scanning, dependency audits</p>

      <h2>Quick run</h2>
      <p>From the repo root, after <code>pnpm -r build</code>:</p>
      <pre><code>{`node apps/cli/dist/index.js -a security-reviewer -q "your question here"`}</code></pre>

      <h2>Requirements</h2>

      <h3>LLM provider</h3>
      <p>Recommended: <strong>anthropic claude-opus (recommended for nuance)</strong></p>
      <p>Set the corresponding API key in <code>~/.openvesper/.env</code>:</p>
      <ul>
        <li><code>ANTHROPIC_API_KEY</code></li>
      </ul>

      <h3>Plugins used</h3>
      <p>This agent has access to all plugins (cross-plugin tool registry), but typically reaches for:</p>
      <p><code>filesystem</code>, <code>code</code>, <code>github</code>, <code>security</code></p>

      <h3>Skills it can pull in</h3>
      <p><code>code-secret-scan</code>, <code>token-rugcheck</code></p>

      <h2>Example sessions</h2>
      <pre><code>{`node apps/cli/dist/index.js -a security-reviewer -q "Audit packages/plugins/crypto/src/ for security issues"`}</code></pre>
      <pre><code>{`node apps/cli/dist/index.js -a security-reviewer -q "Scan the repo for hardcoded API keys"`}</code></pre>
      <pre><code>{`node apps/cli/dist/index.js -a security-reviewer -q "Review PR 142 in openvesper/openvesper"`}</code></pre>

      <h2>Scheduled mode (optional)</h2>
      <p>
        This agent ships with a heartbeat checklist in 
        <code>.agents/security-reviewer/HEARTBEAT.md</code>. The default schedule is 
        <code>0 9 * * MON</code> but the heartbeat is <strong>disabled by default</strong>.
      </p>
      <p>To enable scheduled execution:</p>
      <pre><code>{`# Edit .agents/security-reviewer/HEARTBEAT.md
# Change "enabled: false" to "enabled: true"

# Then add it to your cron job state
node apps/cli/dist/index.js cron add hb-security-reviewer \
  --schedule "0 9 * * MON" \
  --agent security-reviewer \
  --prompt "Run your heartbeat checklist for {{date}}" \
  --deliver-to "telegram:@me"`}</code></pre>

      <h2>Files</h2>
      <p>The agent's source files live under <code>.agents/security-reviewer/</code>:</p>
      <ul>
        <li><code>SOUL.md</code> — persona and principles</li>
        <li><code>IDENTITY.md</code> — metadata (name, icon, model preferences)</li>
        <li><code>USER.md</code> — what the agent knows about you</li>
        <li><code>TOOLS.md</code> — tool policy</li>
        <li><code>HEARTBEAT.md</code> — scheduled checklist (opt-in)</li>
        <li><code>MEMORY.md</code> — long-term memory store</li>
      </ul>

      <p>
        You can edit any of these files to customize the agent. Changes
        take effect on the next run — no rebuild needed.
      </p>

      <h2>Privacy</h2>
      <p>
        This agent runs entirely on your machine. Your prompts go only to your
        configured LLM provider. Nothing is sent to OpenVesper servers (we don't
        have any). See 
        <Link href="/docs/gateway/security">Security policy</Link> for details.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/agents">Browse all 16 agents</Link></li>
        <li><Link href="/docs/concepts/agent">Agent format reference</Link></li>
        <li><Link href="/docs/automation/cron-jobs">Schedule agents to run automatically</Link></li>
      </ul>
    </div>
  );
}
