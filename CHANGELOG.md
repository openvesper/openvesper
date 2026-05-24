# Changelog

## 1.16.0 — Skills v2 (multi-source loader, gating, allowlist) + install polish

Major upgrade to the skills system to match OpenClaw's loading semantics,
plus install lifecycle commands.

### Skills system rewrite

**Multi-source loader** with 6 precedence levels (highest wins):
1. `<cwd>/skills/`               — workspace
2. `<cwd>/.agents/skills/`       — project-agent
3. `~/.agents/skills/`           — personal-agent
4. `~/.openvesper/skills/`       — managed
5. bundled (shipped with install)
6. `skills.load.extraDirs`       — extra (config)

Same skill name in two sources → higher-precedence copy wins. Mirrors
OpenClaw / AgentSkills semantics so existing skills work without changes.

**Load-time gating** via frontmatter `metadata.openvesper`:
```yaml
---
name: image-lab
metadata: {"openvesper": {"requires": {"bins": ["uv"], "env": ["GEMINI_API_KEY"]}}}
---
```
Gating fields supported: `os`, `requires.bins`, `requires.anyBins`,
`requires.env`, `requires.config` (dotted path against openvesper.json),
`primaryEnv`, `emoji`, `homepage`, `always`. Legacy `metadata.openclaw`
also accepted so AgentSkills-compatible skills work as-is.

**Per-agent allowlist** via `agents.list[].skills`:
```json5
{
  agents: {
    defaults: { skills: ["github", "weather"] },
    list: [
      { id: "writer" },                              // inherits defaults
      { id: "researcher", skills: ["docs-search"] }, // replaces defaults
      { id: "locked", skills: [] },                  // no skills
    ],
  },
}
```
Non-empty array replaces defaults (no merge). Empty array means no skills.
Missing entry inherits defaults. Missing config means unrestricted.

**Token impact estimation** — deterministic formula matching OpenClaw:
`total = 195 + Σ (97 + name + description + location)` characters.
Lets you see prompt overhead before adding skills.

**Skills watcher** — when `OPENVESPER_DEV=1` or `skills.load.watch: true`
in config, the gateway watches all 6 source dirs and bumps the snapshot
on `.md` changes. New SKILL.md files are picked up by the next session
automatically (no rebuild needed — skills are pure markdown).

### New CLI: `vesper skills`

| Subcommand | Purpose |
|------------|---------|
| `vesper skills list [--all]` | Eligible skills grouped by source, with token estimate |
| `vesper skills info <name>` | Skill detail: source, gating status, requires.*, body preview |
| `vesper skills sources` | Show all 6 source dirs and which exist |
| `vesper skills install <git:owner/repo[@ref]>` | Install from GitHub (shallow clone) |
| `vesper skills install ./path` | Install from local directory |
| `vesper skills install <src> --global` | Install to `~/.openvesper/skills/` |
| `vesper skills install <src> --as <name>` | Override inferred name |
| `vesper skills update <name>` | Re-fetch a git-installed skill |
| `vesper skills uninstall <name>` | Remove a managed skill |

Registry tracked at `~/.openvesper/skills-registry.json` (mode 0600).

The original `vesper skill` (singular) commands remain as legacy aliases.

### Install polish

- **Windows installer:** new `scripts/install.ps1`
  - Auto-detects / installs Node via winget (Windows 10+) or MSI download
  - Auto-installs pnpm via npm
  - Auto-installs git via winget if missing
  - Creates `vesper.cmd` and `vesper.ps1` shims in `%LOCALAPPDATA%\Microsoft\WindowsApps`
  - Runs `vesper onboard` on completion (unless `$env:OPENVESPER_NO_ONBOARD = "1"`)

- **macOS/Linux installer (`install.sh`):** now auto-installs Node via `fnm` if
  missing or version is too old. No more "install node first" failure.

### New CLI: `vesper update` and `vesper uninstall`

`vesper update`:
- Refuses if the install dir isn't a git checkout (suggests npm path)
- Refuses if the working tree is dirty (override with `--force`)
- Pulls latest, runs `pnpm install` + `pnpm -r build`
- Supports channel switching: `vesper update --channel stable|dev`

`vesper uninstall`:
- Stops the gateway daemon (best-effort: launchctl/systemctl)
- Removes the install dir
- Keeps `~/.openvesper/` by default (use `--purge` to also wipe sessions, OAuth, .env)
- Asks for confirmation (skip with `--yes`)

### npm publish prep

- `apps/cli/package.json` already had `bin: { vesper, openvesper }` — confirmed
  + added `publishConfig.access: public` and `files: [dist, README.md]`
- All 55 packages now publish-ready

### Type additions

`SkillDefinition` extended with: `source`, `dir`, `always`, `os`,
`requiresBins`, `requiresAnyBins`, `requiresEnv`, `requiresConfig`,
`primaryEnv`, `emoji`, `homepage`, `userInvocable`, `disableModelInvocation`.

### Sandbox-verified

- 18/18 tests still pass
- Loader: 6-source precedence with conflict resolution confirmed
- Gating: missing bin / missing env / OS filter all working
- Allowlist: defaults inheritance, override, empty array, no-config all working
- `vesper skills install` from local directory copies correctly
- `vesper skills list/info/sources` render correctly
- `vesper update` correctly detects non-git installs
- `vesper uninstall` correctly enumerates removable items and asks for confirmation


### Docker image — multi-arch + GitHub Actions

- **Rewrote `Dockerfile`** — proper multi-stage build, correct port (18789),
  non-root user `vesper`, HEALTHCHECK against `/health`, workspace volume at
  `/home/vesper/.openvesper`.
- **New `.dockerignore`** — excludes node_modules, dist, .git, etc.
- **Updated `docker-compose.yml`** — uses the published GHCR image, binds
  to loopback only, persists workspace to `./openvesper-workspace/`.
- **New `.github/workflows/docker.yml`** — builds multi-arch images
  (linux/amd64, linux/arm64) via buildx + QEMU, pushes to
  `ghcr.io/openvesper/openvesper`. Tag scheme:
  - `main` on push to main branch
  - `<version>`, `<major.minor>`, `latest` on release tags (`v*.*.*`)
  - short SHA on every build
  Plus a smoke-test job that pulls the image and verifies `/health` answers.

### Skill Workshop plugin

New plugin `@openvesper/plugin-skill-workshop` lets agents propose new
workspace skills during a conversation. Proposals land in a pending queue
under `~/.openvesper/skill-workshop/proposals.json` and the user reviews
each one before it's written to disk.

**Tools:**
- `skill_workshop_propose` — agent submits a new (or updated) skill with
  slug + name + description + body
- `skill_workshop_list` — list proposals filtered by status
- `skill_workshop_view` — read the full body of a proposal
- `skill_workshop_approve` — write proposal to
  `<cwd>/skills/<slug>/SKILL.md` (refuses paths outside the workspace)
- `skill_workshop_reject` — reject with optional reason
- `skill_workshop_prune` — clean up old decided proposals

**Safety scanner** runs on every proposal and flags critical issues:
- Possible API keys (sk-..., AKIA..., gho_..., -----BEGIN PRIVATE KEY-----)
- `curl ... | sh` patterns
- `rm -rf /`, `sudo`, `chmod 777`, `eval()`
- Inline credential pairs (`password: "..."`)

Critical findings auto-quarantine the proposal; user can still approve
with `force: true` after reading the body. Non-critical warnings flag but
don't block.

This is the closest analogue to OpenClaw's "Skill Workshop" behavior, but
without a remote registry — proposals stay local, are written to the
local workspace, and require explicit user approval (the default mode).

## 1.15.0 — Installer, sandbox, monitor, hot-reload, migrate, secrets

A larger polish release covering most of the remaining medium-priority items.
Everything additive; no breaking changes.

### Single-line installer
`scripts/install.sh` — `curl -fsSL <url> | bash` installer that detects Node
and pnpm (auto-installs pnpm if missing), clones the repo to
`~/.local/share/openvesper`, builds it, and symlinks `vesper` into
`~/.local/bin`. Idempotent — re-runs update an existing checkout.

### Sandbox executor
New `apps/gateway/src/sandbox.ts` — three execution modes for tool handlers:
- **inline** (default) — tool runs in the gateway process, no isolation
- **subprocess** — tool runs in a restricted child Node process with a
  filtered env (only specified vars passthrough). Sandbox-verified:
  ANTHROPIC_API_KEY does not leak into a subprocess that didn't request
  it.
- **docker** — scaffolded, returns an actionable error until per-plugin
  image config is set up

Plugins opt in by setting `sandbox: "subprocess"` on a tool definition.
Existing plugins keep `inline` semantics — zero behavior change.

### `vesper monitor` — terminal dashboard
Polls the gateway every 2s and renders a live dashboard: gateway health,
active sessions, pending approvals, pending pairings, recent audit events.
Raw ANSI output, no Ink dependency. Quit with `q` or Ctrl-C.

### Plugin hot-reload (dev mode)
Set `OPENVESPER_DEV=1` to enable file-watch on plugin source directories.
On change, prints a notice with the rebuild + restart command. Doesn't
auto-restart (active sessions, streaming requests, OAuth flows make that
the wrong default).

### `vesper migrate`
Schema migrations for `~/.openvesper/`. Three migrations bundled:
1. Ensure standard subdirectories exist
2. Tighten file permissions to 0600/0700
3. Add `version` field to config.json

Each migration is idempotent and recorded in
`~/.openvesper/migrations.json`. Supports `--dry-run`.

### Secrets manager
Optional OS keychain integration via `vesper secret`:
- macOS Keychain (`security` CLI, built-in)
- Linux libsecret (`secret-tool`)
- Linux KWallet (`kwalletcli`)
- 1Password CLI (`op`)

Subcommands: `backend`, `list`, `get <NAME>`, `set <NAME>`, `rm <NAME>`.
Detects backend automatically; falls back to standard `.env` files when
no backend is available. ZDR-friendly — keys stay local, no cloud key
management.

### VSCode extension
- Status bar item shows gateway health, refreshes every 10s
- New commands: `OpenVesper: Run Doctor`, `OpenVesper: Show Recent Audit Events`
- New tree view in sidebar: agents grouped by category (Crypto /
  Development / General), click to start agent in chat
- Updated agent list: 20 agents (was 9)
- Updated provider list: 15 providers (was 6)
- `SKILL.md` files registered as a language for future syntax highlighting

### Docs
- New page: `/docs/comparison` — honest side-by-side with LangChain,
  Claude Code, and OpenAI Assistants. Includes "when to pick what" use
  cases and "what OpenVesper is not". Linked from Help section.

### Plugin tooling
- New: `vesper plugin scaffold <name>` — generates a complete plugin
  skeleton (package.json, tsconfig.json, src/index.ts with sample tool,
  plugin.json, README, .gitignore)

### CLI additions (recap)
- `vesper plugin scaffold <name>`
- `vesper init <template>` (crypto-watcher, code-reviewer, blog-writer)
- `vesper repl`
- `vesper monitor`
- `vesper migrate [--dry-run]`
- `vesper secret <backend|list|get|set|rm>`

### Gateway fixes
- `/health` endpoint now reads version from package.json dynamically
  (previously hardcoded "1.7.0", which was misleading on monitor / for
  release identification).

### Sandbox-verified
- 18/18 tests pass
- Sandbox subprocess executor: env restriction confirmed (paid keys
  don't leak)
- Plugin watcher: file change detection works on Linux recursive watch
- Migrate: dry-run does not write `migrations.json`, real run does
- Gateway version reports correctly (`v1.15.0` after this release)

## 1.14.0 — Polish & developer experience

A grab-bag of improvements that make day-2 usage friendlier. No breaking
changes; everything additive.

### New CLI commands

- **`vesper plugin scaffold <name>`** — creates a fresh plugin skeleton
  (package.json, tsconfig.json, src/index.ts with a sample tool,
  plugin.json manifest, README, .gitignore). Drop-in ready for
  `pnpm install && pnpm run build`.

- **`vesper init <template>`** — quick-start project templates. Three to
  start: `crypto-watcher` (bags-hunter + cron heartbeats), `code-reviewer`
  (PR review automation), `blog-writer` (drafting from prompts). Each
  template creates `.env.example`, `openvesper.json`, `README.md`, and
  optional `cron.yaml`.

- **`vesper repl`** — interactive prompt. Maintains conversation history
  across turns within the session. Slash commands: `/agent <mode>`,
  `/clear`, `/status`, `/help`, `/exit`. Lightweight startup — only loads
  the web-search plugin by default for fast response.

### `vesper doctor` extensions

Three new diagnostic checks bring the total from 10 to 13:

| Check | What it verifies |
|-------|-----------------|
| **Disk space** | `$HOME` has at least 100 MB free (warn at 1 GB) |
| **OAuth tokens** | Counts tokens in `~/.openvesper/tokens/` and flags expired or expiring-within-7d entries |
| **Cron jobs** | Parses `~/.openvesper/cron.yaml` and validates each `schedule:` expression has 5 or 6 fields |

### Documentation

- **`VISION.md`** — what we're building, what we believe, what we won't
  build, where we're going, and how we measure success. The single source
  of truth for project scope questions.

- **`CLAUDE.md`** — guide for AI coding assistants (Claude Code, Cursor,
  Codex) working in this repo. Repository shape, architecture rules,
  build system, testing conventions, style, and a "considered and rejected"
  list so contributors don't waste time proposing rejected ideas.

### `.github/` polish

- `ISSUE_TEMPLATE/` with `bug_report.md`, `feature_request.md`,
  `plugin_request.md`
- `PULL_REQUEST_TEMPLATE.md` with a meaningful checklist
- `CONTRIBUTING.md` quick orientation for new contributors

### npm publish readiness

- Every plugin's `package.json` now has `license`, `publishConfig`, `files`,
  `repository`, `homepage`, `bugs`, and `engines` fields. All 53 packages
  are publish-ready (publish requires `npm login` first).
- New script `scripts/publish-packages.sh` — publishes core + plugin-sdk
  by default, all 53 packages with `--all`, dry-run with `--dry-run`.

### DM pairing — channel adapter integration

The pairing flow shipped in v1.13.0 as gateway-only. v1.14.0 wires it into
the Telegram bot: incoming DMs are now gated through the gateway's
`/pairing/gate` endpoint. Unknown senders receive a pairing code and a
message telling them how the operator can approve it. Falls back to the
static `TELEGRAM_ALLOWED_USERS` allowlist if the gateway is unreachable.

New env var: `TELEGRAM_DM_POLICY` — `pairing` (default), `open`, or `closed`.

## 1.13.0 — Onboard wizard, daemon install, real tests

Three pieces of OpenClaw-style polish landed in one release:

### `vesper onboard` — interactive setup wizard
A guided five-step setup so new users don't have to read docs to get going:
1. Create / detect `~/.openvesper/` workspace
2. Pick an LLM provider (8 common options shown)
3. Paste API key — saved to `.env` (mode 0600), existing keys detected
4. Pick a default agent (auto, code-reviewer, bags-hunter, productivity-coach)
5. Optional connection test that sends a 10-token "say ok" message to verify

Idempotent — safe to re-run; existing values are kept unless overwritten.

### `vesper gateway install-daemon` — auto-start on login
Writes the right service file for your platform:
- **macOS** — `~/Library/LaunchAgents/com.openvesper.gateway.plist` (launchd)
- **Linux** — `~/.config/systemd/user/openvesper-gateway.service` (systemd user unit)
- **Windows** — prints Task Scheduler + NSSM instructions (no auto-write)

Companion `uninstall-daemon` removes the unit/plist and best-effort
`systemctl disable` / `launchctl unload`.

### Real test suite (Vitest)
The placeholder `test/integration.test.ts` is gone. New test files cover:
- All 15 LLM providers loaded with correct config (`PROVIDERS`, `PROVIDER_INFO`)
- `listAvailableProviders()` returns only local providers without API keys set
- Plugin loading works for bagsfm, web-search, pdf, discord
- **Regression guard:** plugins do not export `defineAgent` (v1.10.0+ architecture)
- Multi-plugin composition via `createVesper().use(...)`
- Plugin SDK exports (`definePlugin`, `defineTool`, `defineAgent`, `inputSchema`)
- Testing helpers (`mockRuntime`, `expectTool`, `withEnv`) round-trip cleanly

`@openvesper/plugin-sdk` now exposes `/testing` as a real package subpath
(`exports["./testing"]`), so consumers can `import from "@openvesper/plugin-sdk/testing"`.

### CI updated
`.github/workflows/build.yml` runs on Node 20 and 22, installs with
`--ignore-scripts` (skip optional native deps), then:
1. `pnpm -r build`
2. `pnpm test` (must pass — no more `|| echo`)
3. Smoke-test CLI commands
4. Boot the gateway and curl `/health`

Any of these failing blocks the PR.

### Sandbox-verified
- 18/18 tests pass locally
- `vesper onboard` shows correct UI, writes workspace, picks provider
- `vesper gateway install-daemon` produces correct systemd unit on Linux

## 1.12.0 — Three new LLM providers

Added Fireworks AI, Nebius AI Studio, and DeepInfra as built-in providers,
bringing the total to 15 (was 12). All three use OpenAI-compatible endpoints,
so they slot into the existing `makeOpenAICompatibleProvider` factory with
no new adapter code.

### New providers

| Provider | Default model | Env var | Why |
|----------|---------------|---------|-----|
| **Fireworks AI** | `accounts/fireworks/models/llama-v3p3-70b-instruct` | `FIREWORKS_API_KEY` | Fast inference for open-source models |
| **Nebius AI Studio** | `meta-llama/Meta-Llama-3.1-70B-Instruct` | `NEBIUS_API_KEY` | Generous free tier |
| **DeepInfra** | `meta-llama/Llama-3.3-70B-Instruct` | `DEEPINFRA_API_KEY` | Cheap open-source hosting |

### Other changes

- Updated `PROVIDER_INFO` model listings for openai (added o3-mini), gemini
  (default now `gemini-2.0-flash`, added gemini-2.0-pro), groq (added
  llama-3.1-8b-instant), together (added DeepSeek-V3, Qwen 2.5), and grok
  (added grok-2-vision).
- `detectDefaultProvider()` priority refined to prefer paid premium first,
  then free-tier providers, then local fallbacks.
- All 15 providers are real working implementations — not just metadata.

### Verified

`vesper --list-providers` reports all 15. Default-detection logic picks the
first one with credentials configured. Provider config integrity test
confirms each provider has the correct base URL, env key, and default model.

## 1.11.0 — Seven new domain agents

Added seven markdown-based agent personas for use cases that weren't yet
covered. Each one is a thin coordination layer over existing plugins —
no new tools, no new code, just markdown.

### New agents (.agents/)

- **🐙 github-pm** — PR review, issue triage, repo health summaries.
  Uses: github, code, filesystem, apply-patch, web-search.
- **🐦 social-strategist** — Twitter/X trend and account analysis,
  post angle suggestions.
  Uses: twitter, news, research, web-search.
- **🚀 pumpfun-hunter** — Pump.fun memecoin scoring and rug-check.
  Equivalent role to bags-hunter for a different Solana launchpad.
  Uses: pumpfun, onchain, solana, web-search.
- **🎁 airdrop-hunter** — Multi-chain airdrop tracking, eligibility checks,
  deadline awareness.
  Uses: airdrop, onchain, solana, web-search.
- **📊 quant-analyst** — Technical analysis, indicator computation,
  backtests, strategy comparison.
  Uses: quant, strategies, derivatives, crypto, code.
- **🖼 nft-analyst** — NFT collection analysis: floor, volume, holders,
  rarity, wash-trading detection.
  Uses: nft, onchain, solana, web-search.
- **🐸 base-hunter** — Base chain memecoin specialist. Equivalent role
  to bags-hunter for the Base ecosystem.
  Uses: base-meme, onchain, web-search.

Each new agent ships the standard five files: SOUL.md, IDENTITY.md,
USER.md, TOOLS.md, MEMORY.md.

Total bundled agents: 26 (was 19).

### Architecture note

This release reinforces the v1.10.0 separation: plugins ship tools,
markdown files in `.agents/` ship persona. Each new agent is purely
markdown — no plugin code was added or changed.

## 1.10.0 — Plugin/agent separation

Architectural cleanup. Plugins are now pure tool packages; agents are pure
markdown personas. The two concerns are fully separated.

### Removed
- `defineAgent({...})` calls and `agents: [...]` array from 47 bundled plugins.
  Plugin source files now define tools only.
- The `defineAgent` import was stripped from those 47 plugins.

### Kept
- `defineAgent` is still exported from `@openvesper/plugin-sdk` — user-authored
  plugins can still define agents inline if they prefer.
- All 19 bundled markdown agents in `.agents/` are unchanged.
- Plugin tool exports are unchanged — every tool that worked before still
  works.

### Why
Previously a plugin could ship both tools and an agent persona via
`defineAgent`. This created two competing sources of truth: was `bags-hunter`
the persona in `plugins/bagsfm/src/index.ts` or in `.agents/bags-hunter/`?
Going forward:

- **Plugin** = what the agent can do (tools, TypeScript code)
- **Agent** = how the agent behaves (persona, markdown files)

This matches the convention used by other agent runtimes that build on the
AgentSkills format.

## 1.9.3 — Build fixes & verified runtime

Every workspace package now builds clean with `pnpm -r build` and the CLI/
gateway actually run. Tested end-to-end.

- **plugin-sdk testing.ts:** `mockRuntime.callTool` now provides the required
  `ToolContext` argument that `ToolDefinition.handler` expects.
- **apply-patch plugin:** `permission: "mutation"` was not a valid
  `PermissionLevel` — changed to `"write"` (the existing equivalent for
  filesystem mutations).
- **discord plugin:** same fix; permissions now `"external"` (matches HTTP
  POST semantics).
- **CLI package.json:** added missing `@openvesper/plugin-sdk` workspace
  dependency (the `plugin info` command imports it for manifest formatting).
- **vscode-extension package.json:** added `build` script (was only `compile`),
  removed pre-existing marketing copy from `description` and `keywords`.
- **scripts/fix-esm-imports.mjs:** new post-build step that adds `.js`
  extensions to extension-less relative imports in every `dist/` folder.
  Required for Node ESM strict resolution at runtime — `tsc` with
  `moduleResolution: "Bundler"` lets you write `from "./types"` but Node
  refuses to resolve directory imports without an explicit `.js` path.
  All 57 package.json `build` scripts now run this fix automatically.

### Verified runtime tests
- `pnpm -r build` — all 56 packages build, exit 0
- `node apps/cli/dist/index.js --help` — works
- `node apps/cli/dist/index.js --list-agents` — lists 36 agents
- `node apps/cli/dist/index.js plugin list --all` — lists 51 plugins
- `node apps/cli/dist/index.js doctor` — passes startup checks
- `node apps/gateway/dist/index.js` — gateway starts, binds 127.0.0.1:18789
- `curl /health` — returns full status JSON
- `curl /agent/route` — router returns correct specialist
- `curl POST /tasks` — task persists to disk
- `curl POST /memory/:agent` — memory entry persists
- `vesper agent install` → `memory write` → `memory list` → `uninstall` —
  full lifecycle works

## 1.9.2 — Framework-neutral language

The framework is just plumbing. We don't tell users what to build, only what
we ship by default.

- Replaced "we do not allow / we made a deliberate choice / forbidden" with
  neutral phrasing in SECURITY.md, README.md, AGENTS.md, ROADMAP.md, and the
  user-facing docs (gateway/security, concepts/crypto, concepts/agent).
- Bundled agent personas now describe themselves as "configured as read-only
  by default" rather than "not allowed to" — making it explicit that users
  can fork and adjust the persona freely.
- The `vesper agent create` scaffold template now has an "Out of scope"
  section in TOOLS.md instead of "Forbidden".
- The framework imposes no restriction on what user-authored plugins can do.
  Trading, signing, withdrawals — all are user choices, not policy.

## 1.9.1 — Identity cleanup

- Removed personal identifiers (developer name, prior GitHub handle, prior brand)
  from docs and code examples — all examples now use neutral placeholders.
- Removed Turkish-language artifacts left over from authoring notes.
- Removed product-positioning slogan; site copy now describes what the
  framework does, not what we promise.
- Removed false compatibility claims (Claude Code, Codex CLI) — kept
  source-code attribution comments where applicable.
- Removed perpetual-DEX placeholder config values (`hyperliquid`, `lighter`)
  that were never wired to real signing — consistent with SECURITY.md policy.

## 1.9.0 — Docs overhaul

Complete documentation pass. Sidebar restructured into 10 sections. 41 new
docs pages covering every Sprint 1-7 feature with source file references,
curl examples, and ZDR notes.

### New docs pages
- **Concepts (9):** agent-loop, channel-docking, command-queue, compaction, context-engine, delegate, memory, multi-agent, streaming
- **Templates (7):** SOUL, IDENTITY, USER, TOOLS, HEARTBEAT, MEMORY, SKILL
- **Tools (6):** plugin-sdk, manifest, testing, apply-patch, web-search, pdf
- **Channels (2):** routing, access-groups
- **Automation (3):** tasks, standing-orders, commitments
- **Gateway (7):** slash-commands, approvals, oauth, audit, diagnostics, remote, workspaces
- **Reference (4):** cli, api, env-vars, file-layout
- **Agents (1):** skill-workshop
- **Refreshed:** concepts/architecture, concepts/session, channels/discord, agents/page

Total: 81 documentation pages.

## 1.8.0 — Full feature parity with reference runtimes

Sprints 1-7. 10 new gateway modules. 4 new plugins. 1 new agent.

### Sprint 1 — User Experience
- `tasks.ts` background tasks + reminders + recurring
- `standing-orders.ts` persistent user rules (constraints + triggers)
- `commitments.ts` agent promise tracking + inferred extraction
- `approvals.ts` mutation tool approval queue + rules
- CLI slash commands routed locally without LLM call

### Sprint 2 — Reliability & Observability
- `audit.ts` append-only daily JSONL logs
- `observability.ts` tool loop detection + thinking levels
- `diagnostics.ts` diag export with secret redaction
- Enhanced `/health` with memory, lanes, runs, tasks, commitments

### Sprint 3 — Plugin Ecosystem
- `plugin-sdk/manifest.ts` plugin.json spec + validator
- `plugin-sdk/testing.ts` mockRuntime, expectTool, mockFetch
- `cli/commands/plugin.ts` install/list/info/uninstall/search
- New `.agents/skill-workshop/` with scaffold-skill + improve-skill

### Sprint 4 — Memory & Sessions
- `memory-engine.ts` active memory with tags, TTL, keyword search
- `sessions.ts` fork() + branchAt() methods
- `context-engine.ts` 10-layer modular system prompt builder
- `cli/commands/memory.ts` write/list/search/delete/clear

### Sprint 5 — New Tools
- `plugins/web-search/` 5 providers (DuckDuckGo, Brave, Tavily, SerpApi, SearXNG)
- `plugins/pdf/` pdf_read, pdf_search, pdf_metadata
- `plugins/apply-patch/` unified diff application
- `delegate.ts` runSubAgents() parallel execution

### Sprint 6 — Channels & Routing
- `plugins/discord/` webhook + bot + embed tools
- `channel-routing.ts` route rules + access groups (allow/deny)

### Sprint 7 — Advanced
- `remote-gateway.ts` SSH/Tailscale/Cloudflare tunnel helpers
- `workspaces.ts` multiple gateway profiles
- `streaming.ts` block-aware event types

## 1.7.0
Architecture: session-lane, command-queue, async API, compaction, multi-agent routing, delegate, OAuth.

## 1.6.0
Agent management: install/start/run/uninstall/search/create.

## 1.5.0
Persistent gateway with sessions, heartbeats, hooks, streaming, agent-loop.

## 1.4.0
36 skills moved to agent-bound directories.

## 1.3.0
Removed placeholder docs, sidebar reorganized.

## 1.2.0
Bags Hunter agent + 10 Bags.fm tools + 3 skills.

## 1.1.0
Fluff cleanup: removed UI/, src/, deploy/, extensions/, patches/, qa/, apps/docs/, stale configs.

## 1.0.0
Rebrand: Open Talons → OpenVesper.
