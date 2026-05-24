# 🐛 Bug Triage

A reusable skill for quickly diagnosing and prioritizing bugs.

## When it activates

Auto-activates on: `bug`, `error`, `crash`, `broken`, `doesn't work`, `fails`.

## What it does

5-step process:
1. Reproduce
2. Classify (P0-P4)
3. Diagnose (5 hypotheses)
4. Quick fix vs root fix
5. Verify + regression test

## Tools required (cross-plugin)

- `plugin-filesystem`: read_file, search_files
- `plugin-shell`: exec_shell (for git log)
- `plugin-github`: github_issues

## Usage

Activate by mentioning a bug. Works with any agent that has tool access.
