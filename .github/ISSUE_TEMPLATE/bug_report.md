---
name: 🐛 Bug report
about: Something is broken or doesn't work as documented
title: '[Bug] '
labels: bug
---

## What happened

A clear description of what went wrong.

## How to reproduce

1. ...
2. ...
3. ...

## What I expected

What you thought would happen.

## What I got instead

Actual output, error messages, screenshots.

## Environment

- **OpenVesper version:** (run `node apps/cli/dist/index.js --version`)
- **Node version:** (run `node --version`)
- **OS:** (e.g. macOS 14.5, Ubuntu 22.04, Windows 11)
- **LLM provider:** (anthropic, openai, ollama, etc.)

## Logs / diag

If possible, attach the diagnostics export:

```bash
curl -X POST http://127.0.0.1:18789/diag/export
# Then attach the resulting ~/.openvesper/openvesper-diag-*.json
# (secrets are auto-redacted, but always review before sharing)
```
