---
name: pr-description
description: Generate a thorough pull request description from a git diff. Use when the user asks to write a PR description or pull request summary. Reads git diff main...HEAD, groups related changes, generates structured PR description with Summary, Why, Changes (per file), Testing checklist, screenshots placeholder, migration notes, and related issues.
---

# PR Description

Generate from `git diff main...HEAD`:

## Template

```markdown
## Summary

<1-3 sentences: what this PR does>

## Why

<motivation: bug fix? feature? refactor? perf?>

## Changes

- `path/to/file.ts`: <what changed>
- `path/to/other.ts`: <what changed>

## Testing

How was this tested?
- [ ] Unit tests added/updated
- [ ] Manual testing: <steps>
- [ ] Tested in <browser/env>

## Screenshots (if UI)

<before> → <after>

## Migration notes

<if breaking change>

## Related

- Closes #123
- Related to #456
```

## Rules

- Be specific, not generic ("fix bug" → "fix race condition in cache.set when called from multiple workers")
- Group related changes
- Call out anything tricky reviewers should look at
- Note breaking changes loudly
