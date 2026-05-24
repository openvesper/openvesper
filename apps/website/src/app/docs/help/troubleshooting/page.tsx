import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Troubleshooting</h1>
      <p className="lead">Common issues and how to fix them.</p>

      <h2>Installation</h2>

      <h3><code>pnpm: command not found</code></h3>
      <p>You haven't installed pnpm. Run:</p>
      <pre><code>{`npm install -g pnpm`}</code></pre>

      <h3><code>ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL</code> during build</h3>
      <p>
        One of the workspace packages failed to build. Scroll up in the
        output to find the actual TypeScript error. Common causes:
      </p>
      <ul>
        <li>Stale <code>node_modules</code> after pulling new changes — wipe and reinstall</li>
        <li>Editing a <code>src/</code> file with a syntax error</li>
      </ul>
      <pre><code>{`rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm -r build`}</code></pre>

      <h3><code>Cannot find module '@openvesper/core'</code></h3>
      <p>
        You ran a CLI command before <code>pnpm -r build</code> finished.
        Internal packages need to be built so their <code>dist/</code>{" "}
        exists. Re-run the build.
      </p>

      <h2>Runtime</h2>

      <h3><code>No LLM provider configured</code></h3>
      <p>
        Set at least one API key in <code>~/.openvesper/.env</code>:
      </p>
      <pre><code>{`echo "ANTHROPIC_API_KEY=sk-ant-..." >> ~/.openvesper/.env`}</code></pre>

      <h3><code>Rate limit exceeded</code></h3>
      <p>
        Your LLM provider is throttling you. Either wait, upgrade your
        plan, or switch to a different provider for that agent:
      </p>
      <pre><code>{`node apps/cli/dist/index.js -a auto -p groq -q "your query"`}</code></pre>

      <h3>Tool fails with <code>HELIUS_API_KEY required</code></h3>
      <p>
        Some Solana-specific tools (holder distribution, creator analysis)
        require a Helius RPC key for higher rate limits. Get a free key at{" "}
        <a href="https://helius.dev" target="_blank" rel="noopener noreferrer">helius.dev</a>{" "}
        and set it:
      </p>
      <pre><code>{`echo "HELIUS_API_KEY=your-key" >> ~/.openvesper/.env`}</code></pre>

      <h2>Cron / Heartbeats</h2>

      <h3>Scheduled job not running</h3>
      <p>Check that:</p>
      <ul>
        <li>The job is enabled: <code>node apps/cli/dist/index.js cron list</code></li>
        <li>The scheduler daemon is actually running (not just registered)</li>
        <li>Your machine is on at the scheduled time</li>
      </ul>
      <p className="callout">
        💡 OpenVesper's scheduler runs in-process. For always-on scheduling,
        run the CLI under <code>systemd</code>, <code>pm2</code>, or in a
        Docker container that stays running.
      </p>

      <h2>VSCode extension</h2>

      <h3>Extension installed but no panel</h3>
      <p>
        Open the command palette (Cmd/Ctrl+Shift+P) and run{" "}
        <code>OpenVesper: Open Chat</code>.
      </p>

      <h3>API key not saving</h3>
      <p>
        The extension stores keys in VSCode's encrypted{" "}
        <code>secretStorage</code>. If saves are failing, check that VSCode
        has permission to write to its config directory.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Open an issue at{" "}
        <a href="https://github.com/openvesper/openvesper/issues" target="_blank" rel="noopener noreferrer">
          github.com/openvesper/openvesper/issues
        </a>{" "}
        with:
      </p>
      <ul>
        <li>What you ran</li>
        <li>The full error message</li>
        <li>Your OS and Node version (<code>node --version</code>)</li>
      </ul>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/help/faq">FAQ</Link></li>
        <li><Link href="/docs/start/getting-started">Getting Started</Link></li>
      </ul>
    </div>
  );
}
