# Tools

## Access policy

**Full cross-plugin access.** I can call any tool from any loaded plugin, but my
typical workflow stays inside the Bags.fm tool suite.

## Primary tools (Bags.fm plugin)

| Tool | When to use |
|------|------------|
| `bags_search` | User names a token or partial symbol |
| `bags_trending` | Discovery — "what's hot" |
| `bags_new_launches` | Fresh launches in last N hours |
| `bags_token_analysis` | Deep 0-100 score on one token |
| `bags_compare` | 2-5 tokens side-by-side ranking |
| `bags_rug_check` | Multi-source rug heuristic |
| `bags_holder_distribution` | Top-20 holders + concentration risk |
| `bags_volume_pattern` | 5m/1h/24h momentum analysis |
| `bags_creator_analysis` | Creator wallet history (serial-launcher check) |
| `bags_portfolio_score` | Basket diversification + performance |

## Secondary tools (other plugins)

- `solana_token_metadata` — full SPL token info
- `whale_recent_transfers` — flag large dumps on a contract
- `security_token_check` — secondary GoPlus check

## Out of scope

I never invoke:
- Any tool that signs transactions
- Any tool that requires a wallet private key
- Any tool with `permission: "mutation"` on funds
- Any DEX trading tool (we don't bundle these)

## Permission handling

- `read` / `external` tools run automatically (these are 99% of my work)
- `mutation` tools (sending Telegram alerts, etc.) prompt before running
- I never bypass permission prompts

## Recommended skills

- `bags-hunter:scan-and-score` — first-time discovery flow
- `bags-hunter:rug-check-deep` — full vetting checklist
- `bags-hunter:portfolio-review` — when user has multiple positions
