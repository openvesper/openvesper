import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>File Layout</h1>
      <p className="lead">
        Where OpenVesper stores everything on disk. All paths under{" "}
        <code>~/.openvesper/</code> are mode 0700 (directories) or 0600 (files).
      </p>

      <h2>User directory tree</h2>
      <pre><code>{`~/.openvesper/
├── config.json                       # default agent, installed lists
├── workspace/
│   └── sessions/
│       └── <safe-key>.json           # one file per session
├── agents/                           # user-installed agents
│   └── <mode>/
│       ├── SOUL.md
│       ├── IDENTITY.md
│       ├── USER.md
│       ├── TOOLS.md
│       ├── HEARTBEAT.md
│       ├── MEMORY.md
│       ├── memory/                   # active memory entries
│       │   └── m_<id>.json
│       └── skills/
│           └── <name>/SKILL.md
├── tokens/                           # OAuth tokens
│   └── <provider>.json
├── tasks/                            # background tasks
│   └── t_<id>.json
├── audit/                            # daily JSONL logs
│   └── YYYY-MM-DD.jsonl
├── plugins/                          # user-installed plugins
│   └── <name>/
├── workspaces/                       # additional gateway profiles
│   └── <name>/
│       ├── gateway.pid
│       └── agents/
├── workspaces.json
├── standing-orders.json
├── commitments.json
├── approvals.json
├── approval-rules.json
├── channel-routes.json
├── access.json
├── gateway.log
└── openvesper-diag-<ts>.json         # diagnostics exports`}</code></pre>

      <h2>Repo layout (bundled)</h2>
      <pre><code>{`openvesper/
├── apps/
│   ├── cli/
│   ├── gateway/
│   ├── telegram-bot/      # separate process, user-installed
│   ├── vscode-extension/
│   └── website/           # docs + marketing
├── packages/
│   ├── core/
│   ├── plugin-sdk/
│   └── plugins/<name>/
├── .agents/               # bundled agent directories
│   └── <mode>/...
├── config/                # cron.yaml, webhooks.yaml templates
├── scripts/
└── test/`}</code></pre>

      <h2>File permissions</h2>
      <table>
        <thead><tr><th>Mode</th><th>Used for</th></tr></thead>
        <tbody>
          <tr><td><code>0600</code></td><td>All session, token, memory, audit, config files</td></tr>
          <tr><td><code>0700</code></td><td>Directories under <code>~/.openvesper/</code></td></tr>
        </tbody>
      </table>

      <h2>Cross-reference</h2>
      <ul>
        <li><Link href="/docs/gateway/security">Security policy</Link></li>
        <li><Link href="/docs/reference/env-vars">Environment Variables</Link></li>
      </ul>
    </div>
  );
}
