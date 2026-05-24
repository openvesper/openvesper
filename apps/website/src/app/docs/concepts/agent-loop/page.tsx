import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Agent Loop</h1>
      <p className="lead">
        The core execution cycle that turns a user message into an agent reply.
        Every message — from CLI, Telegram, Discord, web — goes through the
        same loop.
      </p>

      <h2>Lifecycle</h2>
      <pre><code>{`intake → command-check → lane-acquire → context → model → tools → persist → drain-queue`}</code></pre>

      <ol>
        <li><strong>Intake</strong> — receive message from a channel, record metadata (sessionKey, channel, agent)</li>
        <li><strong>Command-check</strong> — slash commands (<code>/reset</code>, <code>/status</code>, etc.) handled inline, no LLM call</li>
        <li><strong>Lane-acquire</strong> — see <Link href="/docs/concepts/command-queue">Command Queue</Link>. If session is busy, queue or steer.</li>
        <li><strong>Context</strong> — <Link href="/docs/concepts/context-engine">Context Engine</Link> builds the system prompt from 10 layers</li>
        <li><strong>Model</strong> — call the LLM with assembled context + recent messages</li>
        <li><strong>Tools</strong> — if LLM wants to call tools, execute them (with permission checks)</li>
        <li><strong>Persist</strong> — append user message + assistant reply to session store</li>
        <li><strong>Drain-queue</strong> — process any messages queued while busy</li>
      </ol>

      <h2>Hooks fired during the loop</h2>
      <ul>
        <li><code>agent:bootstrap</code> — before model call, after context built</li>
        <li><code>agent:tool-call</code> — when LLM decides to call a tool</li>
        <li><code>agent:tool-result</code> — after tool execution returns</li>
        <li><code>agent:complete</code> — final reply ready</li>
        <li><code>agent:error</code> — anything fails</li>
        <li><code>agent:queued</code> — run rejected, message queued</li>
      </ul>

      <p>
        Plugins can register handlers for these hooks to extend behavior
        without modifying core. See <Link href="/docs/tools/plugin-sdk">Plugin SDK</Link>.
      </p>

      <h2>Sync vs async</h2>
      <p>
        The gateway exposes two ways to run an agent loop:
      </p>
      <ul>
        <li><strong>Sync</strong> — <code>POST /agent</code> blocks the HTTP connection until the loop finishes</li>
        <li><strong>Async</strong> — <code>POST /agent/async</code> returns <code>&#123; runId, acceptedAt &#125;</code> immediately. Use <code>POST /agent/run/:runId/wait</code> to block, or <code>POST /agent/run/:runId/abort</code> to cancel.</li>
      </ul>

      <h2>Source</h2>
      <p>
        Implementation: <code>apps/gateway/src/agent-loop.ts</code>.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/command-queue">Command Queue</Link> — what happens when a new message arrives mid-run</li>
        <li><Link href="/docs/concepts/context-engine">Context Engine</Link> — how the system prompt is assembled</li>
        <li><Link href="/docs/gateway">Gateway Overview</Link></li>
      </ul>
    </div>
  );
}
