# 🪂 Airdrop Eligibility

A reusable skill that checks if a wallet qualifies for active crypto airdrops.

## When it activates

Auto-activates on: `airdrop`, `eligible`, `allocation`, `snapshot`.

## What it does

1. Lists active airdrops (`airdrop_radar`)
2. Checks eligibility for each
3. Analyzes wallet for sybil patterns
4. Reports estimated allocations + claim tips

## Tools required (cross-plugin)

- `plugin-airdrop`: airdrop_radar, airdrop_eligibility
- `plugin-onchain`: wallet_balance
- `plugin-solana`: solana_wallet
