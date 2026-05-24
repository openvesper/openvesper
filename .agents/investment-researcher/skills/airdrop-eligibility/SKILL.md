---
name: airdrop-eligibility
description: Check wallet eligibility for active crypto airdrops. Use when the user mentions airdrop, eligible, allocation, snapshot, or provides a wallet address for airdrop checking. Scans active airdrops, checks per-protocol eligibility, analyzes wallet activity for sybil patterns, and reports estimated allocations with claim tips.
---

# Airdrop Eligibility Check

When user provides a wallet address:

## 1. Active airdrops
Run `airdrop_radar` to see which projects are airdropping NOW.

## 2. For each relevant airdrop
- Call `airdrop_eligibility(address, project)`
- Report: eligible? amount? claim deadline? gas required?

## 3. Wallet activity check
Wallets with these signals tend to get better allocations:
- ✓ 6+ months of activity
- ✓ Multiple chains used
- ✓ Held NFTs / governance tokens
- ✓ LP'd on early DEXes
- ✓ Voted in governance
- ✗ Sybil patterns (same time, same amount actions)

## 4. Output Format

```
🪂 AIRDROP CHECK — <address>

✅ ELIGIBLE:
• <Project A>: ~$<amount>, claim by <date>
• <Project B>: ~$<amount>, claim by <date>

⏳ POTENTIAL (snapshot not taken):
• <Project C>: keep using protocol X
• <Project D>: keep LPing on Y

❌ NOT ELIGIBLE:
• <Project E>: requires <criteria>

⚠ CLAIM TIPS:
• Use new wallet for high-value claims (anti-sybil)
• Check claim URLs against project's official Twitter
• Beware fake "claim" sites
```
