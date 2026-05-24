import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Getting Started</h1>
      <p className="lead">
        Install OpenVesper, configure one LLM provider, and run your first agent.
        About 10 minutes end-to-end.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>
          <strong>Node.js 20 or later.</strong> Download from{" "}
          <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>.
          Verify with <code>node --version</code>.
        </li>
        <li>
          <strong>pnpm 9 or later.</strong> Install with{" "}
          <code>npm install -g pnpm</code>. Verify with <code>pnpm --version</code>.
        </li>
        <li>
          <strong>Git.</strong> Pre-installed on most systems. Verify with <code>git --version</code>.
        </li>
        <li>
          <strong>One LLM provider key.</strong> Anthropic, OpenAI, Groq (free tier),
          Gemini (free tier), DeepSeek, or run fully local with Ollama.
        </li>
      </ul>

      <p className="callout">
        💡 We use pnpm instead of npm because OpenVesper is a monorepo with 56 packages.
        pnpm's workspace support is significantly faster.
      </p>

      <h2>Step 1 — Install</h2>
      <pre><code>{`git clone https://github.com/openvesper/openvesper
cd openvesper

pnpm install
pnpm -r build`}</code></pre>

      <p>
        First install takes 2–5 minutes (~250 MB of dependencies).
        Build takes 3–5 minutes (compiles 47 plugins + apps).
      </p>

      <p>If both succeed, you're ready. Verify with:</p>
      <pre><code>{`node apps/cli/dist/index.js --help`}</code></pre>

      <p>You should see the CLI help output.</p>

      <h2>Step 2 — Configure an LLM provider</h2>

      <p>OpenVesper reads config from <code>~/.openvesper/.env</code>. Create it:</p>

      <pre><code>{`mkdir -p ~/.openvesper
cp .env.example ~/.openvesper/.env
nano ~/.openvesper/.env`}</code></pre>

      <p>Set at least one of these:</p>

      <pre><code>{`# Anthropic — recommended for quality
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
OPENAI_API_KEY=sk-...

# Groq — fast and has a free tier
GROQ_API_KEY=gsk_...

# Gemini — Google, free tier available
GEMINI_API_KEY=AIza...

# DeepSeek — cheap for code
DEEPSEEK_API_KEY=...

# Ollama — fully local, no API key needed
OLLAMA_HOST=http://localhost:11434`}</code></pre>

      <p className="callout">
        🔒 <strong>Privacy:</strong> Your <code>.env</code> stays on your machine.
        OpenVesper has no servers receiving keys. See{" "}
        <Link href="/docs/gateway/security">Security</Link>.
      </p>

      <h2>Step 3 — Run your first agent</h2>

      <p>Ask the default agent something:</p>
      <pre><code>{`node apps/cli/dist/index.js -q "What's the price of BTC?"`}</code></pre>

      <p>
        That uses the <code>auto</code> agent, which routes the question to
        the <code>crypto_price</code> tool (CoinGecko, no API key needed) and
        returns the answer.
      </p>

      <h2>Step 4 — Try a specialist agent</h2>

      <p>The 16 shipped specialist agents are tuned for specific tasks:</p>

      <pre><code>{`# DeFi research
node apps/cli/dist/index.js -a defi-strategist -q "Best stablecoin yields right now?"

# Security review of a folder
node apps/cli/dist/index.js -a security-reviewer -q "Audit packages/plugins/crypto/src/"

# Daily standup helper
node apps/cli/dist/index.js -a productivity-coach -q "Help me run my standup for today"

# Solana program development
node apps/cli/dist/index.js -a solana-dev-coach -q "Set up Anchor 0.31 with Token-2022"

# Workout planning
node apps/cli/dist/index.js -a fitness-trainer -q "Missed leg day. Adjust my week?"`}</code></pre>

      <p>
        See <Link href="/docs/agents">the full agent catalog</Link> for all 16,
        with per-agent setup guides and example sessions.
      </p>

      <h2>Step 5 — Useful CLI commands</h2>

      <pre><code>{`# Health check — verifies your install
node apps/cli/dist/index.js doctor

# List all available agents
node apps/cli/dist/index.js --list-agents

# List all loaded tools
node apps/cli/dist/index.js --list-tools

# List all skills (the markdown instructions agents pull in)
node apps/cli/dist/index.js --list-skills

# List configured LLM providers
node apps/cli/dist/index.js --list-providers

# Validate all agent files (checks for missing files, broken references)
node apps/cli/dist/index.js --validate`}</code></pre>

      <h2>Step 6 — (Optional) Add a chat channel</h2>

      <p>
        Talk to your agents from Telegram, Slack, or Discord instead of the
        terminal. See:
      </p>
      <ul>
        <li><Link href="/docs/channels/telegram">Telegram setup</Link></li>
        <li><Link href="/docs/channels/slack">Slack setup</Link></li>
        <li><Link href="/docs/channels/discord">Discord setup</Link></li>
      </ul>

      <h2>Step 7 — (Optional) Schedule agents</h2>

      <p>
        Run agents on a cron schedule for autonomous mode:
      </p>

      <pre><code>{`# Daily morning brief at 8 AM
node apps/cli/dist/index.js cron add morning-brief \\
  --schedule "0 8 * * *" \\
  --agent auto \\
  --prompt "Morning brief for {{date}}" \\
  --deliver-to "telegram:@me"

# List scheduled jobs
node apps/cli/dist/index.js cron list`}</code></pre>

      <p>
        See <Link href="/docs/automation/cron-jobs">Cron Jobs</Link> for full details
        and <Link href="/docs/automation/webhook">Webhooks</Link> for event-driven triggers.
      </p>

      <h2>Troubleshooting</h2>

      <h3>"pnpm: command not found"</h3>
      <p>Install pnpm: <code>npm install -g pnpm</code></p>

      <h3>"Cannot find module @openvesper/core"</h3>
      <p>
        You ran a CLI command before <code>pnpm -r build</code> finished.
        The build creates <code>dist/</code> folders that runtime imports
        require. Re-run <code>pnpm -r build</code>.
      </p>

      <h3>"No LLM provider configured"</h3>
      <p>
        Set at least one API key in <code>~/.openvesper/.env</code>. See
        Step 2 above.
      </p>

      <h3>Build fails on a specific plugin</h3>
      <p>
        Wipe and reinstall: <code>rm -rf node_modules pnpm-lock.yaml &amp;&amp; pnpm install</code>.
        If it persists, open an issue on{" "}
        <a href="https://github.com/openvesper/openvesper/issues" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/agents">Browse all 16 agents</Link> with per-agent setup guides</li>
        <li><Link href="/docs/concepts/architecture">Architecture</Link> — how the pieces fit together</li>
        <li><Link href="/docs/concepts/plugins">Plugins</Link> — write your own</li>
        <li><Link href="/docs/gateway/security">Security policy</Link></li>
      </ul>
    </div>
  );
}
