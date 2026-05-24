---
name: meeting-prep
description: Prepare a structured briefing for an upcoming meeting. Use when the user mentions a meeting, call, sync, 1:1, or standup. Pulls context from calendar, Notion docs, recent Slack threads, and relevant emails. Produces meeting objectives, agenda, key questions, potential friction points, and prep tasks.
---

# Meeting Prep

When user has a meeting coming up:

## 1. Get context
- Pull calendar event details (attendees, time, location, agenda)
- Search Notion for related project docs
- Check recent Slack threads with the attendees
- Search emails for recent thread

## 2. Build briefing

Format:
```
📅 MEETING: <title> @ <time>
👥 With: <names + roles>

🎯 OBJECTIVES (your goals):
• ...

📝 AGENDA:
1. ...
2. ...

❓ KEY QUESTIONS TO ASK:
• ...

🧠 CONTEXT (recent activity):
• <Notion doc>: <key points>
• <Slack thread>: <decisions>

⚠ POTENTIAL FRICTION:
• <topic likely to be contentious>

📦 PREP TASKS:
• [ ] Review <doc>
• [ ] Draft <position>
```

## 3. Suggested duration

Most meetings should be 25min (not 30). Force concision.

## 4. After the meeting

Auto-create:
- Notion doc with notes
- Action items
- Followup calendar holds
