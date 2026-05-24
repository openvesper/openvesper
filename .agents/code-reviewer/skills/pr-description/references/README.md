# 📝 PR Description

A reusable skill that generates a good PR description from a git diff.

## When it activates

Auto-activates on: `pr description`, `pull request`, `write pr`.

## What it does

1. Reads `git diff main...HEAD`
2. Groups related changes
3. Generates structured PR description
4. Highlights tricky parts + breaking changes

## Tools required (cross-plugin)

- `plugin-shell`: exec_shell
- `plugin-filesystem`: read_file
- `plugin-github`: github_prs
