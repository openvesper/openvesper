---
name: rug-check-deep
description: |
  Use when the user asks "is this token a rug", "vet this contract", "check this
  Bags.fm token for safety", "should I be worried about X", or any safety / rug
  evaluation question. Runs a 4-stage rug check using multiple public data sources.
---

# Deep Rug Check Flow

When evaluating a single Bags.fm token for rug risk, run all 4 stages.
**Never skip a stage** — they catch different attack vectors.

## Stage 1 — Liquidity health

`bags_rug_check` covers this. What to look for:

- ✅ Liquidity > $10k → PASS
- 🟡 Liquidity $1k–$10k → WARN, flag for user
- 🔴 Liquidity < $1k → CRITICAL, very high rug risk

If liquidity drops > 50% from 1h ago (visible in `bags_volume_pattern`), that's a
**live rug in progress**. Stop and warn the user immediately.

## Stage 2 — Authority status

`bags_rug_check` calls GoPlus and reports:

- **Mint authority** active → 🟠 WARN. Creator can mint more supply, dilute holders.
- **Freeze authority** active → 🟠 WARN. Creator can freeze holder wallets.

Both should be **revoked** for a token that wants to look legit. If both are
active, that's two strikes.

## Stage 3 — Holder concentration

Run `bags_holder_distribution`. Look at:

- **Top 1 holder %**:
  - > 40% → 🔴 CRITICAL, single wallet can dump and kill the chart
  - 25-40% → 🟠 HIGH
  - 15-25% → 🟡 MEDIUM
  - < 15% → 🟢 LOW

- **Top 10 holders combined**:
  - > 70% → very concentrated, real risk
  - < 50% → reasonable

Exclude known infrastructure addresses (LP pool, burn address) if you can
identify them — they shouldn't count as concentration risk.

## Stage 4 — Creator history

Run `bags_creator_analysis`:

- > 20 tokens by this creator → 🔴 serial launcher, very high rug risk
- 5–20 tokens → 🟡 has track record, check survival rate of past launches
- < 5 tokens → 🟢 typical, but no track record either

## Synthesis

Present findings in this format:

```
🎒 Rug Check — $SYMBOL

Liquidity:      $45k unlocked     🟢 PASS
Mint authority: Active            🟠 WARN — supply inflatable
Freeze auth:    Revoked           🟢 PASS
Top holder:     28% of supply     🟠 HIGH concentration
Creator:        12 prior tokens   🟡 has track record

Verdict: 🟠 HIGH RISK — mint authority active + top holder 28%.
Recommendation: small position only, watch top holder wallet for movements.
```

## Anti-patterns

- ❌ Don't conclude "safe" if any stage shows 🔴 — that's misleading
- ❌ Don't say "rug" definitively — say "high rug risk" or "multiple red flags"
- ❌ Don't omit the verdict line — users need a clear summary
- ❌ Don't forget: this is **heuristic**, not a guarantee. Always end with "DYOR."
