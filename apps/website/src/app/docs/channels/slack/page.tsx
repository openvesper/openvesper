import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Slack</h1>
      <p className="lead">
        Post messages from your agents to a Slack channel, or set up
        bidirectional chat with a Slack app.
      </p>

      <h2>Quick setup — Incoming webhooks (one-way)</h2>
      <p>
        Simplest. Your agent posts to Slack; users don't reply through OpenVesper.
      </p>

      <ol>
        <li>Go to <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">api.slack.com/messaging/webhooks</a></li>
        <li>Create a new app, enable incoming webhooks, install in your workspace</li>
        <li>Copy the webhook URL</li>
        <li>Set the env var:</li>
      </ol>

      <pre><code>{`echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/..." >> ~/.openvesper/.env`}</code></pre>

      <p>That's it. Test:</p>

      <pre><code>{`node apps/cli/dist/index.js -q "Use slack_send to post 'hello from openvesper' to my channel"`}</code></pre>

      <h2>Full setup — Slack app (bidirectional)</h2>
      <p>
        If you want team members to message the agent and get replies:
      </p>

      <ol>
        <li>Create a Slack app at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a></li>
        <li>
          Enable these scopes under "OAuth & Permissions":
          <ul>
            <li><code>chat:write</code> — post messages</li>
            <li><code>app_mentions:read</code> — see when someone @-mentions the bot</li>
            <li><code>im:history</code>, <code>im:read</code>, <code>im:write</code> — DM support</li>
          </ul>
        </li>
        <li>Install the app to your workspace</li>
        <li>Copy the bot token (starts with <code>xoxb-</code>)</li>
        <li>Enable Event Subscriptions, set your webhook URL to where you're running OpenVesper</li>
      </ol>

      <pre><code>{`echo "SLACK_BOT_TOKEN=xoxb-..." >> ~/.openvesper/.env
echo "SLACK_SIGNING_SECRET=..." >> ~/.openvesper/.env`}</code></pre>

      <h2>Tools the plugin exposes</h2>
      <ul>
        <li><code>slack_send</code> — Post message to a channel</li>
        <li><code>slack_send_dm</code> — Direct message to a user</li>
        <li><code>slack_thread_reply</code> — Reply in a thread</li>
        <li><code>slack_get_channel_history</code> — Read recent messages</li>
        <li><code>slack_search</code> — Search workspace messages</li>
      </ul>

      <h2>Security notes</h2>
      <ul>
        <li>Slack tokens are sensitive — store in <code>~/.openvesper/.env</code> (perm 0600)</li>
        <li>Verify webhook signatures using <code>SLACK_SIGNING_SECRET</code></li>
        <li>The Slack plugin uses <code>permission: "external"</code> for sends and <code>permission: "mutation"</code> for cross-channel actions</li>
      </ul>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/channels">Channels overview</Link></li>
        <li><Link href="/docs/automation/webhook">Webhook routing</Link></li>
      </ul>
    </div>
  );
}
