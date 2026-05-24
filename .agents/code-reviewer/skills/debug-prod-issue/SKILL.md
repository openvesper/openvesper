---
name: debug-prod-issue
description: Triage and diagnose a production incident with structured root-cause analysis. Use when the user reports something is broken in production — site down, errors spiking, customer complaints, weird data, performance degradation. Walks through severity classification, blast radius assessment, hypothesis generation, log/metric review, root cause identification, mitigation, and post-mortem capture.
---

# Debug Production Issue

In incidents, calmness compounds. Panic compounds the other way.

## 1. Triage (first 5 minutes)

### Classify severity

| Sev | Definition | Action |
|-----|------------|--------|
| **SEV-0** | Site down for all users, data loss, security breach | Wake everyone, war room |
| **SEV-1** | Major feature broken, many users affected | Page on-call, focused effort |
| **SEV-2** | Some users affected or workaround exists | Investigate during business hours, ASAP |
| **SEV-3** | Cosmetic, low-impact | Fix in normal cycle |

### Assess blast radius

- How many users? (% of MAU)
- Which features? (core or edge)
- Data implications? (corruption, leak, loss)
- Revenue impact? ($/hour)
- Public visibility? (customers/press noticing)

### Communicate

- **SEV-0/1:** Update status page within 10 min; internal incident channel
- **SEV-2+:** Acknowledge to affected users, no public statement unless asked

## 2. Stop the bleeding (mitigate before fix)

Before finding root cause, **stop user impact**:

- Feature flag the broken feature off
- Rollback recent deploy if timing matches
- Scale up if it's load (buy time)
- Failover to backup if available
- Take down the broken path; serve cached/error fallback

Mitigation > root cause. Customers care about the bleeding, not the why.

## 3. Hypothesis generation (5 starter hypotheses)

In order of likelihood for most incidents:

### H1: Recent deploy
- What was deployed in the last 24h?
- Did the issue start at deploy time?
- Can we revert?
- ```git log --since="24 hours ago"```

### H2: External dependency
- Has any upstream service degraded?
- Status pages: AWS, GCP, Cloudflare, Stripe, etc.
- DNS issues? Cert renewal?

### H3: Configuration drift
- Was an env var changed?
- Was a secret rotated?
- Was a feature flag toggled?

### H4: Resource exhaustion
- DB connections maxed?
- Memory/CPU pegged?
- Disk full?
- Rate limit hit on a 3rd party?

### H5: Bad data
- New customer or input that exercises rare code path?
- Schema drift between services?
- A migration that didn't fully run?

## 4. Log and metric review

- **Time window:** narrow to ~1hr around incident start
- **Logs:** filter to ERROR/FATAL level
- **Metrics:** error rate, latency, throughput, dependency latency
- **Traces:** find one slow/failed request, follow it end-to-end

For each hypothesis, what would confirm it? Look for that signal.

## 5. Root cause identification

When you've found the root cause, write it down:

```
RCA: [Component] [verb] [object] when [condition].

Example: The order service crashes when receiving an order with no line items because we don't null-check the items array.
```

This tight sentence prevents fuzzy retrospection.

## 6. The 5 Whys

For deeper RCA, ask "why?" 5 times:

```
Issue: Order service crashed.
Why? Null pointer on items array.
Why? Orders without items were created.
Why? Frontend allowed empty cart submission.
Why? Cart validation moved to backend recently but frontend wasn't updated.
Why? Migration plan didn't include frontend changes.
Root cause: Process gap in cross-team migration coordination.
```

## 7. Real fix + prevention

- **Code fix** — the immediate bug
- **Test** — assertion that catches this specific bug
- **Monitor/alert** — would catch this earlier next time
- **Process** — what changes to prevent the class of bug

If you only do code fix, you'll see this bug again.

## 8. Post-mortem (within 48h of resolution)

```markdown
# Post-Mortem: [Incident name]

**Date:** YYYY-MM-DD
**Severity:** SEV-X
**Duration:** Xh Ym
**Customer impact:** [% users, $ revenue, complaints]

## Timeline
- HH:MM — First symptom detected
- HH:MM — Acknowledged in #incidents
- HH:MM — Mitigation deployed
- HH:MM — Resolution confirmed

## Root cause
[Tight RCA sentence]

## What went well
- [Things that worked]

## What went poorly
- [Things that didn't]

## Action items
- [Owner] [Action] [Due date]
- [Owner] [Action] [Due date]

## Lessons
- [General principle to remember]
```

## Rules

- **Blameless** — focus on systems, not people
- **Customer-first** — mitigate before investigating
- **Document while fresh** — memory degrades within hours
- **Action items get assigned** — orphan TODOs die
- **Share broadly** — orgs learn by seeing each other's post-mortems
