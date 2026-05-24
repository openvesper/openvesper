# Contributing to OpenVesper

Thanks for considering a contribution. Quick orientation:

## Before you start

1. **Read `VISION.md`.** Some things are deliberately not on the roadmap;
   knowing what we won't build saves you time on rejected PRs.
2. **Read `CLAUDE.md`.** It's named for AI agents but the conventions apply
   to humans too — repo layout, architecture rules, build system.
3. **Search existing issues.** Someone may already be working on it.

## Setup

```bash
git clone https://github.com/openvesper/openvesper.git
cd openvesper
pnpm install --ignore-scripts
pnpm -r build
pnpm test
```

The `--ignore-scripts` flag skips optional native deps (`better-sqlite3`,
`keytar`) that don't build cleanly in all environments. They're optional —
only the `database` plugin needs `better-sqlite3`.

## Workflow

1. Open or claim an issue first for non-trivial work.
2. Fork, branch off `main` with a descriptive name (e.g. `feat/whatsapp-channel`).
3. Make the change. Keep it focused — one bug fix or one feature per PR.
4. Add tests if applicable.
5. Update `CHANGELOG.md`.
6. Open the PR, fill out the template.

## What counts as easy first issues

Look for `good-first-issue` labels. Typical categories:
- New markdown agent in `.agents/<name>/` (no code, just SOUL/IDENTITY/USER/TOOLS/MEMORY)
- New skill (`.agents/<agent>/skills/<skill>/SKILL.md`)
- New tool inside an existing plugin
- Documentation pages in `apps/website/src/app/docs/`
- Test coverage for an existing endpoint

## What requires discussion before coding

- Anything that changes the gateway protocol
- Anything that touches multiple plugins at once
- New top-level directories
- New required dependencies
- Anything that would call `https://openvesper.com` or any analytics endpoint

## License

By contributing, you agree your contribution is licensed under MIT (see `LICENSE`).
