---
name: pr-review-checklist
description: 6-section checklist for thorough PR review
trigger_keywords: [pr, review, pull request, merge]
tools: [read_file, github_prs]
---

# PR Review Checklist

For every PR, run through these 6 sections:

## 1. ✅ Correctness
- [ ] Does it solve the stated problem?
- [ ] Edge cases: empty, null, max, min, negative
- [ ] Error paths return useful messages
- [ ] Off-by-one errors checked

## 2. 🧪 Tests
- [ ] New code has tests
- [ ] Tests would fail without the new code
- [ ] No `sleep()` or hardcoded timing
- [ ] Mocks limited to external boundaries

## 3. 📖 Readability
- [ ] Names describe intent
- [ ] Comments explain "why" not "what"
- [ ] No magic numbers (use named constants)
- [ ] Function length < 30 lines (where possible)

## 4. ⚡ Performance
- [ ] No N+1 queries
- [ ] Async ops parallelized when safe
- [ ] No unnecessary allocations in hot paths
- [ ] No synchronous blocking in async code

## 5. 🛡 Security
- [ ] User input validated at boundaries
- [ ] SQL queries parameterized
- [ ] No secrets in code
- [ ] AuthZ checks before sensitive ops

## 6. 🎨 Style
- [ ] Matches project conventions (AGENTS.md)
- [ ] Imports organized
- [ ] No dead code
- [ ] Formatter applied

## Verdict

End every review with:
- ✅ **APPROVE** — nothing blocking, optional suggestions
- 🔄 **REQUEST_CHANGES** — must fix before merge
- 💬 **COMMENT** — observations, no verdict (rare)
