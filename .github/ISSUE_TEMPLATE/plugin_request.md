---
name: 🔌 Plugin request
about: Suggest a new bundled plugin
title: '[Plugin] '
labels: plugin
---

## Service / API

Which external service or API would the plugin wrap?

## Tools it would expose

List the specific tool names + a one-line description of each.

## Authentication

How does the user authenticate? (API key in env, OAuth, no auth needed, etc.)

## Permission categories

For each tool, which category fits:
- `read` — read-only API calls
- `external` — outbound HTTP that doesn't change state (search, lookups)
- `write` — filesystem mutations
- `execute` — runs shell commands
- `trade` — financial operations (use sparingly)

## Why bundle vs let users write their own

What makes this a good fit for the bundled set rather than a user-built plugin?
