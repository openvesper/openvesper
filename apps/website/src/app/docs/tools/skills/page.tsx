import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1>Skills</h1>
      <p className="lead">
        Skills are markdown files that teach agents how to handle specific
        outcomes. They're modular, sharable, and version-controllable.
        OpenVesper implements the AgentSkills format, the same standard used
        in agent runtimes that use markdown-based skill definitions.
      </p>

      <h2>Anatomy of a skill</h2>

      <pre><code>{`skills/morning-brief/
└── SKILL.md`}</code></pre>

      <p>The <code>SKILL.md</code> file has frontmatter + body:</p>

      <pre><code>{`---
name: morning-brief
description: |
  Use when the user asks for a daily morning briefing, a summary of overnight
  events, or a general "what should I know today" question. Combines crypto,
  calendar, weather, and macro news into a single 5-bullet summary.
---

# Morning Brief

When the user asks for a brief, do these steps in order:

1. **Crypto snapshot**
   - Get BTC, ETH, SOL prices and 24h change
   - Note any token with > 10% move
2. **Calendar**
   - Pull today's calendar via plugin-calendar
   - List meetings with time + attendees
3. **Weather**
   - Use plugin-weather for the user's stored location
4. **Macro**
   - One bullet if there's a major release today (CPI, FOMC, jobs)
5. **Synthesis**
   - Output as 5 markdown bullets, no preamble
   - Use plain language, no jargon

## Style notes

- No "Good morning!" greeting; the user knows they're getting a brief.
- Use 24-hour time format unless the user has set a preference.
- Numbers: round prices to nearest dollar over $100, two decimals otherwise.`}</code></pre>

      <h2>The frontmatter</h2>
      <table>
        <thead><tr><th>Field</th><th>Required</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td><code>name</code></td><td>yes</td><td>Unique skill name (kebab-case)</td></tr>
          <tr><td><code>description</code></td><td>yes</td><td>When to use this skill. Read by the LLM during retrieval.</td></tr>
        </tbody>
      </table>

      <p>
        The <code>description</code> is critical — it's how the runtime
        decides whether to pull this skill into the context. Write it as
        "when should this skill be used?", not "what does it do?".
      </p>

      <h2>The 5-tier skill precedence</h2>
      <p>
        Skills can live in 5 places. When two skills have the same name,
        the higher tier wins. From highest to lowest:
      </p>

      <ol>
        <li>
          <strong>Workspace</strong> — <code>skills/</code> in the current working
          directory. Used for project-specific overrides.
        </li>
        <li>
          <strong>Project agent</strong> — <code>.agents/&lt;agent&gt;/skills/</code>{" "}
          in the project root. Agent-specific skills for this project.
        </li>
        <li>
          <strong>Personal agent</strong> — <code>~/.openvesper/agents/&lt;agent&gt;/skills/</code>.
          Your personal overrides that follow you across projects.
        </li>
        <li>
          <strong>Managed</strong> — skills installed via package managers (npm).
          Curated by trusted authors.
        </li>
        <li>
          <strong>Bundled</strong> — skills shipped inside plugin packages.
          The framework's defaults.
        </li>
      </ol>

      <p>
        This precedence chain lets you
        share skills across all three.
      </p>

      <h2>The 36 shipped skills</h2>

      <p>
        All skills are bound to a specific agent. They live under{" "}
        <code>.agents/&lt;mode&gt;/skills/&lt;skill-name&gt;/SKILL.md</code>.
        When an agent runs, the runtime loads its skills based on the user's
        prompt and the skill's <code>description</code> field.
      </p>

      <h3>Skill count per agent</h3>

      <table>
        <thead><tr><th>Agent</th><th>Skills</th></tr></thead>
        <tbody>
          <tr><td><code>code-reviewer</code></td><td>6 — bug-triage, code-explanation, debug-prod-issue, pr-description, refactor-plan, pr-review-checklist</td></tr>
          <tr><td><code>productivity-coach</code></td><td>5 — daily-standup, weekly-retro, morning-briefing, meeting-prep, time-blocking</td></tr>
          <tr><td><code>investment-researcher</code></td><td>4 — deep-research, investment-thesis, airdrop-eligibility, market-news-digest</td></tr>
          <tr><td><code>defi-strategist</code></td><td>3 — defi-position-review, pre-trade-checklist, yield-comparison</td></tr>
          <tr><td><code>bags-hunter</code></td><td>3 — scan-and-score, rug-check-deep, portfolio-review</td></tr>
          <tr><td><code>security-reviewer</code></td><td>2 — secret-scan, dependency-audit</td></tr>
          <tr><td><code>content-writer</code></td><td>2 — content-calendar, draft-from-notes</td></tr>
          <tr><td><code>sales-coach</code></td><td>2 — customer-discovery, follow-up-email</td></tr>
          <tr><td>Other 9 agents</td><td>1 skill each</td></tr>
        </tbody>
      </table>

      <h3>Example structure</h3>

      <pre><code>{`.agents/code-reviewer/skills/
├── bug-triage/
│   └── SKILL.md
├── pr-description/
│   └── SKILL.md
├── refactor-plan/
│   └── SKILL.md
└── ... (3 more)`}</code></pre>

      <p>
        You can add your own by creating a new directory under any agent's{" "}
        <code>skills/</code> folder with a <code>SKILL.md</code> inside.
      </p>

      <h2>How retrieval works</h2>
      <p>
        At the start of every conversation, the runtime:
      </p>
      <ol>
        <li>Loads all skills available to the current agent</li>
        <li>Reads each skill's <code>description</code> field</li>
        <li>Asks the LLM (or a smaller, cheaper model) to pick which skills are relevant to the user's message</li>
        <li>Injects the body of selected skills into the system prompt</li>
      </ol>

      <p>
        This means skills should have <strong>clear, specific descriptions</strong>{" "}
        and <strong>focused content</strong>. A vague "general writing tips" skill
        will be picked too often. A specific "drafting bug reports" skill will
        be picked at the right moment.
      </p>

      <h2>Writing your own skill</h2>

      <h3>1. Create the directory</h3>
      <pre><code>{`mkdir -p skills/my-skill
cd skills/my-skill`}</code></pre>

      <h3>2. Write SKILL.md</h3>
      <pre><code>{`---
name: my-skill
description: Use when the user asks me to do X. Specifically, this skill applies when Y or Z happens.
---

# My Skill

Here is what I should do step by step:

1. First action
2. Second action
3. Third action

## Important notes

- Don't do A
- Always prefer B over C`}</code></pre>

      <h3>3. Test the skill</h3>
      <pre><code>{`# List discovered skills
node apps/cli/dist/index.js skill list

# Verify your skill appears
node apps/cli/dist/index.js skill info my-skill`}</code></pre>

      <h2>Best practices</h2>

      <h3>Write descriptions like triggers</h3>
      <p>
        ✅ "Use when the user asks for code review feedback on a pull request."<br/>
        ❌ "A skill that helps with code review."
      </p>

      <h3>Keep skills focused</h3>
      <p>
        If your skill body is over 1000 words, it's probably two skills.
        Smaller skills retrieve more accurately.
      </p>

      <h3>Reference tools by name</h3>
      <p>
        Inside the skill body, name the specific tools the agent should use:{" "}
        <code>crypto_price</code>, <code>github_open_pr</code>, etc. This
        anchors the skill to actual capabilities.
      </p>

      <h3>Version skills via git</h3>
      <p>
        Skills are plain markdown. Commit them, branch them, share them. Skills
        from <code>workspace</code> tier come with your project's git history.
      </p>

      <h2>What's next?</h2>
      <ul>
        <li><Link href="/docs/concepts/agent">Agents</Link> — agents reference skills</li>
        <li><Link href="/docs/concepts/plugins">Plugins</Link> — skills reference plugin tools</li>
        <li><Link href="/docs/concepts/architecture">Architecture</Link> — how all three fit together</li>
      </ul>
    </div>
  );
}
