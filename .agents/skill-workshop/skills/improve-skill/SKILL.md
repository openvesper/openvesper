---
name: improve-skill
description: |
  Use when the user pastes an existing SKILL.md and asks to improve it,
  critique it, make it more reliable, fix its triggers, or rewrite it.
  Performs a structured review with concrete edit suggestions.
---

# Improve an Existing Skill

When the user shows you an existing SKILL.md, run this review:

## Step 1 — Audit the description

Check the frontmatter `description`:

- Does it have concrete trigger phrases the user might say?
- Is it too vague? ("helps with security" → bad. "Use when user asks 'is this a rug'..." → good)
- Does it overlap with another skill in the same agent? (causes ambiguity)

If issues: suggest a rewritten description.

## Step 2 — Verify tool references

Scan the body for tool names. For each, confirm it exists in the agent's
plugin set. If you reference `bags_rug_check`, it must be in the bagsfm plugin's
exports. Flag any tool you don't recognize.

## Step 3 — Body structure check

A solid skill body has:

- Numbered steps (not just prose)
- An "output format" section with a concrete example
- An "anti-patterns" section
- Closing disclaimer if dealing with financial/medical/legal topics

Missing any? Suggest where to add.

## Step 4 — Specificity check

For each numbered step, ask: "Is this actionable, or just intent?"

- Bad: "Score the token"
- Good: "Run `bags_token_analysis` and use the composite_score field"

## Step 5 — Output

Produce:

1. **TL;DR** — 1-line summary of what's wrong
2. **Concrete edits** — show old vs new for each suggested change
3. **Rewritten SKILL.md** (optional, if changes are substantial)
4. **Test cases** — phrasings the user should try after editing to verify the
   skill triggers correctly

## Output format

```
🔨 Skill review: <skill-name>

TL;DR: <one-line summary>

Edit 1 — Description (high priority):
  Old: "Helps user with rug checks"
  New: "Use when user asks 'is this a rug', 'vet this token', or
        'check this contract for safety'. Runs 4-stage rug heuristic."

Edit 2 — Step 3 (medium priority):
  Old: "Check the holders"
  New: "Run bags_holder_distribution and flag if top holder > 25%"

Test these queries after editing:
  - "Is this token a rug? <contract>"
  - "Check this Bags.fm contract for safety"
  - "Vet this token"
```

## Anti-patterns

- ❌ Don't rewrite the whole skill if only the description needs fixing
- ❌ Don't suggest adding tools the agent doesn't have access to
- ❌ Don't tell user to use semantic embedding / vector search — that's not
  available yet, descriptions are keyword-matched
