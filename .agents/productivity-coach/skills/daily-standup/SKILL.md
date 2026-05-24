---
name: daily-standup
description: Prepare a focused daily standup update covering yesterday's progress, today's plan, and blockers. Use when the user needs to give a daily standup, async update, or end-of-day summary. Pulls from calendar (meetings attended), GitHub (commits/PRs), Notion (docs touched), and structures into the classic three-question format without padding or filler.
---

# Daily Standup

A good standup is concrete, scannable, and ends.

## The 3 questions (in this order)

### 1. ✅ What I did yesterday
- 1-3 bullet points of completed work
- Specific outcomes, not activities ("Shipped X" not "Worked on X")
- Skip if zero — being honest about a slow day > inflating

### 2. 🎯 What I'm doing today
- 1-3 bullet points of planned work
- Top priority first
- Realistic — don't over-promise

### 3. 🚧 Blockers
- Things blocking you (waiting on X, needs decision on Y)
- Be specific about who you need from
- If no blockers, say "no blockers"

## What NOT to say

❌ "Just continuing on the same task" (no progress signal)
❌ "Various things" (no specifics)
❌ "Working on a few different items" (no priority)
❌ "Trying to make progress on X" (not committed)
❌ Long preamble about how you're feeling about the project

## Source data

Pull facts from:
- `calendar_list_events --yesterday` — what meetings consumed yesterday
- `github_list_commits --author=me --since=yesterday` — what I shipped
- `notion_search --modified=yesterday` — what I documented
- `slack_my_messages` — what I discussed/decided

This anchors the update in reality.

## Async standup format (Slack/email)

```
**Yesterday:**
• Shipped dashboard to staging (Telegram alerts working)
• Reviewed @alice's auth PR — left 2 suggestions
• 1:1 with @bob: decided on Q3 priorities

**Today:**
• Add observability to dashboard (DataDog metrics)
• Spike on Anchor 0.31 upgrade path

**Blockers:**
• Need @charlie's review on PR #42 to unblock today's work
```

## Sync standup format (in-meeting)

Compress to 30-60 seconds spoken:

> "Yesterday I shipped the dashboard to staging — alerts are working. Today I'm adding DataDog metrics, then starting the Anchor 0.31 spike. I'm blocked on Charlie's review of PR 42."

## Weekly cadence variants

### Monday — heavier on plan
- Yesterday/weekend: lighter (rest)
- Today: setup the week's priorities

### Friday — lighter on plan
- Yesterday: summarize the week's wins
- Today: wrap-up + handoffs before weekend
- "What I did this week" optional summary

## Rules

- **Past tense for yesterday** ("Shipped" not "shipping")
- **Future tense for today** ("Will ship" or just "Ship")
- **Names for blockers** (@person, not "someone")
- **No apologies for slow progress** — just report what happened
- **No future promises** beyond today — that's a planning meeting
- **End the update** — silence is fine; people will fill it

## Output template

```markdown
**Date:** YYYY-MM-DD

**Yesterday ✅**
• [outcome]
• [outcome]

**Today 🎯**
• [priority 1]
• [priority 2]

**Blockers 🚧**
• [specific block + who can unblock]
(or: "no blockers")
```
