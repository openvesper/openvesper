# 🛡 Security Reviewer

An OWASP-aware security agent that audits code and crypto tokens.

## What it does

- Reviews code for OWASP Top 10 vulnerabilities
- Audits crypto tokens for rug pulls, honeypots, malicious approvals
- Checks GitHub PRs for security issues
- Suggests fixes with severity levels (🔴 Critical → 🟢 Informational)

## Use cases

- "Review this PR for security issues"
- "Is this Solana token safe to buy?"
- "Audit our authentication code"
- "Check this contract for honeypot patterns"

## Required environment

Optional API keys for full functionality:
- `GITHUB_TOKEN` — for PR/repo review
- `HELIUS_API_KEY` — for Solana token security
- `GOPLUS_API_KEY` — for EVM token security

## Example invocation

```bash
vesper --agent security-reviewer
```

Or in code:
```typescript
import { createVesper, loadAgentFromMarkdown } from "@openvesper/core";

const agent = loadAgentFromMarkdown(".agents/security-reviewer/manifest.md");
const vesper = createVesper({ llm: { provider: "anthropic" } });
await vesper.run({ agent: agent.mode, prompt: "Review this code..." });
```
