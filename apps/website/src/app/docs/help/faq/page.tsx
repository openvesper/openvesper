import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>FAQ</h1>
      <p className="lead">Frequently asked questions about OpenVesper.</p>

      <h2>General</h2>

      <h3>What is OpenVesper?</h3>
      <p>
        An open-source AI agent framework that runs on your own machine.
        You bring an LLM provider key (Anthropic, OpenAI, Groq, Ollama,
        etc.), and OpenVesper handles agent personas, tool execution,
        memory, and scheduling. See <Link href="/docs/start/getting-started">Getting Started</Link>.
      </p>

      <h3>How is this different from a chatbot?</h3>
      <p>
        Chatbots respond to messages. Agents take actions. OpenVesper
        agents can call tools (47 plugins shipped) to fetch data, send
        messages, write files, schedule jobs, and more.
      </p>

      <h3>Is OpenVesper hosted somewhere?</h3>
      <p>
        No. There are no OpenVesper servers. The framework runs entirely on
        your machine. You can self-host it on a VPS if you want it always-on.
      </p>

      <h2>Privacy & security</h2>

      <h3>Where does my data go?</h3>
      <p>
        Your prompts go to your chosen LLM provider (Anthropic, OpenAI, etc.)
        according to their privacy policy. Tool calls go to the external APIs
        you've configured (Telegram, GitHub, etc.). Nothing is sent to us
        because we have no servers. See <Link href="/docs/gateway/security">Security policy</Link>.
      </p>

      <h3>Does OpenVesper ask for wallet keys?</h3>
      <p>
        No. <strong>Never.</strong> No plugin, agent, or skill in this
        repository asks for a wallet private key or seed phrase. The
        framework cannot move funds.
      </p>

      <h3>Is my memory or conversation history sent anywhere?</h3>
      <p>
        No. Memory, conversation persistence, and heartbeat state all live
        on your disk at <code>~/.openvesper/</code>. They are also{" "}
        <strong>disabled by default</strong> — you have to opt in.
      </p>

      <h2>Setup</h2>

      <h3>Why pnpm and not npm?</h3>
      <p>
        OpenVesper is a monorepo with 56 packages. pnpm's workspace
        support is significantly faster and handles internal package
        linking correctly. <code>npm install</code> in this repo will
        produce broken dependencies.
      </p>

      <h3>Which LLM provider should I use?</h3>
      <ul>
        <li><strong>Anthropic Claude</strong> — highest quality, paid</li>
        <li><strong>Groq</strong> — fast, free tier available</li>
        <li><strong>Gemini</strong> — Google, free tier available</li>
        <li><strong>OpenAI</strong> — quality, paid</li>
        <li><strong>Ollama</strong> — fully local, free, slower</li>
      </ul>
      <p>You can mix providers — different agents can use different models.</p>

      <h3>Can I run OpenVesper fully offline?</h3>
      <p>
        Yes, with <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a>.
        Set <code>OLLAMA_HOST=http://localhost:11434</code> in your env. Some
        plugins (crypto prices, news) still need internet for external APIs,
        but the LLM itself runs locally.
      </p>

      <h2>Plugins & agents</h2>

      <h3>Can I write my own plugin?</h3>
      <p>
        Yes. A plugin is a TypeScript file with a few exports. See{" "}
        <Link href="/docs/concepts/plugins">Plugins</Link> for the SDK
        reference and a minimal example.
      </p>

      <h3>Can I write my own agent?</h3>
      <p>
        Yes, and you don't need to write code. An agent is six markdown files
        in a directory. Copy an existing one and edit. See{" "}
        <Link href="/docs/concepts/agent">Agents</Link>.
      </p>

      <h3>Does the LLM see all tools, or just the agent's?</h3>
      <p>
        All loaded tools, by default. OpenVesper uses a single global tool
        registry — agents don't have per-agent whitelists. The agent's{" "}
        <code>TOOLS.md</code> documents intent, not a runtime gate.
        Mutating operations are gated by tool-level permissions instead.
      </p>

      <h2>Trading & crypto</h2>

      <h3>Does OpenVesper trade crypto?</h3>
      <p>
        No. OpenVesper is for research, analysis, and orchestration.
        Trading execution on perpetual DEXes (Hyperliquid, Lighter, Drift)
        is <strong>not bundled</strong>. We provide read-only analytics only.
      </p>

      <h3>Can I add my own trading plugin?</h3>
      <p>
        That's your choice in a fork. We don't bundle it because key
        management for trading is a separate, security-critical concern
        that doesn't belong in an LLM-driven framework.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/start/getting-started">Getting Started</Link></li>
        <li><Link href="/docs/help/troubleshooting">Troubleshooting</Link></li>
        <li><Link href="/docs/gateway/security">Security policy</Link></li>
      </ul>
    </div>
  );
}
