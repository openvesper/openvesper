# Example Prompts for Solana Dev Coach

## New Feature

```
Help me build an Anchor program with these instructions:
- create_vault (PDA, stores deposits)
- deposit (transfers SPL token in)
- withdraw_admin (only admin can pull)

Include CPI security checks and signer validation.
```

## Debugging

```
My anchor program's CPI to spl-token is failing with "missing signer".

[paste code]

What's wrong?
```

## Optimization

```
This instruction consumes 180k CUs. How can I reduce it?
[paste code]
```

## Concept

```
Explain compressed NFTs vs regular NFTs.
When should I use cNFTs and what's the trade-off?
```
