import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>CLI Commands Reference</h1>
      <p className="lead">
        Full reference for the <code>vesper</code> CLI.
      </p>

      <h2>Global</h2>
      <pre><code>{`vesper --help
vesper -q "<message>"                    # run a query with default agent
vesper -q "<message>" -a <mode>          # explicit agent
vesper -q "/status"                      # slash commands work too`}</code></pre>

      <h2>agent</h2>
      <pre><code>{`vesper agent list                        # installed agents
vesper agent list --all                  # + bundled
vesper agent registry                    # full catalog
vesper agent search <query>              # match name/tag/description
vesper agent show <mode>                 # detail view
vesper agent install <mode>              # copy bundled → user dir
vesper agent uninstall <mode>            # remove user-installed
vesper agent start <mode>                # set default
vesper agent stop                        # revert to "auto"
vesper agent run <mode> "<msg>"          # one-off run
vesper agent create <mode>               # scaffold new agent`}</code></pre>

      <h2>gateway</h2>
      <pre><code>{`vesper gateway start                     # foreground
vesper gateway start --detach            # background
vesper gateway stop
vesper gateway status
vesper gateway logs --lines 100`}</code></pre>

      <h2>memory</h2>
      <pre><code>{`vesper memory write <agent> "<content>" [--tag X --ttl-hours N]
vesper memory list <agent> [--tag X] [--json]
vesper memory search <agent> "<query>"
vesper memory delete <agent> <id>
vesper memory clear <agent>
vesper memory stats                      # workspace-wide
vesper memory compact                    # workspace-wide`}</code></pre>

      <h2>plugin</h2>
      <pre><code>{`vesper plugin list                       # installed plugins
vesper plugin list --all                 # + bundled
vesper plugin info <name>
vesper plugin install <path>             # local plugin dir
vesper plugin uninstall <name>
vesper plugin search <query>`}</code></pre>

      <h2>oauth</h2>
      <pre><code>{`vesper oauth login <provider> --client-id <id> [--client-secret <s>] [--scopes a,b,c]
vesper oauth list
vesper oauth logout <provider>`}</code></pre>

      <h2>skill</h2>
      <pre><code>{`vesper skill list [--source bundled|user] [--json]
vesper skill install <path>              # local SKILL.md path or dir`}</code></pre>

      <h2>cron</h2>
      <pre><code>{`vesper cron list                         # heartbeat-enabled agents
vesper cron status
vesper cron reload                       # re-scan .agents/`}</code></pre>

      <h2>doctor</h2>
      <pre><code>{`vesper doctor                            # health checks: API keys, agents, plugins`}</code></pre>

      <h2>workspace</h2>
      <pre><code>{`vesper workspace list
vesper workspace create <name>
vesper workspace remove <name>`}</code></pre>

      <h2>Slash commands (work inside -q)</h2>
      <p>See <Link href="/docs/gateway/slash-commands">Slash Commands</Link>.</p>
    </div>
  );
}
