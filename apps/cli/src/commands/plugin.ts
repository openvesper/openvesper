// ============================================================
// 🌒 vesper plugin <list|install|uninstall|info|search>
// ============================================================
//
// Manage plugins. Two locations:
//   - Bundled: packages/plugins/* (read-only, ships with repo)
//   - User:    ~/.openvesper/plugins/* (installable from disk/git)
//
// Installation flow:
//   - Path: ~/.openvesper/plugins/<name>/
//   - Read plugin.json manifest (if present)
//   - Show summary, get user confirmation
//   - Symlink or copy code in
//   - Update config.json with installed list

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as readline from "node:readline/promises";

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};
function c(s: string, k: keyof typeof COLOR) {
  return `${COLOR[k]}${s}${COLOR.reset}`;
}

const BUNDLED_PLUGINS_DIR = path.join(process.cwd(), "packages", "plugins");
const USER_PLUGINS_DIR = path.join(os.homedir(), ".openvesper", "plugins");
const CONFIG_FILE = path.join(os.homedir(), ".openvesper", "config.json");

interface PluginRecord {
  name: string;
  version?: string;
  description?: string;
  location: "bundled" | "user";
  path: string;
  hasManifest: boolean;
  tools: number;
  agents: number;
}

function readConfig(): any {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")); }
  catch { return {}; }
}

function writeConfig(cfg: any): void {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

function loadPluginRecord(pluginPath: string, location: "bundled" | "user"): PluginRecord | null {
  const name = path.basename(pluginPath);

  // package.json
  let version: string | undefined;
  let description: string | undefined;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginPath, "package.json"), "utf-8"));
    version = pkg.version;
    description = pkg.description;
  } catch {
    return null; // not a real plugin
  }

  // plugin.json manifest (optional)
  let hasManifest = false;
  try {
    fs.accessSync(path.join(pluginPath, "plugin.json"));
    hasManifest = true;
  } catch {}

  // Count tools/agents by scanning src/index.ts
  let tools = 0;
  let agents = 0;
  try {
    const src = fs.readFileSync(path.join(pluginPath, "src", "index.ts"), "utf-8");
    tools = (src.match(/defineTool\(/g) || []).length;
    agents = (src.match(/defineAgent\(/g) || []).length;
  } catch {}

  return {
    name,
    version,
    description,
    location,
    path: pluginPath,
    hasManifest,
    tools,
    agents,
  };
}

function listAll(): PluginRecord[] {
  const results: PluginRecord[] = [];

  // Bundled
  if (fs.existsSync(BUNDLED_PLUGINS_DIR)) {
    for (const name of fs.readdirSync(BUNDLED_PLUGINS_DIR)) {
      const pluginPath = path.join(BUNDLED_PLUGINS_DIR, name);
      if (!fs.statSync(pluginPath).isDirectory()) continue;
      const record = loadPluginRecord(pluginPath, "bundled");
      if (record) results.push(record);
    }
  }

  // User
  if (fs.existsSync(USER_PLUGINS_DIR)) {
    for (const name of fs.readdirSync(USER_PLUGINS_DIR)) {
      const pluginPath = path.join(USER_PLUGINS_DIR, name);
      if (!fs.statSync(pluginPath).isDirectory()) continue;
      const record = loadPluginRecord(pluginPath, "user");
      if (record) results.push(record);
    }
  }

  return results;
}

// ── Commands ─────────────────────────────────────────────────────────

export function pluginList(opts: { json?: boolean; all?: boolean } = {}): void {
  const all = listAll();
  const user = all.filter((p) => p.location === "user");
  const bundled = all.filter((p) => p.location === "bundled");

  if (opts.json) {
    console.log(JSON.stringify({ user, bundled }, null, 2));
    return;
  }

  console.log("");
  if (user.length > 0) {
    console.log(c("User-installed plugins:", "bold"));
    for (const p of user) {
      console.log(`  ${c(p.name, "cyan")}  ${c("v" + (p.version || "?"), "dim")}  ${c(`(${p.tools} tools)`, "dim")}`);
      if (p.description) console.log(`     ${c(p.description, "dim")}`);
    }
    console.log("");
  }

  if (opts.all || user.length === 0) {
    console.log(c(`Bundled plugins (${bundled.length}):`, "bold"));
    for (const p of bundled) {
      const summary = p.tools > 0 ? `${p.tools} tool${p.tools > 1 ? "s" : ""}` : "no tools";
      console.log(`  ${c(p.name, "dim")}  ${c(`(${summary})`, "dim")}`);
    }
    console.log("");
  }
}

export function pluginInfo(name: string): void {
  const all = listAll();
  const plugin = all.find((p) => p.name === name);
  if (!plugin) {
    console.error(c(`✗ Plugin not found: ${name}`, "red"));
    process.exit(1);
    return;
  }

  console.log("");
  console.log(`📦  ${c(plugin.name, "bold")}  v${plugin.version || "?"}`);
  console.log(`   location: ${plugin.location}`);
  console.log(`   path:     ${plugin.path}`);
  if (plugin.description) console.log(`   ${plugin.description}`);
  console.log(`   tools:    ${plugin.tools}`);
  console.log(`   agents:   ${plugin.agents}`);
  console.log(`   manifest: ${plugin.hasManifest ? c("✓ present", "green") : c("· none", "dim")}`);
  console.log("");

  if (plugin.hasManifest) {
    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(plugin.path, "plugin.json"), "utf-8"));
      console.log(c("Manifest:", "bold"));
      console.log(JSON.stringify(manifest, null, 2));
    } catch {}
  }
}

export async function pluginInstall(sourcePath: string): Promise<void> {
  if (!fs.existsSync(sourcePath)) {
    console.error(c(`✗ Source path doesn't exist: ${sourcePath}`, "red"));
    process.exit(1);
  }

  // Must be a directory with package.json
  if (!fs.statSync(sourcePath).isDirectory()) {
    console.error(c(`✗ Source must be a directory: ${sourcePath}`, "red"));
    process.exit(1);
  }
  if (!fs.existsSync(path.join(sourcePath, "package.json"))) {
    console.error(c("✗ No package.json found at source", "red"));
    process.exit(1);
  }

  // Read manifest if present
  let manifest: any = null;
  const manifestPath = path.join(sourcePath, "plugin.json");
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch (e: any) {
      console.error(c(`✗ Invalid plugin.json: ${e.message}`, "red"));
      process.exit(1);
    }
  }

  const pluginName = manifest?.name || path.basename(sourcePath);
  const targetPath = path.join(USER_PLUGINS_DIR, pluginName);

  if (fs.existsSync(targetPath)) {
    console.error(c(`✗ Already installed: ${pluginName}`, "yellow"));
    console.log("  Path: " + targetPath);
    console.log(`  To reinstall: ${c(`vesper plugin uninstall ${pluginName}`, "cyan")} first`);
    process.exit(1);
  }

  // Show manifest summary
  if (manifest) {
    const { manifestValidator } = await import("@openvesper/plugin-sdk");
    console.log("");
    console.log(manifestValidator.summarize(manifest));
  } else {
    console.log("");
    console.log(c(`⚠ Plugin has no plugin.json manifest.`, "yellow"));
    console.log(`  Name from directory: ${pluginName}`);
    console.log(`  Source: ${sourcePath}`);
    console.log("");
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(c("Install this plugin? [y/N] ", "yellow"));
  rl.close();
  if (answer.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  // Copy
  fs.mkdirSync(USER_PLUGINS_DIR, { recursive: true, mode: 0o700 });
  copyDir(sourcePath, targetPath);

  // Update config
  const cfg = readConfig();
  cfg.installedPlugins = cfg.installedPlugins || [];
  if (!cfg.installedPlugins.includes(pluginName)) cfg.installedPlugins.push(pluginName);
  writeConfig(cfg);

  console.log("");
  console.log(c(`✓ Installed: ${pluginName}`, "green"));
  console.log(`  Path: ${targetPath}`);
  console.log("");
}

export async function pluginUninstall(name: string): Promise<void> {
  const targetPath = path.join(USER_PLUGINS_DIR, name);
  if (!fs.existsSync(targetPath)) {
    console.error(c(`✗ Not installed: ${name}`, "yellow"));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(c(`Remove ${name} from ${targetPath}? [y/N] `, "yellow"));
  rl.close();
  if (answer.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });

  const cfg = readConfig();
  cfg.installedPlugins = (cfg.installedPlugins || []).filter((p: string) => p !== name);
  writeConfig(cfg);

  console.log(c(`✓ Uninstalled: ${name}`, "green"));
}

export function pluginSearch(query: string): void {
  const q = query.toLowerCase();
  const all = listAll();
  const matches = all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
  );

  console.log("");
  if (matches.length === 0) {
    console.log(c(`No plugins matching "${query}"`, "yellow"));
    return;
  }

  console.log(c(`Matches for "${query}" (${matches.length}):`, "bold"));
  for (const p of matches) {
    const badge = p.location === "user" ? c("[installed]", "green") : c("[bundled]", "dim");
    console.log(`  ${c(p.name, "cyan")}  ${badge}  ${c("v" + (p.version || "?"), "dim")}`);
    if (p.description) console.log(`     ${c(p.description, "dim")}`);
  }
}

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true, mode: 0o700 });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

// ── plugin scaffold ──────────────────────────────────────────────────
//
// Creates a fresh plugin skeleton in the current directory under
// <name>/, ready to build with `pnpm install && pnpm run build`.

const PACKAGE_JSON_TPL = (name: string) => `{
  "name": "@your-org/plugin-${name}",
  "version": "0.1.0",
  "description": "${name} plugin for OpenVesper",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@openvesper/plugin-sdk": "^1.13.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
`;

const TSCONFIG_TPL = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
`;

const INDEX_TS_TPL = (name: string, displayName: string) => `// ============================================================
// 🌒 @your-org/plugin-${name}
//
// ${displayName} plugin for OpenVesper.
// ============================================================

import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";

export default definePlugin({
  name: "@your-org/plugin-${name}",
  version: "0.1.0",
  description: "${displayName} plugin",

  tools: [
    defineTool({
      name: "${name}_hello",
      description: "Returns a greeting from the ${name} plugin",
      inputSchema: inputSchema(
        {
          name: { type: "string", description: "Who to greet" },
        },
        ["name"]
      ),
      handler: async (input) => {
        const { name } = input as { name: string };
        return {
          success: true,
          data: { greeting: \`Hello, \${name}, from ${name} plugin!\` },
        };
      },
    }),

    // Add more tools here. Each tool gets a name, description, JSON schema,
    // and async handler that returns { success, data } or { success: false, error }.
  ],
});
`;

const PLUGIN_JSON_TPL = (name: string, displayName: string) => `{
  "name": "@your-org/plugin-${name}",
  "displayName": "${displayName}",
  "version": "0.1.0",
  "description": "${displayName} plugin for OpenVesper",
  "author": "your-org",
  "homepage": "https://github.com/your-org/openvesper-plugin-${name}",
  "tools": ["${name}_hello"],
  "permissions": ["read"]
}
`;

const README_TPL = (name: string, displayName: string) => `# @your-org/plugin-${name}

${displayName} plugin for [OpenVesper](https://github.com/openvesper/openvesper).

## Install

\`\`\`bash
pnpm install
pnpm run build
\`\`\`

## Use

\`\`\`typescript
import { createVesper } from "@openvesper/core";
import ${name}Plugin from "@your-org/plugin-${name}";

const vesper = createVesper({ llm: { provider: "anthropic" } })
  .use(${name}Plugin);

// Now agents can call ${name}_hello
\`\`\`

## Tools

| Name | Description |
|------|-------------|
| \`${name}_hello\` | Returns a greeting |

## License

MIT
`;

const GITIGNORE_TPL = `node_modules/
dist/
.env
*.log
.DS_Store
`;

export function pluginScaffold(name: string): void {
  if (!name) {
    console.error("Usage: vesper plugin scaffold <name>");
    console.error("  Example: vesper plugin scaffold weather");
    process.exit(1);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(c("✗ Invalid plugin name", "red"));
    console.error(c("  Use lowercase letters, digits, and hyphens only (e.g. 'weather', 'my-tool').", "dim"));
    process.exit(1);
  }

  const dst = path.resolve(process.cwd(), name);
  if (fs.existsSync(dst)) {
    console.error(c(`✗ Directory '${name}' already exists`, "red"));
    console.error(c("  Pick a different name or remove the existing directory first.", "dim"));
    process.exit(1);
  }

  const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " ");

  console.log("");
  console.log(c(c(`🌒 Scaffolding new OpenVesper plugin: `, "cyan"), "bold") + c(name, "bold"));
  console.log(c(`   Location: ${dst}`, "dim"));
  console.log("");

  // Create structure
  fs.mkdirSync(dst);
  fs.mkdirSync(path.join(dst, "src"));

  fs.writeFileSync(path.join(dst, "package.json"), PACKAGE_JSON_TPL(name));
  fs.writeFileSync(path.join(dst, "tsconfig.json"), TSCONFIG_TPL);
  fs.writeFileSync(path.join(dst, "src", "index.ts"), INDEX_TS_TPL(name, displayName));
  fs.writeFileSync(path.join(dst, "plugin.json"), PLUGIN_JSON_TPL(name, displayName));
  fs.writeFileSync(path.join(dst, "README.md"), README_TPL(name, displayName));
  fs.writeFileSync(path.join(dst, ".gitignore"), GITIGNORE_TPL);

  console.log(c("  ✓", "green") + c(" Created package.json", "dim"));
  console.log(c("  ✓", "green") + c(" Created tsconfig.json", "dim"));
  console.log(c("  ✓", "green") + c(" Created src/index.ts with a sample tool", "dim"));
  console.log(c("  ✓", "green") + c(" Created plugin.json manifest", "dim"));
  console.log(c("  ✓", "green") + c(" Created README.md", "dim"));
  console.log(c("  ✓", "green") + c(" Created .gitignore", "dim"));
  console.log("");
  console.log(c("Next steps:", "bold"));
  console.log(`  ${c("cd", "cyan")} ${name}`);
  console.log(`  ${c("pnpm install", "cyan")}`);
  console.log(`  ${c("pnpm run build", "cyan")}`);
  console.log("");
  console.log(c("Then to install into your OpenVesper workspace:", "dim"));
  console.log(`  ${c("vesper plugin install", "cyan")} ${c(".", "dim")}`);
  console.log("");
}
