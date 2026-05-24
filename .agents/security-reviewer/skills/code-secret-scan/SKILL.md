---
name: code-secret-scan
description: Find leaked secrets in source code
trigger_keywords: [secrets, keys, credentials, leak]
tools: [search_files, read_file]
---

# Code Secret Scan

Scan a codebase for accidentally committed secrets:

## Patterns to find

- API keys: `[A-Za-z0-9]{32,}`
- AWS keys: `AKIA[0-9A-Z]{16}`
- Private keys: `-----BEGIN PRIVATE KEY-----`
- Solana keys: `[1-9A-HJ-NP-Za-km-z]{87,88}` (base58 64-byte)
- Ethereum keys: `0x[a-fA-F0-9]{64}`
- Database URLs: `postgres://user:pass@`, `mongodb://`
- JWT secrets

## Files to check (priority order)

1. `.env*` (unless in `.gitignore`)
2. `config/*.js`, `config/*.json`
3. Source files in `src/`, `lib/`
4. Test fixtures (often forgotten)
5. README + docs (sample keys with real values)

## Report

For each finding:
- Path + line number
- Type of secret
- Severity (🔴 production / 🟡 example / 🟢 dummy)
- Suggested action (rotate, remove, use env var)
