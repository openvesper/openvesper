---
name: deep-research
description: Conduct rigorous multi-source research on a topic, producing a synthesized report with cited claims, dissenting views, and confidence levels. Use when the user asks "deep dive on X", wants a research report rather than a casual answer, or needs to understand a topic well enough to make a decision. Walks through scoping, source diversification, claim verification, contradiction reconciliation, and structured output.
---

# Deep Research

A research request demands more than a quick search. Earn the depth.

## 1. Scope the question

Before searching, clarify:

- **What decision does this inform?** (research → action)
- **What's the time budget?** (5 min skim vs 2hr report)
- **What's the audience?** (expert vs novice)
- **What's currently unknown?** (calibrate the gap)

If the user wants a 5-line summary, don't give them a 50-page report. Match depth to need.

## 2. Source diversification

Don't trust one source. Pull from:

| Source type | Use for | Examples |
|-------------|---------|----------|
| Primary | Facts, data | SEC filings, papers, official docs, on-chain |
| Secondary | Analysis, context | Reputable journalism, analyst reports |
| Tertiary | Quick orientation | Wikipedia, summaries (verify before quoting) |
| Adversarial | Contrarian view | Short reports, critic accounts |
| Practitioner | Real-world | Founder/builder accounts, GitHub issues, Reddit threads |

Aim for: 3+ source types, 5-10+ sources total for any non-trivial topic.

## 3. Claim verification

For each significant claim:

- **Cite the source** (link or specific reference)
- **Note source quality** (primary > secondary > tertiary)
- **Flag if unverified** ("X claims Y but I couldn't independently verify")
- **Date the claim** (data goes stale)

## 4. Contradiction handling

When sources disagree, don't pick one. Present both:

```
Source A says X (date, citation)
Source B says Y (date, citation)
Likely reason for discrepancy: [different methodology / different time window / one is outdated / genuine debate]
My read: [your synthesis, with stated confidence]
```

## 5. Confidence levels

Tag every conclusion:

- **High confidence:** Multiple primary sources agree
- **Medium confidence:** Reasonable evidence, some uncertainty
- **Low confidence:** Limited data, plausible but not proven
- **Speculation:** Reasonable inference, label clearly

## 6. Report structure

```markdown
# Deep Research: [Topic]

**Date:** YYYY-MM-DD
**Sources consulted:** N
**Confidence:** Overall [high/med/low]

## TL;DR
[3-5 sentences, the bottom line]

## Background
[What context is needed before the findings]

## Key Findings
1. **[Finding]** (confidence: X)
   - Evidence: [citations]
   - Context: ...

2. ...

## Contested Points
- [Topic where sources disagree]
- [How experts split]

## Open Questions
- [What couldn't be answered with available sources]
- [What additional research would resolve]

## Implications / Decision Inputs
- If goal is [X], this research suggests [Y]
- If goal is [Z], this research suggests [W]

## Sources
[Numbered list with links and notes on quality]
```

## 7. Output discipline

- **Don't pad** — if the answer is 3 paragraphs, write 3 paragraphs
- **Don't manufacture certainty** — say "unknown" or "unclear" when true
- **Quote sparingly** — paraphrase + cite; quote only memorable or precise wording
- **Watch for circular sourcing** — five sites quoting the same blog post = one source

## Tools to use

This skill leverages multiple plugins:
- `plugin-research`: web_search, web_fetch, rss_read
- `plugin-onchain`: on-chain verification (for crypto topics)
- `plugin-github`: code/issue verification
- `plugin-twitter`: practitioner sentiment
- `plugin-news`: recent coverage

## Common mistakes

- **Confirmation bias** — only seeking sources that agree with prior view
- **Recency bias** — overweighting last week's news
- **Authority bias** — trusting a brand name uncritically
- **Source contamination** — citing a source whose only source is the thing you're trying to verify
- **Stopping too early** — first answer fits narrative, so research ends
