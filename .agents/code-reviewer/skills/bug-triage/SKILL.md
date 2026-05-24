---
name: bug-triage
description: Diagnose and prioritize bugs systematically. Use when the user reports a bug, error, crash, broken feature, or something that doesn't work. Walks through reproduction, P0-P4 classification, 5 hypothesis types (recent change, environment, race condition, dependency, data), quick-fix vs root-fix decision, and regression test addition.
---

# Bug Triage

When user reports a bug:

## Step 1: Reproduce
1. Get exact reproduction steps
2. Environment (OS, Node version, browser)
3. Logs / stack trace if available
4. Screenshots if UI-related

## Step 2: Classify
- **P0 — Blocker**: production down, data loss, security
- **P1 — Critical**: feature broken for >50% users
- **P2 — Major**: feature broken, has workaround
- **P3 — Minor**: cosmetic, edge case
- **P4 — Trivial**: typo, polish

## Step 3: Diagnose
Hypotheses, in order:
1. Recent code change? (`git log -p` last 24h)
2. Environment difference? (works on my machine)
3. Race condition? (intermittent failures)
4. External dependency? (API down)
5. Data issue? (specific user/account)

## Step 4: Quick fix vs root fix
- **Quick fix**: revert, feature flag, hotfix
- **Root fix**: identify and fix underlying cause

## Step 5: Verify
- Test the fix
- Test regression scenarios
- Add a test that would have caught this bug

## Output Format

Always structure as:
```
SEVERITY: Px
REPRO: [steps]
HYPOTHESIS: [most likely cause]
FIX: [minimal fix]
TEST: [how to verify]
PREVENTION: [test/monitor to add]
```
