import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Channels</h1>
      <p className="lead">
        Talk to your agents from chat apps you already use. OpenVesper agents
        can receive messages from Telegram, Slack, and Discord, and can push
        messages back to you the same way.
      </p>

      <h2>Why channels?</h2>
      <p>
        Running an agent only via the CLI works for development, but real
        usage looks different:
      </p>
      <ul>
        <li>You're away from your desk and want to ping your agent</li>
        <li>Your agent runs on a schedule (cron) and needs to push results somewhere</li>
        <li>A webhook fires and the agent needs to alert you</li>
      </ul>

      <p>
        Channels solve all three. Set up a Telegram bot (or Slack workspace,
        or Discord server), point OpenVesper at it, and start chatting.
      </p>

      <h2>Available channels</h2>

      <h3><Link href="/docs/channels/telegram">Telegram</Link></h3>
      <p>
        Easiest to set up. One bot token, one chat ID. Bidirectional.
        Supports inline keyboards for approving sensitive tool calls.
      </p>

      <h3><Link href="/docs/channels/slack">Slack</Link></h3>
      <p>
        Good for team use. Set up a Slack app, install in your workspace.
        Agent posts to a channel; team members can reply.
      </p>

      <h3><Link href="/docs/channels/discord">Discord</Link></h3>
      <p>
        Bot + webhook combo. Useful for community-driven setups or
        public alerts.
      </p>

      <h2>How they work</h2>

      <p>
        Each channel is a plugin (<code>telegram</code>, <code>slack</code>,{" "}
        <code>discord</code>) with tools that send messages, plus an
        inbound listener that converts incoming messages into agent prompts.
      </p>

      <p>The flow:</p>
      <pre><code>{`User on phone → Telegram → bot.sendMessage()
                            ↓
            OpenVesper webhook/poll listener
                            ↓
            Runtime picks active agent, runs LLM loop
                            ↓
            Result → Telegram → user`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/channels/telegram">Telegram setup</Link></li>
        <li><Link href="/docs/channels/slack">Slack setup</Link></li>
        <li><Link href="/docs/channels/discord">Discord setup</Link></li>
        <li><Link href="/docs/automation/webhook">Webhook routing</Link></li>
      </ul>
    </div>
  );
}
