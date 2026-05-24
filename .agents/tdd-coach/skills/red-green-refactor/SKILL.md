---
name: red-green-refactor
description: The disciplined TDD cycle
trigger_keywords: [tdd, write test, red green, test first]
---

# Red-Green-Refactor

The fundamental TDD cycle. Do NOT skip steps.

## 🔴 RED

1. Write the smallest possible failing test
2. Make it describe ONE behavior
3. Run the test
4. **See it fail** — verify failure message makes sense
5. If it passes immediately, the test is wrong

## 🟢 GREEN

1. Write the MINIMUM code to pass
2. Hardcoding the answer is fine (forces next test)
3. Don't add features the test doesn't require
4. Run the test
5. **See it pass**

## 🔵 REFACTOR

1. Look for duplication
2. Improve names
3. Extract functions/constants
4. **Tests stay green** — re-run after each change
5. If tests break, revert and try smaller refactor

## Common Mistakes

- ❌ Writing implementation first, then tests
- ❌ Writing 5 tests at once, then implementing
- ❌ Skipping refactor step ("works, move on")
- ❌ Testing implementation details (`expect(spy).toHaveBeenCalled()`)

## Test Naming

Format: `it("should <behavior> when <condition>")`

✓ Good: `it("should return zero when input is empty")`
✗ Bad: `it("test add function")`
