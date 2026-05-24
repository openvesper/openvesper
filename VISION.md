# 🌒 OpenVesper Vision

## What we're building

A **local-first agent runtime** that lives on your machine and stays out of your way.

OpenVesper is software you install — not a service you subscribe to. It runs as a
persistent gateway on your hardware, talks to LLM providers using credentials you
own, and stores your conversations and memory on your filesystem. There is no
OpenVesper account, no OpenVesper server, no telemetry.

## What we believe

### 1. Local-first is not a feature — it's the foundation

Every agent runtime has a network boundary. Where you draw that boundary
determines who owns the experience. If your agent's state lives in someone else's
database, your access depends on their terms of service, their uptime, and their
choices about your data.

We draw the boundary at the network call to the LLM provider, and only there.
Sessions, memory, audit logs, OAuth tokens, agent personas, plugin configuration —
all of it lives in `~/.openvesper/` on your disk, mode 0600. The LLM call goes
directly from your gateway to the provider you chose, using a key you control.

### 2. Markdown is the agent language

An agent in OpenVesper is a folder of markdown files:

```
.agents/<mode>/
├── SOUL.md        # persona, voice, refusals
├── IDENTITY.md    # name, mode, icon, tags
├── USER.md        # what the agent should know about you
├── TOOLS.md       # tool access policy
├── MEMORY.md      # durable notes across sessions
└── skills/<name>/SKILL.md   # specialized instruction sets
```

No code, no compilation, no build step for personas. You write text and the
runtime reads it.

### 3. Plugins are pure tools

A plugin ships TypeScript that defines tools. It does not ship personality.
The agent's behavior comes from its markdown; the plugin's job is to give the
agent capabilities — and nothing else.

This separation lets one plugin serve many agents (the `github` plugin is used
by `github-pm`, `code-reviewer`, and your own agents) and lets one agent
combine many plugins (the `defi-strategist` uses tools from `defi`, `derivatives`,
`whale`, `onchain`, `crypto`, and `web-search` simultaneously).

### 4. The framework should not tell you what to build

We ship sensible defaults — read-only data plugins, agents configured for
research rather than execution, mutation tools that route through an approval
queue. These defaults exist because they're safe starting points, not because we
think any other choice is wrong.

If you want to write a plugin that signs transactions, the framework will run
it. If you want to fork a bundled agent and remove its "I don't execute trades"
refusal, the framework will run it. What lives in `~/.openvesper/plugins/` and
`~/.openvesper/agents/` is your code on your machine — we have no opinion.

### 5. Channels are interchangeable

A conversation that starts in Telegram should continue in the CLI. A heartbeat
that fires from a cron job should be able to deliver its result via Discord
webhook, Slack DM, or just back to your terminal session. The gateway is the
single source of truth; channels are interchangeable transport.

This is why `sessionKey` identifies you, not the channel — and why every
channel adapter is just a plugin that pulls messages off some transport and
hands them to the gateway.

## What we won't build

These are deliberate scope decisions, not failures:

- **A hosted SaaS product.** OpenVesper is software. If you want to pay
  someone to run it for you, that's a separate business someone else can start.
- **Native mobile apps.** Mobile companion apps require a separate platform team.
  We expose channels (Telegram, WhatsApp planned) so your phone reaches your
  agent via tools you already use.
- **A built-in trading product.** The framework runs whatever plugin you write,
  but the bundled plugins are read-only. Signing logic, key management, order
  execution — those belong in code you author and audit yourself.
- **Telemetry.** Not opt-in, not anonymous, not "just for crash reports." If we
  added a phone-home, the local-first promise would be a lie.

## Where we're going

The roadmap reflects the principles above:

- **Better channel coverage.** WhatsApp, Signal, Matrix, iMessage — more places
  your agent can meet you.
- **Sandboxed execution.** Docker-based isolation for the `non-main` sessions so
  group chats don't share filesystem access with your private session.
- **Voice surface.** When local STT/TTS becomes practical, the agent should be
  able to listen and respond out loud without sending audio to a cloud.
- **Plugin marketplace.** A federated registry — multiple URLs, no central
  gatekeeper — so plugin discovery doesn't depend on us approving anything.

What you won't see on the roadmap: a managed cloud version, a freemium tier,
or a subscription. The project ends in the same place it started — software on
your machine that does what you tell it to.

## How we measure success

Not by stars, downloads, or active users. By:

- **Time to first useful agent reply** for a new user (target: under 5 minutes
  from `git clone` to a working answer)
- **Number of conversations that survive a restart** (sessions persist or it's
  not really a gateway)
- **Number of plugins authored outside our org** (the ecosystem matters more
  than what we ship)
- **Disk footprint of `~/.openvesper/`** (everything stays small and inspectable)

## License

MIT. Fork it, sell forks, embed it in your product, ignore us entirely. We're
happy if any of this is useful to you.
