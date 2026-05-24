import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Agents</h1>
      <p className="lead">
        An agent in OpenVesper is a directory of markdown files. No code, no
        compilation, no special tooling — just plain text you can edit in any editor.
      </p>

      <h2>What is an agent?</h2>
      <p>
        An agent is a persona + tool policy + memory. The runtime takes these
        markdown files, assembles them into a system prompt, and hands that
        prompt to an LLM along with the registered tools. Different agents
        produce different behaviors from the same model.
      </p>

      <p>
        OpenVesper ships with 16 agents in <code>.agents/</code>. You can
        create your own, override an existing one, or use them as-is.
      </p>

      <h2>Agent directory structure</h2>
      <pre><code>{`.agents/security-reviewer/
├── SOUL.md                    Who I am, how I think
├── IDENTITY.md                Metadata: name, icon, model
├── USER.md                    What I know about you
├── TOOLS.md                   Which tools I use
├── HEARTBEAT.md               Scheduled tasks (opt-in)
├── MEMORY.md                  Long-term memory
├── memory/
│   └── 2026-05-14.md          Daily session log
├── skills/
│   ├── pr-review/
│   │   └── SKILL.md           Agent-specific skill
│   └── secret-scan/
│       └── SKILL.md
└── references/                Static reference docs`}</code></pre>

      <h2>The 6 core files</h2>

      <h3>SOUL.md — Who the agent is</h3>
      <p>
        SOUL.md describes the agent's persona, principles, voice, and refusals.
        It's the "system prompt" portion that defines character. Example:
      </p>

      <pre><code>{`# Soul

I am the Security Reviewer.

I read code looking for security issues — hardcoded secrets,
unsafe shell calls, SQL injection, missing input validation,
unsafe deserialization, race conditions, privilege confusion.

I report findings concisely with file:line citations and the
CWE category when applicable. I don't editorialize.

When I'm uncertain whether something is a real issue, I say so.
I'd rather flag a false positive than miss a real one.

I never modify code without explicit permission. I review and report.`}</code></pre>

      <h3>IDENTITY.md — Metadata</h3>
      <p>
        Structured metadata for the runtime to discover the agent and pick the right model.
      </p>

      <pre><code>{`# Identity

mode: security-reviewer
name: Security Reviewer
icon: 🛡
description: Reviews code for security issues, reports findings.
defaultModel: claude-opus-4-5
defaultProvider: anthropic`}</code></pre>

      <h3>USER.md — User context</h3>
      <p>
        What this agent should know about you. This is your space to give
        background — your role, the company, the codebase conventions.
      </p>

      <pre><code>{`# About the user

You are reviewing code written by a solo developer
working on the OpenVesper monorepo. The codebase is TypeScript,
strict mode, no eslint disable comments, no \`any\` types unless
genuinely necessary.

Skip nitpicky style issues — only flag genuine security problems.`}</code></pre>

      <h3>TOOLS.md — Tool policy</h3>
      <p>
        Which plugins this agent intends to use. Currently advisory (the
        runtime allows all tools); a future release will enforce this as
        a runtime gate.
      </p>

      <pre><code>{`# Tools

Primary: filesystem (read-only), code, github
Secondary: shell (with strict allowlist), security
Out of scope: trading, social, email (this agent stays read-only)

This agent prefers to read code, search for patterns, and
report. It does not modify files or open PRs without
explicit user instruction.`}</code></pre>

      <h3>HEARTBEAT.md — Scheduled tasks</h3>
      <p>
        An optional checklist the agent runs on a cron schedule when
        autonomous mode is enabled. Disabled by default for all 16 agents.
      </p>

      <pre><code>{`---
schedule: "0 9 * * MON"
enabled: false
---

# Heartbeat — security-reviewer

## Recurring task

Weekly: scan recently merged PRs for security issues.
Audit any new dependencies added in the last 7 days.`}</code></pre>

      <p>
        To activate: set <code>enabled: true</code> and run{" "}
        <Link href="/docs/automation/cron-jobs">the scheduler daemon</Link>.
      </p>

      <h3>MEMORY.md — Long-term memory</h3>
      <p>
        Persisted facts the agent has learned across sessions. This file is
        rewritten by the runtime when memory is enabled (default off). For
        manually managed agents, you can hand-edit it.
      </p>

      <pre><code>{`# Memory

## Project conventions
- All new tools must include a permission field
- Error messages should be actionable, not just stack traces
- TypeScript strict mode is required

## User preferences
- Prefers concise output, no bullet-point overuse
- Casual Turkish tone in conversational responses`}</code></pre>

      <h2>The 16 shipped agents</h2>
      <table>
        <thead><tr><th>Mode</th><th>Icon</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>security-reviewer</code></td><td>🛡</td><td>Code security audits, secret scanning</td></tr>
          <tr><td><code>tdd-coach</code></td><td>🧪</td><td>Test-first development guidance</td></tr>
          <tr><td><code>code-reviewer</code></td><td>👨‍💻</td><td>PR reviews, refactor suggestions</td></tr>
          <tr><td><code>defi-strategist</code></td><td>🏦</td><td>Read-only DeFi position monitoring</td></tr>
          <tr><td><code>solana-dev-coach</code></td><td>☀️</td><td>Anchor, SPL, cNFT guidance</td></tr>
          <tr><td><code>productivity-coach</code></td><td>⚡</td><td>Task management, daily standup</td></tr>
          <tr><td><code>travel-planner</code></td><td>✈️</td><td>Trip planning, booking suggestions</td></tr>
          <tr><td><code>stoic-mentor</code></td><td>🏛</td><td>Daily reflection, principles</td></tr>
          <tr><td><code>data-analyst</code></td><td>📊</td><td>Data exploration, SQL, charts</td></tr>
          <tr><td><code>content-writer</code></td><td>✍️</td><td>Editorial calendar, drafting</td></tr>
          <tr><td><code>sales-coach</code></td><td>💼</td><td>Pipeline review, outreach drafts</td></tr>
          <tr><td><code>investment-researcher</code></td><td>🔬</td><td>Thesis tracking, market analysis</td></tr>
          <tr><td><code>legal-assistant</code></td><td>⚖️</td><td>Contract review, deadline tracking</td></tr>
          <tr><td><code>cooking-coach</code></td><td>👨‍🍳</td><td>Recipe ideas based on pantry</td></tr>
          <tr><td><code>language-tutor</code></td><td>🗣</td><td>Daily phrases, language practice</td></tr>
          <tr><td><code>fitness-trainer</code></td><td>💪</td><td>Workout plans, recovery check</td></tr>
        </tbody>
      </table>

      <h2>Creating your own agent</h2>
      <p>Easiest way: copy an existing one and rewrite the files.</p>

      <pre><code>{`# Copy a template
cp -r .agents/productivity-coach .agents/my-agent

# Edit the 6 core files in your editor
nano .agents/my-agent/SOUL.md
nano .agents/my-agent/IDENTITY.md
# ... etc

# Use the CLI to verify
node apps/cli/dist/index.js agent test my-agent`}</code></pre>

      <p>
        The <code>agent test</code> command validates the agent has all
        required files and previews the SOUL.md content. It does not actually
        run the LLM.
      </p>

      <h2>Switching between agents</h2>
      <p>
        At runtime, every interaction routes through a single agent. To use
        a different one:
      </p>

      <pre><code>{`# Via CLI
node apps/cli/dist/index.js agent --mode security-reviewer --message "audit this"

# Or set default in ~/.openvesper/config.json
{
  "defaultAgent": "auto",
  "providers": { ... }
}`}</code></pre>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/plugins">Plugins</Link> — how to build and register tools</li>
        <li><Link href="/docs/tools/skills">Skills</Link> — modular instruction snippets agents can pull in</li>
        <li><Link href="/docs/automation/cron-jobs">Cron Jobs & Heartbeats</Link> — autonomous mode</li>
      </ul>
    </div>
  );
}
