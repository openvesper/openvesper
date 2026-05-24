# 📅 Meeting Prep

A reusable skill that prepares you for a meeting by pulling context from calendar, Notion, Slack, and email.

## When it activates

Auto-activates on: `meeting`, `call`, `sync`, `1:1`, `standup`.

## What it does

1. Pulls calendar event details
2. Searches Notion for related docs
3. Checks Slack threads with attendees
4. Searches emails for recent context
5. Builds a structured briefing

## Tools required (cross-plugin)

- `plugin-calendar`: calendar_list_events
- `plugin-notion`: notion_search
- `plugin-slack`: slack_channel_history
- `plugin-email`: gmail_search

## Usage

Mention an upcoming meeting and the skill auto-activates.
