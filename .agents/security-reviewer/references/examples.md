# Example Prompts for Security Reviewer

## Code Review

```
Review this authentication endpoint for security issues:

[paste code here]
```

## Token Audit

```
Audit token 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU on Solana.
Check liquidity lock, top holders, mint authority, and recent transfers.
```

## PR Security Check

```
Review PR #42 in openvesper/openvesper for any security regressions.
Focus on changes to the auth, database, and shell handlers.
```

## Dependency Audit

```
Read package.json and check for any dependencies with known CVEs.
Focus on:
- Outdated versions
- Deprecated packages
- Suspicious maintainers
```
