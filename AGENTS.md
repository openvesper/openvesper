# Project context for AI agents

This file is read automatically by OpenVesper's runtime when an agent runs
inside this repository. It gives agents working in this codebase the project
conventions and architecture they need.

If you're a human contributor reading this — see `CONTRIBUTING.md` instead.

## Project

- **Name:** OpenVesper
- **License:** MIT
- **Language:** TypeScript strict mode, ESM modules
- **Runtime:** Node.js 20+
- **Package manager:** pnpm 9+ (workspace — `npm install` will break it)
- **Repo:** [github.com/openvesper/openvesper](https://github.com/openvesper/openvesper)

## Architecture

Three layers, defined in detail at `/docs/concepts/architecture` on the docs site:

1. **Plugins** (`packages/plugins/*`) — TypeScript code that exposes tools.
2. **Agents** (`.agents/*`) — Markdown files defining personas and tool policy.
3. **Runtime** (`packages/core`) — Orchestrates LLM → tools → response loop.

## Code conventions

- Tools return `{ success: true, data }` or `{ success: false, error }` — never throw.
- Mutating tools must declare a `permission` field (`mutation`, `filesystem`, `shell`).
- No hardcoded API keys. Read from `process.env` only.
- No telemetry, no analytics, no phone-home calls — see `SECURITY.md`.
- No code that asks for wallet private keys, seed phrases, or signs transactions.

## Adding a plugin

1. Scaffold under `packages/plugins/<name>/src/index.ts`
2. Use `definePlugin / defineTool / inputSchema` from `@openvesper/plugin-sdk`
3. Build: `pnpm --filter @openvesper/plugin-<name> build`
4. Register the plugin in `apps/cli/src/index.ts` (or whichever app loads it)

## Adding an agent

1. Create `.agents/<mode>/` with the 6 core files: `SOUL.md`, `IDENTITY.md`,
   `USER.md`, `TOOLS.md`, `HEARTBEAT.md`, `MEMORY.md`.
2. Optionally add `skills/<skill-name>/SKILL.md` with frontmatter.
3. Test: `node apps/cli/dist/index.js -a <mode> -q "test prompt"`.

## Default behavior

- All persistence (memory, conversations, heartbeats) is opt-in. Default: off.
- All scheduled heartbeats ship with `enabled: false`.
- Trading execution is **not bundled**. The default plugins are read-only; users can author their own trading plugins.
