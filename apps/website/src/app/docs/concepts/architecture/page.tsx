import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Architecture</h1>
      <p className="lead">
        Hub-and-spoke. One persistent gateway process, many channels and tools
        attached. Everything runs on your machine; no OpenVesper servers exist.
      </p>

      <h2>Top-level layout</h2>
      <pre><code>{`     ┌──────────────────────────────────────────────────────────┐
     │                  ⚙ Gateway (127.0.0.1:18789)             │
     │                                                          │
     │  agent-loop  session-lane  command-queue  context-engine │
     │  router      delegate      compaction     memory-engine  │
     │  oauth       audit         approvals      tasks          │
     │  standing    commitments   heartbeat      streaming      │
     │  channel-routing  access-groups  workspaces  remote      │
     │                                                          │
     └──┬─────────────┬─────────────┬─────────────┬─────────────┘
        │             │             │             │
   ┌────▼────┐  ┌─────▼────┐  ┌─────▼────┐  ┌─────▼────┐
   │   CLI   │  │ Telegram │  │  Slack   │  │ Discord  │
   └─────────┘  └──────────┘  └──────────┘  └──────────┘`}</code></pre>

      <h2>Why a persistent gateway</h2>
      <ul>
        <li>One session shared across channels (<Link href="/docs/concepts/channel-docking">channel docking</Link>)</li>
        <li>Scheduled heartbeats can run when no channel is open</li>
        <li>Background tasks survive between requests</li>
        <li>OAuth flows + WebSocket streams need a long-lived process</li>
        <li>Compaction, audit, memory engine all need shared state</li>
      </ul>

      <h2>What runs in-process</h2>
      <p>The gateway holds all runtime state. Files on disk are the source of truth, but during operation everything lives in one Node process:</p>
      <ul>
        <li>Session cache (LRU, 100 active, 200 messages each)</li>
        <li>Per-session lanes + global concurrency limit</li>
        <li>Command queue with per-session mode</li>
        <li>Run registry (in-flight + 30min completed history)</li>
        <li>Hook listeners (plugin extensibility)</li>
        <li>WS clients tracking + broadcast</li>
        <li>Tool loop detector state</li>
      </ul>

      <h2>What's persisted</h2>
      <p>See <Link href="/docs/reference/file-layout">file layout</Link>. Briefly:</p>
      <ul>
        <li>Sessions — <code>~/.openvesper/workspace/sessions/</code></li>
        <li>Memory entries — per-agent dir</li>
        <li>OAuth tokens, tasks, standing orders, commitments, approvals — <code>~/.openvesper/</code> root</li>
        <li>Audit logs — daily JSONL files</li>
      </ul>

      <h2>Channels are plugins</h2>
      <p>
        Telegram, Slack, Discord, etc. are just plugins. They open a transport
        (long-poll, WebSocket) and send messages to the gateway. No special
        treatment.
      </p>

      <h2>Plugins are sandboxed</h2>
      <p>
        See <Link href="/docs/gateway/sandboxing">sandboxing</Link>. Tools
        declare permissions; mutation/filesystem/shell tools route through{" "}
        <Link href="/docs/gateway/approvals">approvals</Link>.
      </p>

      <h2>Multiple gateways possible</h2>
      <p>
        See <Link href="/docs/gateway/workspaces">workspaces</Link>. Each
        gateway gets its own port + isolated state.
      </p>

      <h2>Source</h2>
      <p>Implementation: <code>apps/gateway/src/</code> (28 files).</p>
    </div>
  );
}
