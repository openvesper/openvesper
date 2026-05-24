import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>⚡ Productivity Coach</h1>
      <p className="lead">
        <strong>Mode:</strong> <code>productivity-coach</code> · <strong>Category:</strong> Productivity
      </p>

      <p>Daily standup, weekly retros, task tracking, calendar management</p>

      <h2>Quick run</h2>
      <p>From the repo root, after <code>pnpm -r build</code>:</p>
      <pre><code>{`node apps/cli/dist/index.js -a productivity-coach -q "your question here"`}</code></pre>

      <h2>Requirements</h2>

      <h3>LLM provider</h3>
      <p>Recommended: <strong>groq (fast), anthropic</strong></p>
      <p>Set the corresponding API key in <code>~/.openvesper/.env</code>:</p>
      <ul>
        <li><code>GROQ_API_KEY (or other)</code></li>
        <li><code>GITHUB_TOKEN (optional)</code></li>
        <li><code>NOTION_API_KEY (optional)</code></li>
      </ul>

      <h3>Plugins used</h3>
      <p>This agent has access to all plugins (cross-plugin tool registry), but typically reaches for:</p>
      <p><code>calendar</code>, <code>notes</code>, <code>tracking</code>, <code>github</code></p>

      <h3>Skills it can pull in</h3>
      <p><code>daily-standup</code>, <code>eisenhower-matrix</code>, <code>meeting-prep</code>, <code>morning-briefing</code>, <code>weekly-retro</code></p>

      <h2>Example sessions</h2>
      <pre><code>{`node apps/cli/dist/index.js -a productivity-coach -q "Help me run my daily standup"`}</code></pre>
      <pre><code>{`node apps/cli/dist/index.js -a productivity-coach -q "Friday retro for this week"`}</code></pre>
      <pre><code>{`node apps/cli/dist/index.js -a productivity-coach -q "What's on my calendar today?"`}</code></pre>

      <h2>Scheduled mode (optional)</h2>
      <p>
        This agent ships with a heartbeat checklist in 
        <code>.agents/productivity-coach/HEARTBEAT.md</code>. The default schedule is 
        <code>0 8 * * *</code> but the heartbeat is <strong>disabled by default</strong>.
      </p>
      <p>To enable scheduled execution:</p>
      <pre><code>{`# Edit .agents/productivity-coach/HEARTBEAT.md
# Change "enabled: false" to "enabled: true"

# Then add it to your cron job state
node apps/cli/dist/index.js cron add hb-productivity-coach \
  --schedule "0 8 * * *" \
  --agent productivity-coach \
  --prompt "Run your heartbeat checklist for {{date}}" \
  --deliver-to "telegram:@me"`}</code></pre>

      <h2>Files</h2>
      <p>The agent's source files live under <code>.agents/productivity-coach/</code>:</p>
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
