import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Environment Variables</h1>
      <p className="lead">
        All env vars OpenVesper reads. Most have sensible defaults.
      </p>

      <h2>Gateway core</h2>
      <table>
        <thead><tr><th>Variable</th><th>Default</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>OPENVESPER_GATEWAY_HOST</code></td><td><code>127.0.0.1</code></td><td>Bind address</td></tr>
          <tr><td><code>OPENVESPER_GATEWAY_PORT</code></td><td><code>18789</code></td><td>Bind port</td></tr>
          <tr><td><code>OPENVESPER_AGENTS_DIR</code></td><td><code>./.agents</code></td><td>Bundled agents dir</td></tr>
          <tr><td><code>OPENVESPER_CONFIG_DIR</code></td><td><code>~/.openvesper</code></td><td>User config root</td></tr>
          <tr><td><code>OPENVESPER_HEARTBEAT_INTERVAL</code></td><td><code>60000</code></td><td>Heartbeat check (ms)</td></tr>
          <tr><td><code>OPENVESPER_MAX_CONCURRENT</code></td><td><code>4</code></td><td>Max parallel agent runs</td></tr>
          <tr><td><code>OPENVESPER_SEARCH_PROVIDER</code></td><td><code>duckduckgo</code></td><td>Web search default</td></tr>
        </tbody>
      </table>

      <h2>LLM providers</h2>
      <table>
        <thead><tr><th>Variable</th><th>For</th></tr></thead>
        <tbody>
          <tr><td><code>ANTHROPIC_API_KEY</code></td><td>Claude</td></tr>
          <tr><td><code>OPENAI_API_KEY</code></td><td>GPT-4o, o-series</td></tr>
          <tr><td><code>GROQ_API_KEY</code></td><td>Groq (fast Llama)</td></tr>
          <tr><td><code>GEMINI_API_KEY</code></td><td>Google Gemini</td></tr>
          <tr><td><code>MISTRAL_API_KEY</code></td><td>Mistral</td></tr>
          <tr><td><code>DEEPSEEK_API_KEY</code></td><td>DeepSeek</td></tr>
          <tr><td><code>OPENROUTER_API_KEY</code></td><td>OpenRouter (multi-provider)</td></tr>
          <tr><td><code>OLLAMA_URL</code></td><td>Local Ollama (default: http://127.0.0.1:11434)</td></tr>
        </tbody>
      </table>

      <h2>Tool API keys</h2>
      <table>
        <thead><tr><th>Variable</th><th>For</th></tr></thead>
        <tbody>
          <tr><td><code>HELIUS_API_KEY</code></td><td>Solana RPC + DAS API</td></tr>
          <tr><td><code>BRAVE_SEARCH_API_KEY</code></td><td>Brave web search</td></tr>
          <tr><td><code>TAVILY_API_KEY</code></td><td>Tavily search</td></tr>
          <tr><td><code>SERPAPI_API_KEY</code></td><td>SerpApi search</td></tr>
          <tr><td><code>SEARXNG_URL</code></td><td>Self-hosted SearXNG</td></tr>
          <tr><td><code>COINGECKO_API_KEY</code></td><td>CoinGecko Pro (optional)</td></tr>
        </tbody>
      </table>

      <h2>Channels</h2>
      <table>
        <thead><tr><th>Variable</th><th>For</th></tr></thead>
        <tbody>
          <tr><td><code>TELEGRAM_BOT_TOKEN</code></td><td>Telegram bot</td></tr>
          <tr><td><code>SLACK_BOT_TOKEN</code></td><td>Slack bot</td></tr>
          <tr><td><code>DISCORD_WEBHOOK_URL</code></td><td>Discord webhook send</td></tr>
          <tr><td><code>DISCORD_BOT_TOKEN</code></td><td>Discord bot send</td></tr>
        </tbody>
      </table>

      <h2>Workspaces</h2>
      <p>For running multiple gateways:</p>
      <ul>
        <li><code>OPENVESPER_GATEWAY_PORT</code> — per-workspace port</li>
        <li><code>OPENVESPER_AGENTS_DIR</code> — per-workspace agents</li>
        <li><code>OPENVESPER_CONFIG_DIR</code> — per-workspace config</li>
        <li><code>OPENVESPER_PID_FILE</code> — per-workspace PID</li>
      </ul>
      <p>See <Link href="/docs/gateway/workspaces">Workspaces</Link> for details.</p>
    </div>
  );
}
