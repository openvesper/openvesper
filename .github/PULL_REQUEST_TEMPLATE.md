## What this changes

Brief description of the change.

## Why

What problem does this solve? Link to issue if there is one.

## How to verify

Steps a reviewer can take to confirm the change works:

```bash
# e.g.
pnpm -r build
pnpm test
node apps/cli/dist/index.js <new-command>
```

## Checklist

- [ ] I read `CLAUDE.md` and followed the conventions
- [ ] `pnpm -r build` passes
- [ ] `pnpm test` passes
- [ ] If I added a tool, I added a test for it
- [ ] If I added a gateway endpoint, I tested it with curl
- [ ] If I touched a plugin, I did not add a `defineAgent` block (use markdown in `.agents/` instead)
- [ ] If I touched files under `~/.openvesper/`, I set mode 0600 on files and 0700 on dirs
- [ ] No telemetry, no `https://openvesper.com` calls, no personal names
- [ ] Updated `CHANGELOG.md` with a new section
- [ ] Bumped version in all relevant `package.json` files

## Notes for the reviewer

Anything that needs explanation, design decisions, follow-up work, etc.
