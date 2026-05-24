---
name: refactor-plan
description: Plan a non-trivial codebase refactor with risk assessment, incremental steps, test strategy, and rollback plan. Use when the user wants to refactor a large piece of code, migrate to a new pattern/library/framework, or break up a monolith. Prevents the "rewrite trap" by forcing incremental steps, identifies hidden coupling, and produces a sequenced plan with checkpoints.
---

# Refactor Plan

The cardinal sin of refactoring: rewrite from scratch. The pro move: incremental, reversible, well-tested steps.

## 1. Understand the current state

Before planning the new state, document the old:

- **Entry points** — how does code get called? CLI, API, cron, UI?
- **Side effects** — what does it write to? DB, files, network, queues?
- **Dependencies** — what does it depend on? What depends on it?
- **Hidden coupling** — things that look unrelated but aren't (shared global state, env vars, file paths)
- **Test coverage** — how well is current behavior tested?

If coverage is poor: **write characterization tests first** (tests that pin down existing behavior, even if behavior is weird).

## 2. Articulate the goal

What does success look like?

- ✅ Specific: "Reduce response time of /search from 800ms to <200ms"
- ✅ Specific: "Replace bespoke ORM with Drizzle in user/auth modules first"
- ❌ Vague: "Make the code cleaner"
- ❌ Vague: "Modernize the codebase"

Vague goals → rewrites → regret.

## 3. Identify risk

| Risk class | What to do |
|-----------|------------|
| Critical path (production traffic) | Maximum care; canary; feature flag |
| User data integrity | Backups; dry-run mode; reversible migrations |
| External integrations | Mock first; test against staging; rollout cohort |
| Performance | Benchmark before and after; load test |
| Behavior preservation | Characterization tests; parallel run |

## 4. Strangler Fig pattern (default approach)

Instead of replacing all at once, **wrap and gradually replace**:

```
Step 1: New code coexists with old (feature flag toggles)
Step 2: New code handles % of traffic (canary)
Step 3: New code handles 100% but old code still present
Step 4: Old code removed
```

Each step is independently shippable and reversible.

## 5. Incremental step plan

Break the refactor into PRs no larger than ~500 lines diff each:

```
PR 1: Add new module skeleton + tests (no logic moves yet)
PR 2: Move logic block A behind feature flag (old + new both work)
PR 3: Migrate first caller to feature flag
PR 4: Cut over 10% of traffic to new path
PR 5: Cut over 100%
PR 6: Remove old code
PR 7: Remove feature flag
```

Pros:
- Each PR is reviewable
- Each step is reversible
- Production stays healthy throughout

## 6. Test strategy

For each step:
- **Unit tests** for new code (mandatory)
- **Integration tests** for cross-module behavior
- **Snapshot tests** for output equivalence (before/after)
- **Performance tests** if speed matters
- **Smoke tests** in staging before merging

## 7. Rollback plan

For each step, define:
- What signals indicate trouble? (error rate, latency, customer complaints)
- How fast can we revert? (feature flag flip = seconds; PR revert = minutes; data migration = ??)
- Who has the authority to roll back? (on-call vs senior dev)

If a step can't be rolled back in <10 minutes, **break it down further**.

## 8. Communication

For non-trivial refactors:
- **Pre-announce** in team channel
- **Document migration guide** if breaking APIs
- **Schedule cutover** during low-traffic window
- **Post-mortem** if anything surprised you

## 9. Output template

```markdown
# Refactor Plan: [Name]

## Goal
[Specific, measurable success criterion]

## Current state
- Entry points: [list]
- Side effects: [list]
- Test coverage: [%]
- Risk class: [critical / high / med / low]

## New state (target)
[What it looks like when done]

## Step-by-step plan

### Step 1: [Name]
- What: [code changes]
- Why: [reason in sequence]
- Test: [how to verify]
- Rollback: [how to revert]
- Estimate: [hours]

### Step 2: ...

## Checkpoints
After step 3: [metric check] → continue / pause / rollback
After step 5: [metric check] → continue / pause / rollback

## Rollback strategy
- Feature flag: [where it lives]
- Data migration: [forward/backward compatible? down-migration scripts?]
- Communication: [who to notify if reverting]

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ...  | ... | ... | ... |

## Open questions
- ...
```

## Common mistakes

- **Big bang rewrite** — high regret rate
- **Refactoring without tests** — you'll change behavior without knowing
- **Mixing refactor with feature work** — review nightmare
- **No checkpoint metrics** — flying blind
- **Skipping rollback plan** — small problem becomes big problem
