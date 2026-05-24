# 🌒 @openvesper/cli

The OpenVesper command-line interface.

## Install

```bash
npm install -g @openvesper/cli
```

## Quick Start

```bash
# First-time setup
vesper onboard

# Health check
vesper doctor

# List installed agents
vesper agent list

# Test an agent's bootstrap files
vesper agent test security-reviewer

# Create a new agent (interactive)
vesper agent create

# List skills (with full precedence chain)
vesper skill list

# Show details of a specific skill
vesper skill info pre-trade-checklist

# Run an agent
vesper agent --mode defi-strategist --query "Where to park stables?"
```

## Subcommands

### `vesper doctor`
Health check — verifies Node version, pnpm, workspace, config, env vars, LLM providers, agents/skills dirs, port availability, file permissions.

```bash
vesper doctor
vesper doctor --fix    # apply suggested fixes (coming soon)
```

### `vesper onboard`
Interactive setup wizard — workspace, LLM provider, channels, skills, daemon.

```bash
vesper onboard
vesper onboard --install-daemon
vesper onboard --resume
```

### `vesper workspace init`
Initialize `~/.openvesper/` workspace.

```bash
vesper workspace init
vesper workspace init --force    # overwrite existing
```

### `vesper agent <subcommand>`

```bash
vesper agent list                              # tabular list
vesper agent list --json                       # JSON output
vesper agent list --category crypto            # filter by tag
vesper agent test <mode>                       # validate bootstrap files
vesper agent test <mode> --prompt "..."        # also test with prompt
vesper agent create                            # interactive wizard
vesper agent create my-agent                   # skip mode prompt
```

### `vesper skill <subcommand>`

```bash
vesper skill list                              # all skills, grouped by source
vesper skill list --json
vesper skill list --source bundled             # only project-wide
vesper skill info <name>                       # show full SKILL.md
vesper skill install <source>                  # install from path/npm/github
```

### `vesper memory <subcommand>`

```bash
vesper memory stats                            # session + agent memory stats
vesper memory compact                          # trim to last 500 items
```

## Legacy Direct Options

The old flat syntax still works:

```bash
vesper --list-agents
vesper --list-tools
vesper --list-skills
vesper --validate
vesper --agent defi-strategist --query "..."
```

## Skill Precedence

`vesper skill list` shows skills grouped by source, in precedence order:

1. **workspace** — `~/.openvesper/workspace/skills/`
2. **project-agent** — `./.agents/<agent>/skills/`
3. **personal-agent** — `~/.openvesper/agents/<agent>/skills/`
4. **managed** — `~/.openvesper/skills/`
5. **bundled** — `./skills/`

When two skills share a name, the higher-precedence one wins.
