# Contributing to OpenVesper

Welcome! 🌒 We love contributions of all kinds.

## Quick start

```bash
git clone https://github.com/openvesper/openvesper
cd openvesper
pnpm install
pnpm build
pnpm dev
```

## Project structure

This is a **pnpm monorepo**. Each `packages/*` is a separately publishable npm package.

- `packages/core` — the runtime engine. Keep this minimal and stable.
- `packages/plugin-sdk` — public types and helpers for plugin authors.
- `packages/plugin-*` — individual plugins. New plugins go here.
- `packages/cli` — the interactive REPL.

## Adding a new plugin

1. Copy `packages/plugin-bagsfm` as a template.
2. Update `package.json` with your plugin name (e.g. `@openvesper/plugin-foo`).
3. Write your tools using `defineTool`, `defineAgent`, `definePlugin` from the SDK.
4. Add the plugin to `packages/cli/src/index.ts` if you want it included by default.

See `examples/custom-plugin/` for a complete walkthrough.

## Plugin conventions

- One plugin per domain (e.g. `plugin-uniswap`, `plugin-arbitrum`, `plugin-twitter`).
- Tool names should be `snake_case` and namespaced loosely (e.g. `bags_search`, `solana_lst_rates`).
- Always return `{ success: true, data }` or `{ success: false, error }`.
- Use `permission: "read" | "write" | "execute" | "external"` to hint capability.
- Add a system prompt for your agent. Be specific about how to use the tools.

## Tests

(Coming soon.) Vitest preferred.

## Style

- TypeScript strict mode.
- ESM only (`"type": "module"`).
- Prettier defaults.
- No emoji in commit messages (use them in docs/UX instead).

## License

MIT. By contributing, you agree your contributions will be licensed under MIT.
