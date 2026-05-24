---
name: yield-risk-decomposition
description: Break down where a yield comes from and what could kill it
trigger_keywords: [yield, apy, farm, lending, lp risk]
tools: [protocol_tvl, yield_pools, whale_alerts]
---

# Yield Risk Decomposition

For ANY yield opportunity, decompose into:

## 1. Source of yield

Where does the APY actually come from?
- ✅ Real fees (LP fees, lending interest, MEV) — sustainable
- ⚠ Token emissions — sustainable only while emissions last
- 🚨 New deposits paying old (ponzi) — will collapse

## 2. Risk layers

| Risk | Question |
|------|----------|
| Smart contract | Audited? By whom? How recent? |
| Oracle | Which oracle? Manipulable? |
| Peg | If stablecoin, peg history? |
| Impermanent loss | Volatile pair? Calculate IL at ±50% |
| Liquidation | Lending position — distance to liquidation? |
| Protocol governance | Can admin steal funds? |
| Composability | Built on top of which protocols? |

## 3. Capacity

Position size vs. TVL:
- <1% of TVL: safe size
- 1-5%: be careful with exit
- >5%: you ARE the liquidity

## 4. Exit plan

How fast can you unwind in adverse conditions?
- <1h: liquid (CEX-like DEXes)
- 1-24h: medium (LP)
- 1-7d: locked (vaults, governance)
- >7d: illiquid (avoid for >20% of portfolio)

## Output

Always present yield as:
**APY: X% (Y from fees + Z from emissions, K months runway)**

Not just "X% APY".
