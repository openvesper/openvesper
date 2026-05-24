# Example Prompts for TDD Coach

## New Feature

```
Build a utility function that converts ISO 8601 strings to "X days ago" relative time.

Example: "2026-05-10T00:00:00Z" → "4 days ago"
```

The agent will:
1. Write `formatRelative.test.ts` with assertions for various inputs
2. Run it, show test fails (no implementation yet)
3. Write minimal `formatRelative.ts`
4. Re-run, show green
5. Suggest edge case tests (future dates, exactly now, etc.)

## Bug Fix

```
Bug: parseAmount("1,234.56") returns 1.0 instead of 1234.56.
Fix it TDD style.
```

## Refactor

```
This getUserStats function is 200 lines. Help me refactor it,
but write tests first so I don't break existing behavior.
```
