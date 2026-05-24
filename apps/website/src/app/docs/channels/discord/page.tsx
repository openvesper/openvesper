import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Discord</h1>
      <p className="lead">
        Send messages to Discord via webhook or bot API. You configure your own
        webhook URL or bot token — we don't bundle any.
      </p>

      <h2>Setup options</h2>

      <h3>Option A: Webhook (simplest)</h3>
      <ol>
        <li>Open your Discord server → channel settings → Integrations → Webhooks → "New Webhook"</li>
        <li>Copy the webhook URL</li>
        <li>Set <code>DISCORD_WEBHOOK_URL</code> in your environment</li>
      </ol>

      <h3>Option B: Bot (more powerful)</h3>
      <ol>
        <li>Create an application at <a href="https://discord.com/developers/applications" rel="noopener">discord.com/developers</a></li>
        <li>Add a bot, copy the token</li>
        <li>Invite the bot to your server (OAuth2 URL generator with <code>bot</code> scope + <code>Send Messages</code> permission)</li>
        <li>Set <code>DISCORD_BOT_TOKEN</code> in your environment</li>
      </ol>

      <h2>Tools provided</h2>
      <table>
        <thead><tr><th>Tool</th><th>Requires</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>discord_send</code></td><td><code>DISCORD_WEBHOOK_URL</code></td><td>Plain text to webhook</td></tr>
          <tr><td><code>discord_send_embed</code></td><td><code>DISCORD_WEBHOOK_URL</code></td><td>Rich embed (title + description + url)</td></tr>
          <tr><td><code>discord_send_bot</code></td><td><code>DISCORD_BOT_TOKEN</code></td><td>Message to specific channel ID via bot</td></tr>
        </tbody>
      </table>

      <h2>All tools are mutation</h2>
      <p>
        Each Discord send is marked <code>permission: "mutation"</code>. By
        default the gateway prompts via{" "}
        <Link href="/docs/gateway/approvals">approvals</Link>. Add an auto-allow
        rule if you trust the tool:
      </p>
      <pre><code>{`curl -X POST http://127.0.0.1:18789/approvals/rules \\
  -d '{
    "toolPattern": "discord_*",
    "agent": "*",
    "policy": "auto-allow",
    "reason": "trusted Discord channel"
  }'`}</code></pre>

      <h2>Privacy</h2>
      <p>
        Messages go directly from your gateway to Discord's API. No OpenVesper
        servers involved.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>packages/plugins/discord/</code></p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/channels/routing">Channel Routing</Link></li>
        <li><Link href="/docs/gateway/approvals">Approvals</Link></li>
      </ul>
    </div>
  );
}
