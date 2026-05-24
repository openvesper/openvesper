import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Security & Privacy</h1>
      <p className="lead">
        OpenVesper is an open-source AI agent framework built on three commitments:
        zero data retention, no wallet key handling, and zero hidden telemetry.
        This page explains how each is enforced in code.
      </p>

      <h2>Zero data retention</h2>
      <p>
        <strong>OpenVesper does not collect, store, transmit, or retain any user data on our servers.</strong>
      </p>
      <ul>
        <li><strong>No telemetry.</strong> No usage analytics, no error reporting to us, no "anonymous metrics."</li>
        <li><strong>No phone-home.</strong> The runtime never contacts <code>openvesper.com</code> or any Vesper-controlled server.</li>
        <li><strong>No remote logging.</strong> Logs are local. We cannot see them. We never receive them.</li>
        <li><strong>No "cloud sync."</strong> Memory, conversations, agents, and configurations live exclusively on your machine.</li>
        <li><strong>No accounts.</strong> There is nothing to sign up for. We have no user database.</li>
        <li><strong>No prompt logging.</strong> Your prompts and the model's responses are never sent to us.</li>
      </ul>

      <p>When you use OpenVesper:</p>
      <ul>
        <li><strong>Your LLM provider</strong> (Anthropic, OpenAI, etc.) sees your prompts. That is their privacy policy, not ours.</li>
        <li><strong>External APIs you configure</strong> (Telegram, Slack, etc.) see the data you choose to send them.</li>
        <li><strong>Your local disk</strong> stores memory, configurations, and logs only if you enable them.</li>
      </ul>

      <h2>Wallet key policy</h2>
      <p>
        <strong>OpenVesper NEVER asks for, stores, or uses your main wallet private key or seed phrase. For any feature.</strong>
      </p>

      <p>This is a hard architectural rule:</p>
      <ul>
        <li>No plugin in this repository reads a "main wallet private key" env var.</li>
        <li>No bundled agent persona requests a seed phrase. If a bundled one does, that's a bug — file a security issue. (Custom agents you author are your responsibility.)</li>
        <li>No example, doc, or tutorial in this repository will instruct you to paste a main wallet key into <code>.env</code>.</li>
      </ul>

      <h3>No perpetual DEX trading bundled</h3>
      <p>
        OpenVesper does not bundle Hyperliquid, Lighter, Drift, or similar perpetual-DEX trading code by default. This is a packaging choice, not a hard restriction — users can build their own trading plugins.
        
      </p>
      <ol>
        <li>
          <strong>Key management responsibility.</strong> Even scoped API credentials
          need careful handling. As an open-source project that anyone can fork
          and modify, we'd rather not be the bridge between an LLM-driven agent
          and your money.
        </li>
        <li>
          <strong>Focus.</strong> OpenVesper is for read-only analytics, research,
          and orchestration. Trading execution belongs in a separate, carefully
          audited tool.
        </li>
      </ol>

      <h2>Local data storage</h2>
      <p>
        When enabled, the following data is stored <strong>locally only</strong> at <code>~/.openvesper/</code>:
      </p>

      <table>
        <thead>
          <tr><th>Data</th><th>Location</th><th>Default</th></tr>
        </thead>
        <tbody>
          <tr><td>API keys, tokens</td><td><code>~/.openvesper/.env</code> (perm <code>0600</code>)</td><td>n/a — you provide</td></tr>
          <tr><td>Configuration</td><td><code>~/.openvesper/openvesper.json</code></td><td>created on first run</td></tr>
          <tr><td>Memory</td><td><code>~/.openvesper/workspace/memory.json</code> (perm <code>0600</code>)</td><td><strong>disabled</strong></td></tr>
          <tr><td>Conversations</td><td><code>~/.openvesper/workspace/conversations/</code></td><td><strong>disabled</strong></td></tr>
          <tr><td>Agent files</td><td><code>.agents/&lt;name&gt;/</code> in your project</td><td>n/a</td></tr>
          <tr><td>Daily logs</td><td><code>.agents/&lt;name&gt;/memory/YYYY-MM-DD.md</code></td><td><strong>disabled</strong></td></tr>
          <tr><td>Cron state</td><td><code>~/.openvesper/workspace/heartbeat.json</code> (perm <code>0600</code>)</td><td>only if jobs added</td></tr>
        </tbody>
      </table>

      <p>
        Memory and conversation persistence are <strong>opt-in</strong>. The
        <code>MemoryManager</code> defaults to <code>enabled: false</code>. The runtime
        never writes prompts or responses to disk unless you explicitly configure it.
      </p>

      <h2>Code-level enforcement</h2>

      <h3>Permission flags on tools</h3>
      <p>Every mutating tool declares its permission requirement:</p>
      <pre><code>{`defineTool({
  name: "send_telegram_message",
  // ...
  permission: "mutation",  // ← gates interactive confirmation
})`}</code></pre>

      <h3>Filesystem sandbox</h3>
      <p>
        The <code>filesystem</code> plugin uses a <code>safePath()</code> guard
        that resolves the requested path and ensures it stays inside the
        workspace boundary. Path traversal attempts (<code>..</code>, symlinks
        out, absolute paths) are rejected.
      </p>

      <h3>Shell sandbox</h3>
      <p>
        The <code>shell</code> plugin blocks dangerous patterns (<code>rm -rf /</code>,
        fork bombs, <code>mkfs</code>, <code>dd if=/dev</code>, <code>shutdown</code>)
        and runs commands with timeouts.
      </p>

      <h3>HTTP security headers</h3>
      <p>The website ships with these headers on every response:</p>
      <ul>
        <li><code>X-Content-Type-Options: nosniff</code></li>
        <li><code>X-Frame-Options: DENY</code></li>
        <li><code>Referrer-Policy: strict-origin-when-cross-origin</code></li>
        <li><code>Permissions-Policy</code> — camera, microphone, geolocation disabled</li>
        <li><code>Strict-Transport-Security: max-age=63072000; includeSubDomains; preload</code></li>
        <li><code>Content-Security-Policy</code> — strict, no inline eval</li>
      </ul>

      <h2>What stays on your machine</h2>
      <p>
        You can wipe all local state at any time:
      </p>
      <pre><code>{`# Trim memory to last 500 items
node apps/cli/dist/index.js memory compact

# Nuclear: wipe everything
rm -rf ~/.openvesper/workspace`}</code></pre>

      <h2>Reporting security issues</h2>
      <p>
        If you find a security issue, please report it privately first:
      </p>
      <ul>
        <li>Open a GitHub security advisory at <code>github.com/openvesper/openvesper/security/advisories/new</code></li>
        <li>Do not disclose publicly until we've had 14 days to respond</li>
      </ul>

      <h2>Audit your install</h2>
      <p>
        Because OpenVesper is open source, you can verify these claims yourself.
        A few specific things you can grep for:
      </p>

      <pre><code>{`# Check for hidden telemetry endpoints
grep -rn "analytics\\|telemetry\\|tracking" packages/

# Check for any HTTP POSTs to openvesper.com
grep -rn "openvesper.com" packages/ apps/

# Check for wallet key requests
grep -rn "private_key\\|seed_phrase\\|mnemonic" packages/`}</code></pre>

      <p>
        All three should return no production code matches (only the negative
        references in this docs).
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/gateway/sandboxing">Sandboxing</Link> — how filesystem and shell tools are bounded</li>
        <li><Link href="/docs/gateway/configuration">Configuration</Link> — env vars and settings</li>
        <li><Link href="/docs/concepts/session">Sessions & Memory</Link> — opt-in persistence</li>
      </ul>
    </div>
  );
}
