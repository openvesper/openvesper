---
name: token-rugcheck
description: Comprehensive rug-pull risk assessment for a crypto token
trigger_keywords: [rug, honeypot, scam check, token safety]
tools: [token_security, rugcheck, phishing_check]
---

# Token Rug Check

Run a comprehensive rug pull risk assessment:

## 1. Contract Security
- [ ] Honeypot? (can buy but cannot sell)
- [ ] Owner can mint unlimited?
- [ ] Owner can blacklist holders?
- [ ] Trading is disabled by owner?
- [ ] Hidden fees (>10%)?
- [ ] Proxy contract that can be upgraded?

## 2. Liquidity
- [ ] LP locked? Until when?
- [ ] LP burned? Verify on-chain
- [ ] % of supply in LP

## 3. Distribution
- [ ] Top 10 holders concentration
- [ ] Dev wallet activity (selling?)
- [ ] Sniper wallets present?

## 4. Team
- [ ] Doxxed?
- [ ] Prior rug history?
- [ ] Real socials (not stolen avatars)?

## Output

Score 0-100:
- 0-30: ✓ Likely safe (still DYOR)
- 31-60: ⚠ Caution flags present
- 61-100: 🚨 Multiple rug signals — avoid
