import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>🤖 Auto Agent</h1>
      <p className="lead">
        <strong>Mode:</strong> <code>auto</code> · <strong>Category:</strong> General-purpose
      </p>

      <p>
        The <code>auto</code> agent is the default. It has no specific persona —
        it routes your question to the most appropriate tool based on the input.
        Good for one-off queries when you don't want to pick a specialist.
      </p>

      <h2>Quick run</h2>
      <p>
        From the repo root, after <code>pnpm -r build</code>:
      </p>

      <pre><code>{`node apps/cli/dist/index.js -q "What's the price of BTC?"`}</code></pre>

      <p>
        Or be explicit:
      </p>

      <pre><code>{`node apps/cli/dist/index.js -a auto -q "What's the price of BTC?"`}</code></pre>

      <h2>Requirements</h2>

      <h3>LLM provider</h3>
      <p>Any one of these. Recommended:</p>
      <ul>
        <li><strong>Anthropic Claude</strong> — best quality, paid</li>
        <li><strong>Groq</strong> — fast and has a free tier</li>
        <li><strong>Gemini</strong> — Google, free tier available</li>
        <li><strong>Ollama</strong> — fully local, free, slower</li>
      </ul>

      <p>Set one in <code>~/.openvesper/.env</code>:</p>
      <pre><code>{`ANTHROPIC_API_KEY=sk-ant-...
# or
GROQ_API_KEY=gsk_...
# or
GEMINI_API_KEY=AIza...
# or fully local
OLLAMA_HOST=http://localhost:11434`}</code></pre>

      <h3>Plugins used</h3>
      <p>
        All 47 plugins are loaded. The agent picks tools as needed from the
        global registry. No per-agent restrictions.
      </p>

      <h2>When to use auto vs. a specialist</h2>

      <table>
        <thead>
          <tr><th>Use auto when...</th><th>Use a specialist when...</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>You have a one-off, mixed question</td>
            <td>You're focused on one domain (crypto, code, fitness)</td>
          </tr>
          <tr>
            <td>You don't know which agent fits</td>
            <td>You want a specific tone or persona</td>
          </tr>
          <tr>
            <td>The question is general</td>
            <td>You're scheduling repeated tasks for one purpose</td>
          </tr>
        </tbody>
      </table>

      <h2>Example sessions</h2>

      <pre><code>{`node apps/cli/dist/index.js -q "Price of SOL right now"`}</code></pre>

      <pre><code>{`node apps/cli/dist/index.js -q "Trending coins on Pump.fun today"`}</code></pre>

      <pre><code>{`node apps/cli/dist/index.js -q "Send a Telegram message: deployment finished"`}</code></pre>

      <pre><code>{`node apps/cli/dist/index.js -q "What's the weather in Istanbul tomorrow?"`}</code></pre>

      <h2>Switching LLM providers</h2>
      <p>You can override the provider per query:</p>
      <pre><code>{`node apps/cli/dist/index.js -a auto -p groq -q "summarize my morning"
node apps/cli/dist/index.js -a auto -p anthropic --model claude-opus-4-5 -q "harder question"`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/agents">Browse all 16 specialists</Link></li>
        <li><Link href="/docs/concepts/agent">Agent format reference</Link></li>
        <li><Link href="/docs/start/getting-started">Getting Started</Link></li>
      </ul>
    </div>
  );
}
