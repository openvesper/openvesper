# CLAUDE.md — guide for AI agents working in this repository

This file is read by AI coding assistants (Claude Code, Cursor, Codex, etc.) when
they're asked to make changes to OpenVesper. The conventions below keep the
repository coherent across many contributors.

## Repository shape

```
openvesper/
├── apps/
│   ├── cli/              # vesper CLI (Node, manual switch-case dispatcher)
│   ├── gateway/          # persistent control plane (Express, port 18789)
│   ├── telegram-bot/     # standalone Telegram bot (separate process)
│   ├── vscode-extension/ # editor integration
│   └── website/          # Next.js — landing + 81 docs pages
├── packages/
│   ├── core/             # @openvesper/core — runtime, providers, types
│   ├── plugin-sdk/       # @openvesper/plugin-sdk — defineTool, defineAgent
│   └── plugins/<name>/   # 51 bundled plugins, each a separate npm package
├── .agents/<mode>/       # 26 bundled markdown agent personas
├── config/               # cron.yaml, webhooks.yaml templates
├── scripts/              # build helpers, fix-esm-imports.mjs
└── test/                 # vitest test files
```

## Architecture rules

These are the conventions you should follow when adding code:

1. **Plugins ship tools, not agents.** Since v1.10.0, no plugin in
   `packages/plugins/` exports `defineAgent` blocks. Add a new agent? Create
   markdown files under `.agents/<mode>/`. Add a new capability? Write a tool
   in a plugin. There's a regression test guarding this — don't break it.

2. **Agents are markdown only.** A persona is `SOUL.md` + `IDENTITY.md` +
   `USER.md` + `TOOLS.md` + `MEMORY.md` + optional `HEARTBEAT.md` + optional
   `skills/<name>/SKILL.md`. No TypeScript, no JSON, no compiled artifacts.

3. **Local-first is not negotiable.** Don't add code that calls
   `https://openvesper.com` or `analytics.example.com`. The only outbound
   HTTP we permit is to LLM providers (when the user calls them) and to tools
   the user explicitly invokes. No phone-home, no telemetry, no error
   reporting to a remote service.

4. **Files in `~/.openvesper/` are mode 0600, dirs are 0700.** Sessions,
   tokens, memory, audit logs, OAuth credentials, pairing data — all of it.
   Use `fs.writeFile(path, content, { mode: 0o600 })`. The corresponding
   `mkdir` calls use `{ recursive: true, mode: 0o700 }`.

5. **Mutation tools route through approvals.** If your tool changes external
   state (sends a message, posts data, writes a file outside the workspace),
   mark it with `permission: "external"` or `permission: "write"`. The gateway
   intercepts these and asks the user before executing.

6. **The framework imposes no behavioral restrictions on user plugins.** If a
   user writes a plugin that signs transactions, we run it. Our role is
   plumbing. The bundled plugins are read-only by default; that's a packaging
   decision, not a policy.

## Build system

- **Monorepo:** pnpm workspaces. `pnpm-workspace.yaml` defines packages.
- **TypeScript:** `moduleResolution: "Bundler"` in source, but Node ESM at
  runtime needs `.js` extensions in import paths. The post-build script
  `scripts/fix-esm-imports.mjs` adds them automatically. Every package's
  `build` script chains it: `tsc && node ../../scripts/fix-esm-imports.mjs dist`.
- **No bundler, no build tool beyond tsc.** Plain `tsc` output, plain Node
  runtime.

To build everything: `pnpm -r build`. To build one package: `cd <pkg> && pnpm run build`.

## Testing

- Vitest in `test/` at repo root.
- Two suites today: `integration.test.ts` (core + plugin loading) and
  `plugin-sdk.test.ts` (SDK helpers).
- Tests must pass before PR merge. CI workflow (`.github/workflows/build.yml`)
  runs `pnpm -r build` then `pnpm test` then verifies CLI + gateway boot.

When adding a new feature:
- If it's a new tool, add a test that calls it via `mockRuntime` from
  `@openvesper/plugin-sdk/testing`.
- If it's a new gateway endpoint, add an integration test that boots the
  gateway and curls it (mock provider for LLM calls).
- If it's a new agent, no test needed — agents are markdown.

## Style

- **Filenames:** `kebab-case.ts` for source, `PascalCase.md` for agent files
  (`SOUL.md`, `IDENTITY.md`, etc.) for legibility.
- **Imports:** ESM only. Always include `.js` extension on relative imports
  in source (`from "./types.js"`, not `from "./types"`). The post-build script
  fixes this automatically for `dist/` but write it correctly in source too —
  some IDEs prefer it.
- **Comments:** Block comments at file top explaining what the module is for.
  Inline comments for non-obvious decisions only.
- **Error handling:** Throw real errors. Don't return `null` from a function
  whose caller expects success — return a `{ success: false, error: string }`
  shape for tools, or throw for everything else.
- **Color in CLI output:** Use the inline ANSI helpers (each command file
  defines its own `c` object). No `chalk` dependency — we keep CLI footprint
  small.

## Don't

- Don't add a new top-level directory without good reason. We have
  `apps/`, `packages/`, `.agents/`, `config/`, `scripts/`, `test/` — that's
  enough surface area.
- Don't add a database. SQLite was added once for the `database` plugin
  and immediately required platform-specific native builds we can't ship
  cleanly. Use JSON files at 0600. We can revisit if we hit a real scale wall.
- Don't add OpenClaw / Claude Code / Cursor mentions unless they're real
  attribution comments in source code (those are fine). We don't claim
  compatibility we haven't tested.
- Don't add personal names or "powered by X" branding. The repo is
  organizationally neutral — bundled examples use placeholder names like
  `alice`, `bob`, `charlie`.
- Don't add Turkish or any non-English content. Internal authoring notes
  in Turkish have leaked into the repo historically; we cleared them in
  v1.9.1. Keep all repo content English.
- Don't add slogans or marketing copy. README and website describe what
  the framework does, not what it promises.

## Workflow

When asked to add a feature:

1. Check this file first to understand the rules.
2. Search the repo for existing similar features — copy the pattern.
3. Write the code following the conventions above.
4. Add tests if applicable.
5. Update `CHANGELOG.md` with a new version section.
6. Bump version in every relevant `package.json` (use
   `python3 -c 'import json,glob; ...'` to script it — there are 57 of them).

When asked to fix a bug:

1. Reproduce it. If you can't reproduce, ask for the exact command and
   environment.
2. Find the file with the bug, fix it, and add a regression test.
3. Don't fix three things at once — one bug per PR.

## Things that have been considered and rejected

So you don't waste time proposing them:

- A hosted SaaS version (against the local-first principle)
- Telemetry, even anonymous (against the local-first principle)
- Built-in trading plugin (security surface too big for bundled defaults)
- Native mobile apps (separate platform team needed)
- A custom DSL for agents (markdown is the language; if it's not expressive
  enough, write a plugin)
- A web Control UI (the CLI + gateway HTTP API is the surface; users who
  want a web UI can build one as a plugin)
- `chalk` / `commander` heavy dependencies (kept lightweight on purpose)
