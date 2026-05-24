---
name: investment-thesis
description: Build a rigorous investment thesis (equity or crypto) with hypothesis, key drivers, invalidation criteria, and position sizing. Use when the user is considering allocating capital to a specific stock, crypto token, protocol, or asset, or wants to formalize their reasoning before buying. Forces specificity, falsifiability, explicit risk decomposition, and pre-commitment to what would make them sell. Different from a general "what should I buy" — this turns a vague idea into a written, testable thesis.
---

# Investment Thesis

The discipline: write the thesis BEFORE buying, not after.

## Process

### 1. Restate as a one-sentence thesis

Force the user to compress their idea to one sentence:

> "I believe [TICKER] will [outperform / reach $X / achieve Y outcome] because [primary driver], and I'd change my mind if [invalidation event]."

If they can't state it in one sentence, the thesis isn't clear enough yet.

### 2. The business / protocol (5 sentences max)

- What do they do?
- Who pays them and why?
- How do they make money?
- What's their current scale?
- What's their primary growth driver?

### 3. Why now? Why does this opportunity exist?

If something is obviously good, why isn't it already priced in?

- Market overreacting to short-term news?
- Underfollowed by analysts?
- Catalyst coming in 6-12 months that's not yet visible?
- New product cycle?
- Regulatory tailwind?

If they can't articulate why others don't see this — they might be missing something.

### 4. Key metrics (table format)

| Metric | Current | 12-month target | Source |
|--------|---------|-----------------|--------|
| Revenue (equity) | $X | $Y | 10-K, ER call |
| Growth rate YoY | X% | Y% | calculation |
| Operating margin | X% | Y% | 10-Q |
| TVL (crypto) | $X | $Y | DefiLlama |
| Fees (crypto) | $X | $Y | Token Terminal |
| FDV / Fees ratio | X | Y | calculation |

### 5. Three scenario weights

- **Bull case (~25%):** 3x return — what needs to be true
- **Base case (~50%):** Most likely outcome at 12mo — 1.3-1.8x
- **Bear case (~25%):** What happens if wrong — what's the floor

Forces honest probability weighting.

### 6. Risk decomposition (ranked)

For each risk:
- Probability (low/med/high)
- Severity (low/med/high)
- Mitigation (if any)

Common risks:
- Execution risk (team failure)
- Regulatory
- Macro (interest rates, recession)
- Competition / technology shift
- Reflexivity / cycle risk (crypto especially)
- Token unlocks (crypto)
- Concentration / counterparty risk

### 7. What would change your mind?

Force pre-commitment:
- [Specific event 1] → reduce position by 50%
- [Specific event 2] → exit entirely
- [Earnings miss > X%] → reassess
- [Token price below $Y for N days] → exit

### 8. Position sizing

- High conviction: 3-8% portfolio
- Medium: 1-3%
- Speculation: <1%
- **Never** > 10% in single position (regardless of conviction)

### 9. Catalyst calendar

Date-stamped events:
- Month X: earnings
- Month Y: product launch
- Month Z: token unlock (size + recipients)
- Month W: regulatory decision

### 10. Sources

Every claim must cite:
- Filings (10-K, 10-Q, 8-K)
- Transcripts (last 4 quarters of earnings calls)
- On-chain dashboards (DefiLlama, Token Terminal, Dune)
- Primary research (avoid Twitter / random Substack)

## Output Template

```markdown
# [TICKER / TOKEN] Investment Thesis

**Date:** YYYY-MM-DD
**Price at thesis:** $X
**Time horizon:** 3 months / 1 year / 3 years
**Position size:** X% at full conviction

## 1. Thesis (1 sentence)
> "I believe ..."

## 2. Business / protocol
[3-5 sentences]

## 3. Why now?
[3 bullet points]

## 4. Key metrics
[Table with sources]

## 5. Scenario probabilities
- Bull (25%): [outcome]
- Base (50%): [outcome]
- Bear (25%): [outcome]

## 6. Risks (ranked)
1. [risk] — [prob × severity] — [mitigation]
2. ...

## 7. Invalidation criteria
- IF [event] THEN [action]

## 8. Position sizing
Initial: X%
Add at: $Y
Max position: Z%

## 9. Catalyst calendar
- Date: event

## 10. Sources
[Citations]
```

## Rules

- **No vague claims** — "Strong growth" → "30% YoY revenue, last 4 quarters per 10-Q"
- **Cite primary** — filings + on-chain, not Twitter
- **Pre-commit invalidation** — write it BEFORE owning it
- **Update quarterly** — re-read with fresh eyes; mark when thesis changes

⚠️ NOT FINANCIAL ADVICE. DYOR.
