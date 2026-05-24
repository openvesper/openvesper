---
name: scaffold-skill
description: |
  Use when the user asks "write me a skill", "create a skill for X", "scaffold
  a skill", or any phrasing that wants a new SKILL.md from scratch. Asks
  clarifying questions, then produces a complete frontmatter-bearing SKILL.md.
---

# Scaffold a New Skill

When the user wants a new skill, walk through this flow:

## Step 1 — Clarify

Ask these in one go (if any are unclear):

- Which agent will own this skill?
- What user phrasing should trigger it? (1-2 example queries)
- What does success look like? (one-sentence description)
- Which tools/plugins should it use?

If the user already gave enough detail, skip to Step 2.

## Step 2 — Draft the description field

The `description` in frontmatter is the most important field — it's what the
runtime uses to decide whether to load this skill. Write it as a single
flowing sentence with concrete trigger words:

```yaml
---
name: rug-check-deep
description: |
  Use when the user asks "is this token a rug", "vet this contract",
  "check this Bags.fm token for safety", or any safety/rug evaluation
  question. Runs a 4-stage rug check using multiple public data sources.
---
```

Avoid vague descriptions like "helps with security" — those won't trigger
reliably.

## Step 3 — Body structure

A solid SKILL.md body has 4 sections:

1. **Step-by-step flow** — numbered list of what to do
2. **Output format** — concrete example showing the expected response shape
3. **Anti-patterns** — what to avoid (under "Anti-patterns" or "Don't")
4. **Closing note** — any disclaimers, "Not financial advice", etc.

## Step 4 — Output

Produce the SKILL.md content in a code block the user can copy. Include the
exact file path they should save it to:

```
.agents/<agent-mode>/skills/<skill-name>/SKILL.md
```

Then summarize:
- Trigger phrases tested
- Tools referenced
- Any assumptions you made

## Anti-patterns

- ❌ Don't write skills for actions that move funds, sign transactions, or
  expose secrets — refuse and explain
- ❌ Don't reference tools you haven't verified exist
- ❌ Don't write the SKILL.md to disk — produce content for the user
- ❌ Don't pad with filler; skills should be tight and useful
