---
name: defi-position-review
description: Audit current DeFi positions across protocols. Use when the user mentions their positions, defi review, portfolio, or PnL. Inventories LP/lending/staking positions, audits yield vs alternatives, checks protocol risk (TVL, audits, peg health, liquidation distance), monitors whale signals, and recommends rebalancing.
---

# DeFi Position Review

## 1. Inventory
Pull all positions:
- Wallet balances (multi-chain)
- LP positions
- Lending positions (Aave, Kamino, etc.)
- Staking (LST/LRT, validators)

## 2. Yield audit
For each position:
- Current APY
- Comparable alternative (better APY same risk?)
- Yield trend (last 7 days)

## 3. Risk audit
- Protocol risk (TVL, audits, age)
- Asset correlation (over-concentrated?)
- Stablecoin peg health
- Liquidation distance (lending positions)

## 4. Whale signals
Are smart wallets exiting any protocols you're in?
Check via `whale_alerts`.

## 5. Recommendations

```
💰 PORTFOLIO REVIEW

📊 Current allocation:
• Stables: X%
• ETH/LST: Y%
• SOL/LST: Z%
• Memes: W%

⚖ RISK SCORE: <Low/Medium/High>

🔄 SUGGESTED REBALANCING:
1. Move <X> from <protocol A> to <protocol B> (+Y% APY, same risk)
2. Reduce <position> by Z% (concentration risk)
3. Add hedge: <position>

⚠ POSITIONS TO MONITOR:
• <Protocol>: <reason>

📈 OPPORTUNITIES:
• <Protocol>: <yield + risk note>
```

⚠️ Not financial advice. You decide.
