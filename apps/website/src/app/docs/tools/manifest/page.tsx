import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Plugin Manifest</h1>
      <p className="lead">
        The <code>plugin.json</code> file declares your plugin's permissions,
        exports, and required config. Surfaced to users at install time so
        they know what they're consenting to.
      </p>

      <h2>Example</h2>
      <pre><code>{`{
  "name": "telegram-channel",
  "version": "1.0.0",
  "description": "Telegram bot channel for OpenVesper",
  "author": "your name",
  "license": "MIT",
  "openvesperVersion": ">=1.7.0",
  "permissions": ["external", "mutation"],
  "exports": {
    "tools": ["telegram_send", "telegram_reply"],
    "agents": [],
    "channels": ["telegram"]
  },
  "config": {
    "TELEGRAM_BOT_TOKEN": {
      "required": true,
      "type": "string",
      "secret": true,
      "description": "Bot token from @BotFather"
    },
    "TELEGRAM_ALLOWED_CHATS": {
      "required": false,
      "type": "string[]",
      "description": "Comma-separated chat IDs to allow"
    }
  },
  "tags": ["channel", "messaging"],
  "repository": "https://github.com/openvesper/plugin-telegram"
}`}</code></pre>

      <h2>Permission categories</h2>
      <table>
        <thead><tr><th>Permission</th><th>What it allows</th></tr></thead>
        <tbody>
          <tr><td><code>read</code></td><td>Read-only API calls, file reads</td></tr>
          <tr><td><code>external</code></td><td>Outbound API calls (general internet)</td></tr>
          <tr><td><code>mutation</code></td><td>Send messages, post, alter remote state</td></tr>
          <tr><td><code>filesystem</code></td><td>Write to user's filesystem</td></tr>
          <tr><td><code>shell</code></td><td>Run shell commands</td></tr>
        </tbody>
      </table>

      <h2>Install-time consent</h2>
      <p>When user runs <code>vesper plugin install &lt;path&gt;</code>, the CLI summarizes the manifest and asks for confirmation:</p>
      <pre><code>{`📦 telegram-channel v1.0.0
   Telegram bot channel for OpenVesper

Requested permissions:
  - external: make external API calls
  - mutation: perform mutating actions

Exports:
  Tools:    telegram_send, telegram_reply
  Channels: telegram

Required config:
  - TELEGRAM_BOT_TOKEN (string, secret)

Install this plugin? [y/N]`}</code></pre>

      <h2>Validating</h2>
      <pre><code>{`import { manifestValidator } from "@openvesper/plugin-sdk";

const { valid, errors } = manifestValidator.validate(myManifest);
if (!valid) console.error(errors);`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/tools/plugin-sdk">Plugin SDK</Link></li>
        <li><Link href="/docs/tools/testing">Testing Helpers</Link></li>
      </ul>
    </div>
  );
}
