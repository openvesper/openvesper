# Security Policy

## 🔒 Zero Data Retention

**OpenVesper does not collect, store, transmit, or retain any user data on our servers.**

Concretely:

- **No telemetry.** No usage analytics, no error reporting to us, no "anonymous metrics."
- **No phone-home.** OpenVesper never contacts openvesper.com, OpenVesper servers, or any analytics endpoint at runtime.
- **No remote logging.** Logs are local. We cannot see them. We never receive them.
- **No "cloud sync."** Memory, conversations, agent files, and configurations live exclusively on your machine.
- **No accounts.** There is nothing to sign up for. We have no user database.
- **No prompt logging.** Your prompts and the model's responses are never sent to us.

When you use OpenVesper:
- **Your LLM provider** (Anthropic, OpenAI, etc.) sees your prompts. That is their privacy policy, not ours.
- **External APIs you configure** (Telegram, Slack, Spotify, etc.) see the data you choose to send them.
- **Your local disk** stores memory, configurations, and logs only if you enable them.

If you find any code in this repository that violates this policy — for example, a hidden analytics call or telemetry beacon — **report it immediately** as a security issue. We treat any unauthorized data exfiltration as a P0 vulnerability.

## 🔑 Wallet Key Policy — We Never Ask, We Never Touch

**OpenVesper NEVER asks for, stores, or uses the user's main wallet private key or seed phrase. For any feature.**

This is a hard architectural rule, not a guideline:

- **No plugin** in this repository reads a "main wallet private key" env var.
- **No bundled agent persona** asks for a seed phrase. If a bundled one does, that's a bug — file a security issue. (Custom agents you author are your responsibility.)
- **No bundled example or doc** instructs you to paste a main wallet key into `.env`. Treat any such instruction outside this repo with the usual scrutiny.

### Trading execution is not bundled by default

OpenVesper is a framework, not a trading product. The bundled plugins ship
read-only crypto data tools (price feeds, on-chain queries, holder
distribution, etc.) but no signing or order-submission code for perpetual
DEXes (Hyperliquid, Lighter, Drift, etc.).

This is a packaging default, not a hard restriction. If you want trading
from an OpenVesper agent, you have two paths:

1. **Build your own plugin** — implement signing in a plugin under your control,
   keep it in your own repo or workspace, and OpenVesper will run it. The
   framework imposes no restriction on what your plugin can do.
2. **Keep signing in a separate process** — wire signals from OpenVesper to
   an external trading service via webhooks. Useful if you want stricter
   isolation between the LLM-driven layer and the execution layer.

For CEX trading with standard API keys (Binance, Bybit, Coinbase, etc.), you
can configure them in `.env` and use the read-only data they provide. The
bundled tools do not expose withdrawal endpoints — add them in your own
plugin if you need them.

### Setting up safely

1. Use a **fresh API wallet / API key** with no withdrawal permissions
3. Set strict file permissions: `chmod 600 .env`
4. Never commit `.env` to git (it's in `.gitignore` by default)
5. Rotate the credential if you suspect compromise
6. Trading defaults to **`*_LIVE_TRADING=false`** — orders are dry-run unless you explicitly opt in

### If you see "private key" anywhere

The phrase "private key" in this repository should only appear in:
- This security policy (explaining why we don't use them)
- The `.env.example` warnings (telling you NOT to paste yours)
- Documentation explaining the API-wallet pattern

If a **bundled** plugin references `MAIN_PRIVATE_KEY`, `WALLET_PRIVATE_KEY`, or prompts for a seed phrase, that is a bug — file a security issue. (User-built plugins are out of scope; what you put in your own plugin code is your call.)

## What Stays on Your Machine

When enabled, the following data is stored **locally only** at `~/.openvesper/`:

| Data | Location | Default |
|------|----------|---------|
| API keys, tokens | `~/.openvesper/.env` (perm `0600`) | n/a — you provide |
| Configuration | `~/.openvesper/openvesper.json` | created on first run |
| Memory (opt-in) | `~/.openvesper/workspace/memory.json` (perm `0600`) | **disabled by default** |
| Conversations | `~/.openvesper/workspace/conversations/` | **disabled by default** |
| Agent files | `.agents/<name>/` in your project | n/a |
| Daily logs | `.agents/<name>/memory/YYYY-MM-DD.md` | **disabled by default** |
| Cron state | `~/.openvesper/workspace/heartbeat.json` (perm `0600`) | only if you add jobs |

Memory and conversation persistence are **opt-in**. The `MemoryManager` defaults to `enabled: false`. The runtime never writes prompts or responses to disk unless you explicitly configure it.

You can wipe all local data at any time:

```bash
vesper memory compact          # trim to last 500 items
rm -rf ~/.openvesper/workspace # nuclear option
```

## Reporting a Vulnerability

If you discover a security issue in OpenVesper:

1. **Do NOT** open a public GitHub issue or post about it on social media first.
2. Email: `security@openvesper.com` (or DM `@openvesper` on X).
3. Include:
   - Description of the vulnerability
   - Reproduction steps
   - Affected versions
   - Impact assessment
   - Suggested fix if you have one

We aim to acknowledge within 48 hours and ship a fix within 14 days for critical issues.

We support responsible disclosure. We don't pay bounties (yet), but contributors get credit in the release notes and shoutouts.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.x     | ✅ Yes    |
| 2.x     | ⚠️ Critical fixes only |
| 1.x     | ❌ No     |

## Security Model

OpenVesper runs **locally by default**. Trust boundaries:

- **You control** all API keys (stored in `.env`, not in the codebase).
- **You control** which plugins are loaded.
- **You control** the LLM provider.
- **The runtime** enforces permission gates on mutating tools.
- **The runtime** does not leak data to us under any condition.

### Permission gates

Every tool is tagged with a permission level. The runtime enforces:

| Level | Auto-approve? | Examples |
|-------|---------------|----------|
| `read` | ✅ Yes | File reads, API GETs, on-chain queries |
| `external` | ✅ Yes | Twitter reads, Slack reads, web searches |
| `write` | ❌ Prompts user | File writes, DB inserts, Notion page edits |
| `execute` | ❌ Prompts user | Shell commands, code execution |
| `trade` | ❌ Prompts user | DEX orders, transfers, withdrawals |

If a plugin author tags a write/execute/trade tool as `read`, that's a security bug. Report it.

### Shell hardening

The shell plugin blocks dangerous patterns regardless of permission:

```
rm -rf /              fork bombs              mkfs
dd if=/dev/...        shutdown                reboot
passwd                > /dev/sda
```

### Filesystem sandbox

The filesystem plugin's `safePath()` function rejects any path that resolves outside the workspace directory, preventing path traversal (`../../etc/passwd`).

### Trading safety

All trading defaults to **dry-run mode**. Real orders require explicit environment variables:



Private keys are read from env vars and **never logged**.

## Threat Model

### We protect against:

- ✅ Untrusted user input reaching shell/SQL/eval
- ✅ Tool execution without user consent (permission gates)
- ✅ Private key leakage in logs
- ✅ Dangerous shell patterns
- ✅ Path traversal in filesystem operations
- ✅ Unauthorized data exfiltration to our infrastructure (we have none)
- ✅ MIME-sniffing on the website (security headers in `next.config.js`)
- ✅ Clickjacking on the website (`X-Frame-Options: DENY`)
- ✅ Content injection on the website (strict CSP)

### We do NOT protect against:

- ❌ Malicious third-party plugins (you choose what to install — review the code)
- ❌ Compromised LLM provider (use a provider you trust)
- ❌ Physical machine compromise
- ❌ Browser extensions that read page contents
- ❌ Other local users on a multi-user machine with weak permissions

## Hardening Recommendations

For users running OpenVesper in production or with sensitive data:

1. **Set file permissions on your workspace:**
   ```bash
   chmod 700 ~/.openvesper
   chmod 600 ~/.openvesper/.env
   ```

2. **Use a dedicated user account** if running on a shared machine.

3. **Run the gateway in a container** for isolation:
   ```bash
   docker-compose up -d
   ```

4. **Audit plugins before installing.** Third-party plugins run with the same access as built-in ones.

5. **Rotate API keys regularly.** If you suspect a key is compromised, revoke it immediately.

6. **Use read-only API tokens where possible.** Telegram, Slack, GitHub, etc. all support scoped tokens.

7. **Disable memory persistence** if you don't need it:
   ```json
   { "memory": { "enabled": false } }
   ```

8. **No perp DEX trading is bundled.** If you want it, build it separately with proper auditing.

## Audit Trail

When permission-gated tools (`write`, `execute`, `trade`) are invoked, the runtime emits a tool-call event with the input. If you want an audit trail, attach a handler:

```typescript
vesper.task({...}).on("tool_call", (e) => {
  console.log(`[${new Date().toISOString()}] ${e.name}`, e.input);
});
```

Events are local. They are not sent to us.

## Contact

- **Security issues:** security@openvesper.com
- **General questions:** [GitHub Discussions](https://github.com/openvesper/openvesper/discussions)
- **Author:** [@openvesper](https://github.com/openvesper) (OpenVesper 🌒)
