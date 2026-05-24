import Link from "next/link";

const AGENTS = [
  {
    category: "General",
    items: [
      { mode: "auto", icon: "🤖", name: "Auto", desc: "Default agent. Routes to the right tool based on input." },
    ],
  },
  {
    category: "Crypto & DeFi",
    items: [
      { mode: "bags-hunter", icon: "🎒", name: "Bags Hunter", desc: "Solana memecoin specialist for Bags.fm — scoring, rug-checking, portfolio review." },
      { mode: "defi-strategist", icon: "🏦", name: "DeFi Strategist", desc: "Multi-protocol yield, risk decomposition, position monitoring." },
      { mode: "investment-researcher", icon: "🔬", name: "Investment Researcher", desc: "Thesis tracking, market analysis, news impact scoring." },
      { mode: "solana-dev-coach", icon: "☀️", name: "Solana Dev Coach", desc: "Anchor, SPL, Token-2022, cNFT guidance." },
    ],
  },
  {
    category: "Software development",
    items: [
      { mode: "code-reviewer", icon: "👨‍💻", name: "Code Reviewer", desc: "PR reviews, refactor suggestions, style critique." },
      { mode: "security-reviewer", icon: "🛡", name: "Security Reviewer", desc: "Code audits, secret scanning, dependency review." },
      { mode: "tdd-coach", icon: "🧪", name: "TDD Coach", desc: "Test-first development guidance, failing-test generation." },
    ],
  },
  {
    category: "Productivity",
    items: [
      { mode: "productivity-coach", icon: "⚡", name: "Productivity Coach", desc: "Daily standup, weekly retros, task tracking." },
      { mode: "data-analyst", icon: "📊", name: "Data Analyst", desc: "Data exploration, SQL, chart generation." },
      { mode: "content-writer", icon: "✍️", name: "Content Writer", desc: "Blog drafts, social posts, editorial calendar." },
      { mode: "sales-coach", icon: "💼", name: "Sales Coach", desc: "Pipeline review, cold outreach, follow-up reminders." },
      { mode: "legal-assistant", icon: "⚖️", name: "Legal Assistant", desc: "Contract review, deadline tracking, doc summaries." },
    ],
  },
  {
    category: "Lifestyle",
    items: [
      { mode: "stoic-mentor", icon: "🏛", name: "Stoic Mentor", desc: "Daily reflection, perspective on hard situations." },
      { mode: "fitness-trainer", icon: "💪", name: "Fitness Trainer", desc: "Workout plans, training adjustments, recovery." },
      { mode: "cooking-coach", icon: "👨‍🍳", name: "Cooking Coach", desc: "Recipe ideas, meal planning, dietary substitutions." },
      { mode: "language-tutor", icon: "🗣", name: "Language Tutor", desc: "Vocabulary, grammar, conversation practice." },
      { mode: "travel-planner", icon: "✈️", name: "Travel Planner", desc: "Trip planning, itineraries, visa lookups." },
    ],
  },
];

export default function Page() {
  return (
    <div>
      <h1>Agents</h1>
      <p className="lead">
        17 specialist agents ship with OpenVesper. Each is a directory of
        markdown files — no code, no compilation. Install only the ones you
        need, set one as the default, and switch any time.
      </p>

      <h2>Agent workflow</h2>

      <p>
        Agents work like any other package manager: browse, install, start, run.
      </p>

      <h3>1. Browse</h3>
      <pre><code>{`# See all available agents (bundled + your installed)
vesper agent registry

# Search by name, tag, or description
vesper agent search defi

# See details on one agent
vesper agent show bags-hunter`}</code></pre>

      <h3>2. Install</h3>
      <p>
        Installing an agent copies it from the bundled directory (<code>.agents/</code>)
        to your user directory (<code>~/.openvesper/agents/</code>). You can
        then edit the markdown files freely without touching the source.
      </p>
      <pre><code>{`vesper agent install bags-hunter

# Output:
# ✓ Installed: bags-hunter
#   Path: /home/you/.openvesper/agents/bags-hunter
# Next steps:
#   vesper agent run bags-hunter "test"
#   vesper agent start bags-hunter`}</code></pre>

      <h3>3. Start (make it default)</h3>
      <pre><code>{`vesper agent start bags-hunter

# Now all queries without -a flag use this agent
vesper -q "What's trending on Bags.fm?"
# → routes to bags-hunter automatically`}</code></pre>

      <h3>4. Run (one-off, no default change)</h3>
      <pre><code>{`vesper agent run defi-strategist "Best stablecoin yields right now?"`}</code></pre>

      <h3>5. List installed</h3>
      <pre><code>{`vesper agent list

# Output:
# Installed agents:
#   ● 🎒  bags-hunter     Bags Hunter      ♥
#   ○ 🏦  defi-strategist DeFi Strategist
#
# (● = currently active, ♥ = heartbeat enabled)`}</code></pre>

      <h3>6. Stop or uninstall</h3>
      <pre><code>{`# Stop using the current default — revert to "auto"
vesper agent stop

# Remove an agent entirely
vesper agent uninstall bags-hunter`}</code></pre>

      <h2>Create your own</h2>
      <p>
        Scaffold a new agent with all 6 core files pre-filled:
      </p>
      <pre><code>{`vesper agent create my-trading-coach`}</code></pre>
      <p>
        This creates <code>~/.openvesper/agents/my-trading-coach/</code> with:
      </p>
      <ul>
        <li><code>SOUL.md</code> — persona template</li>
        <li><code>IDENTITY.md</code> — metadata template</li>
        <li><code>USER.md</code> — user context template</li>
        <li><code>TOOLS.md</code> — tool policy template</li>
        <li><code>HEARTBEAT.md</code> — scheduled checklist (disabled)</li>
        <li><code>MEMORY.md</code> — empty memory store</li>
        <li><code>skills/</code> — directory for your custom skills</li>
      </ul>

      <p>
        Edit any file, run <code>vesper agent run my-trading-coach "test"</code>,
        iterate. No rebuild needed — markdown files are read fresh on every run.
      </p>

      <h2>Browse the catalog</h2>

      {AGENTS.map((group) => (
        <div key={group.category}>
          <h3>{group.category}</h3>
          <ul style={{ listStyle: "none", paddingLeft: 0, marginBottom: "1.5rem" }}>
            {group.items.map((agent) => (
              <li key={agent.mode} style={{ marginBottom: "0.75rem" }}>
                <Link href={`/docs/agents/${agent.mode}`} style={{ display: "block" }}>
                  <span style={{ fontSize: "1.1em" }}>{agent.icon}</span>{" "}
                  <strong>{agent.name}</strong>{" "}
                  <code style={{ fontSize: "0.85em" }}>{agent.mode}</code>
                </Link>
                <span style={{ fontSize: "0.9em", opacity: 0.7 }}>{agent.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>Scheduling agents (heartbeats)</h2>
      <p>
        Every agent ships with a <code>HEARTBEAT.md</code> file. Edit it to
        set <code>enabled: true</code> and a cron schedule, then the gateway
        will wake the agent periodically to check on tasks proactively.
      </p>
      <p>
        See <Link href="/docs/automation/cron-jobs">Cron Jobs</Link> and{" "}
        <Link href="/docs/gateway">Gateway</Link> for the proactive loop
        details.
      </p>
    </div>
  );
}
