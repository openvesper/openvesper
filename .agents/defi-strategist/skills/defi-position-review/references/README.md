# 💰 DeFi Position Review

A reusable skill for portfolio audit and yield optimization.

## When it activates

Auto-activates on: `my positions`, `defi review`, `portfolio`, `pnl`.

## What it does

1. Inventory all positions across chains
2. Audit yield (current vs alternatives)
3. Audit risk (protocol, correlation, peg, liquidation)
4. Check whale signals
5. Recommend rebalancing

## Tools required (cross-plugin)

- `plugin-solana`: solana_wallet
- `plugin-onchain`: wallet_balance
- `plugin-defi`: protocol_tvl, yield_pools
- `plugin-whale`: whale_alerts
