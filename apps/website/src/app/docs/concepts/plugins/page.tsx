import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Plugins</h1>
      <p className="lead">
        Plugins are how OpenVesper interacts with the outside world. They wrap
        APIs, expose tools, and ship with TypeScript types. Every external
        capability — querying a price, sending a Telegram message, reading
        a file — lives in a plugin.
      </p>

      <h2>Anatomy of a plugin</h2>
      <p>Each plugin is a workspace package:</p>

      <pre><code>{`packages/plugins/weather/
├── package.json           Name, version, dependencies
├── tsconfig.json          TypeScript config
├── src/
│   └── index.ts           Plugin definition
└── README.md              Usage and examples (optional)`}</code></pre>

      <h2>Minimal plugin</h2>
      <p>
        Here's a complete plugin with a single tool, in about 25 lines:
      </p>

      <pre><code>{`// packages/plugins/weather/src/index.ts
import axios from "axios";
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";

async function getWeather(location: string) {
  // Open-Meteo is free, no API key required
  const r = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: { latitude: 52.52, longitude: 13.41, current_weather: true },
  });
  return {
    success: true,
    data: { location, ...r.data.current_weather },
  };
}

export default definePlugin({
  name: "weather",
  version: "1.0.0",
  description: "Current weather and forecast for any location",
  tools: [
    defineTool({
      name: "get_weather",
      description: "Get current weather for a location",
      inputSchema: inputSchema({
        location: { type: "string", description: "City name" },
      }, ["location"]),
      handler: async (input) => getWeather(input.location as string),
      category: "lifestyle",
      permission: "external",  // calls an external API
    }),
  ],
});`}</code></pre>

      <h2>Plugin SDK reference</h2>

      <h3><code>definePlugin(spec)</code></h3>
      <p>Top-level plugin definition. Returns the plugin so it can be loaded.</p>
      <pre><code>{`definePlugin({
  name: string;          // Unique plugin name
  version: string;       // semver
  description: string;   // One-line summary
  tools: Tool[];         // Array of tools this plugin exposes
  agents?: Agent[];      // Optional: agents shipped with this plugin
})`}</code></pre>

      <h3><code>defineTool(spec)</code></h3>
      <p>Define a single callable tool.</p>
      <pre><code>{`defineTool({
  name: string;             // Tool name, snake_case
  description: string;      // Shown to the LLM — make it clear
  inputSchema: object;      // JSON Schema for input validation
  handler: async (input) => ToolResult;
  category: ToolCategory;   // "crypto" | "research" | "lifestyle" | ...
  permission?: Permission;  // "external" | "filesystem" | "shell" | undefined
})`}</code></pre>

      <h3><code>inputSchema(props, required)</code></h3>
      <p>Helper to build a JSON Schema. Less verbose than writing JSON by hand.</p>
      <pre><code>{`inputSchema(
  {
    symbol: { type: "string", description: "Ticker, e.g. BTC" },
    interval: { type: "string", description: "5m, 15m, 1h, 4h, 1d" },
  },
  ["symbol"]  // required fields
)`}</code></pre>

      <h3>ToolResult shape</h3>
      <p>Every tool returns the same shape so the runtime can handle it uniformly:</p>
      <pre><code>{`type ToolResult =
  | { success: true; data: unknown }
  | { success: false; error: string };`}</code></pre>

      <h2>The 47 shipped plugins</h2>

      <p>Plugins are grouped into 12 categories. Click any category for the full list at <Link href="/integrations">/integrations</Link>.</p>

      <table>
        <thead><tr><th>Category</th><th>Plugins</th></tr></thead>
        <tbody>
          <tr><td>Crypto core</td><td>crypto, derivatives, defi, whale, onchain, security</td></tr>
          <tr><td>Solana</td><td>solana, solana-dev, bagsfm, memescan, base-meme</td></tr>
          <tr><td>Trading data</td><td>strategies, macro, airdrop, nft, tracking</td></tr>
          <tr><td>Comms</td><td>telegram, slack, discord, email</td></tr>
          <tr><td>Productivity</td><td>calendar, notes, tracking, code</td></tr>
          <tr><td>Research</td><td>research, news, twitter, youtube, books</td></tr>
          <tr><td>System</td><td>filesystem, shell, code, browser, dns</td></tr>
          <tr><td>Data</td><td>database, banking, ecommerce</td></tr>
          <tr><td>Media</td><td>music, movies, voice, translate, imagegen</td></tr>
          <tr><td>Smart home</td><td>smarthome, weather, maps</td></tr>
          <tr><td>Misc</td><td>tracking, smarthome, sports, gaming</td></tr>
        </tbody>
      </table>

      <h2>Tool permissions</h2>
      <p>
        The <code>permission</code> field signals what the tool needs at
        runtime. The agent runtime uses this for confirmation prompts
        in interactive sessions and for audit logs.
      </p>

      <table>
        <thead><tr><th>Permission</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>external</code></td><td>Calls an external HTTP API (CoinGecko, GitHub, etc.)</td></tr>
          <tr><td><code>filesystem</code></td><td>Reads or writes local files</td></tr>
          <tr><td><code>shell</code></td><td>Executes shell commands</td></tr>
          <tr><td><code>network</code></td><td>Opens arbitrary network connections</td></tr>
          <tr><td><code>mutation</code></td><td>Performs side-effects (transfer, post, send)</td></tr>
        </tbody>
      </table>

      <p>
        Tools without a permission flag are assumed to be pure / read-only.
        Mutating tools (sending messages, transferring funds, modifying files)
        must declare one. See{" "}
        <Link href="/docs/gateway/sandboxing">Sandboxing</Link> for details.
      </p>

      <h2>Writing your first plugin</h2>

      <h3>1. Scaffold the directory</h3>
      <pre><code>{`mkdir packages/plugins/myplugin
cd packages/plugins/myplugin`}</code></pre>

      <h3>2. Create package.json</h3>
      <pre><code>{`{
  "name": "@openvesper/plugin-myplugin",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@openvesper/plugin-sdk": "workspace:*",
    "axios": "^1.7.7"
  }
}`}</code></pre>

      <h3>3. Create tsconfig.json</h3>
      <pre><code>{`{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}`}</code></pre>

      <h3>4. Write your plugin</h3>
      <p>See the minimal plugin example at the top of this page.</p>

      <h3>5. Install and build</h3>
      <pre><code>{`# From repo root
pnpm install
pnpm --filter @openvesper/plugin-myplugin build`}</code></pre>

      <h3>6. Register the plugin</h3>
      <p>
        Add the plugin to <code>apps/cli/src/index.ts</code> (or whichever
        app should expose it):
      </p>
      <pre><code>{`import myplugin from "@openvesper/plugin-myplugin";

// In the runtime setup:
runtime.use(myplugin);`}</code></pre>

      <h2>Design principles</h2>

      <h3>Read-only by default</h3>
      <p>
        Most OpenVesper plugins are read-only. They fetch data from public
        APIs and return it. Mutating operations (sending, transferring,
        posting) are clearly marked and require explicit permission flags.
      </p>

      <h3>No key management</h3>
      <p>
        Plugins read credentials from environment variables only. They never
        write keys to disk, never transmit them to OpenVesper servers (there
        are no OpenVesper servers), and never log them. See{" "}
        <Link href="/docs/gateway/security">Security</Link>.
      </p>

      <h3>Errors over exceptions</h3>
      <p>
        Tool handlers return <code>{`{ success: false, error: "..." }`}</code>{" "}
        instead of throwing. This makes the runtime simpler and forces
        explicit error messaging that's helpful to the LLM.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/agent">Agents</Link> — how agents reference plugins</li>
        <li><Link href="/docs/tools/skills">Skills</Link> — modular instructions agents pull in</li>
        <li><Link href="/integrations">All 47 plugins</Link> — browse the catalogue</li>
      </ul>
    </div>
  );
}
