import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Plugin SDK</h1>
      <p className="lead">
        Build OpenVesper plugins in TypeScript. Plugins ship tools, agents,
        channels, and LLM providers.
      </p>

      <h2>Installing</h2>
      <pre><code>{`pnpm add @openvesper/plugin-sdk`}</code></pre>

      <h2>Minimal plugin</h2>
      <pre><code>{`import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";

export default definePlugin({
  name: "@your/plugin-hello",
  version: "1.0.0",
  description: "Greets the world",
  tools: [
    defineTool({
      name: "say_hello",
      description: "Returns a greeting",
      inputSchema: inputSchema(
        { name: { type: "string", description: "Who to greet" } },
        ["name"]
      ),
      handler: async (input) => ({
        success: true,
        data: { greeting: \`Hello, \${input.name}!\` },
      }),
      category: "demo",
    }),
  ],
});`}</code></pre>

      <h2>Defining agents</h2>
      <pre><code>{`import { defineAgent } from "@openvesper/plugin-sdk";

const myAgent = defineAgent({
  mode: "my-agent",
  name: "My Agent",
  description: "...",
  systemPrompt: "...",
  capabilities: ["read", "external"],
});`}</code></pre>

      <h2>Tool permissions</h2>
      <p>Set <code>permission</code> on tools that mutate or call out:</p>
      <pre><code>{`defineTool({
  name: "telegram_send",
  permission: "mutation", // → triggers approval prompt
  ...
});`}</code></pre>

      <h2>Source-tree layout</h2>
      <pre><code>{`packages/plugins/your-plugin/
├── package.json    # name, version, deps
├── plugin.json     # manifest (optional but recommended)
├── tsconfig.json
└── src/
    └── index.ts    # default export: definePlugin(...)`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/tools/manifest">Plugin Manifest</Link></li>
        <li><Link href="/docs/tools/testing">Testing Helpers</Link></li>
      </ul>
    </div>
  );
}
