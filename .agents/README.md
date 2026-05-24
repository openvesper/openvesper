# 🌒 Agent Workspaces

Each subdirectory in `.agents/` is a self-contained **agent workspace** following the standard bootstrap-file convention.

## Workspace File Structure

```
.agents/<agent-name>/
├── SOUL.md           # Persona, tone, boundaries (loaded every session)
├── IDENTITY.md       # Agent name, vibe, emoji (loaded every session)
├── USER.md           # Who the user is and how to address them
├── TOOLS.md          # Tool conventions and access policy
├── HEARTBEAT.md      # Optional: cron checklist for scheduled runs
├── MEMORY.md         # Long-term memory (main session only)
├── memory/
│   └── YYYY-MM-DD.md # Daily memory logs
├── skills/
│   └── <skill>/
│       ├── SKILL.md  # Agent-specific reusable prompt
│       ├── scripts/  # Executable helpers
│       └── references/ # Docs loaded on-demand
└── references/       # Bundled docs (README, examples, etc.)
```

## Bootstrap Files (Loaded into Every Session)

| File | Purpose | Required? |
|------|---------|-----------|
| `SOUL.md` | Persona, tone, boundaries | ✅ Yes |
| `IDENTITY.md` | Name, mode, icon, version | Recommended |
| `USER.md` | User context | Recommended |
| `TOOLS.md` | Tool access policy | Recommended |
| `MEMORY.md` | Long-term memory | Optional |
| `HEARTBEAT.md` | Heartbeat checklist | Optional |

The runtime concatenates these into the system prompt with `loadWorkspaceBootstrap()`.

If a file is missing, the runtime injects a "missing file" marker and continues.

## Available Agents

| Agent | Icon | Role |
|-------|------|------|
| **Engineering** | | |
| [security-reviewer](./security-reviewer/) | 🛡 | OWASP code + crypto token audits |
| [tdd-coach](./tdd-coach/) | 🧪 | Test-driven development guide |
| [code-reviewer](./code-reviewer/) | 👨‍💻 | Senior PR reviewer |
| [solana-dev-coach](./solana-dev-coach/) | ☀️ | Solana program mentor |
| [data-analyst](./data-analyst/) | 📊 | SQL queries, CSV analysis, statistical insights |
| **Crypto & Finance** | | |
| [defi-strategist](./defi-strategist/) | 🏦 | Multi-protocol DeFi opportunities |
| [investment-researcher](./investment-researcher/) | 🔬 | Equity & crypto research with rigorous DD |
| **Business** | | |
| [content-writer](./content-writer/) | ✍️ | Blog posts, social, marketing copy |
| [sales-coach](./sales-coach/) | 💼 | Discovery calls, objection handling, deals |
| [legal-assistant](./legal-assistant/) | ⚖️ | Contract review, terms in plain English |
| **Productivity & Life** | | |
| [productivity-coach](./productivity-coach/) | ⚡ | Task prioritization & deep work |
| [travel-planner](./travel-planner/) | ✈️ | Day-by-day trip itineraries |
| [cooking-coach](./cooking-coach/) | 👨‍🍳 | Recipes, techniques, substitutions |
| [language-tutor](./language-tutor/) | 🗣 | Conversational practice, grammar |
| [fitness-trainer](./fitness-trainer/) | 💪 | Strength programs, form coaching |
| **Mentorship** | | |
| [stoic-mentor](./stoic-mentor/) | 🏛 | Marcus Aurelius-style mentor |

## Loading an Agent

```bash
vesper --agent security-reviewer
```

Programmatically:

```typescript
import {
  createVesper,
  loadAgentFromMarkdown,
  loadWorkspaceBootstrap,
} from "@openvesper/core";

const loaded = loadAgentFromMarkdown(".agents/security-reviewer");
// → { agent, skills, manifestPath, rootDir }

// Get the full bootstrap prompt
const bootstrap = loadWorkspaceBootstrap(".agents/security-reviewer", {
  includeMemory: true,
  includeTodayLog: true,
});

console.log(bootstrap.systemPrompt);  // SOUL + IDENTITY + USER + TOOLS + MEMORY + today's log
console.log(bootstrap.missing);       // Files that weren't found
console.log(bootstrap.totalChars);    // Char budget used
```

## Creating a New Agent

Use the setup helper:

```typescript
import { setupAgentWorkspace } from "@openvesper/core";

const result = setupAgentWorkspace(".agents/my-agent", {
  name: "My Agent",
  icon: "🎯",
  mode: "my-agent",
});

console.log("Created:", result.created);
console.log("Skipped:", result.skipped);
```

Or by hand:

1. Create folder: `.agents/my-agent/`
2. Write `SOUL.md` (persona, tone, boundaries — this is the main system prompt)
3. Write `IDENTITY.md` (name, mode, icon)
4. Write `USER.md` (who the user is)
5. Write `TOOLS.md` (tool access policy)
6. Optionally add `MEMORY.md`, `HEARTBEAT.md`
7. Create `memory/`, `skills/`, `references/` subdirectories

## Skill Precedence

When skill names collide, the highest source wins:

1. **workspace** — `~/.openvesper/workspace/skills/`
2. **project-agent** — `.agents/<agent>/skills/` (this directory)
3. **personal-agent** — `~/.openvesper/agents/<agent>/skills/`
4. **managed** — `~/.openvesper/skills/`
5. **bundled** — `./skills/` (project-wide)

Use `resolveSkillsWithPrecedence()` to compute the effective skill set:

```typescript
import { resolveSkillsWithPrecedence } from "@openvesper/core";

const skills = resolveSkillsWithPrecedence([
  { level: "workspace", dir: "~/.openvesper/workspace/skills" },
  { level: "project-agent", dir: ".agents/security-reviewer/skills" },
  { level: "personal-agent", dir: "~/.openvesper/agents/security-reviewer/skills" },
  { level: "managed", dir: "~/.openvesper/skills" },
  { level: "bundled", dir: "skills" },
]);
```

## Cross-Plugin Tool Access

Every agent's `TOOLS.md` declares its access policy. The default for agents in this repo is **"Full cross-plugin access"** — the agent can call any tool from any loaded plugin.

To restrict an agent, replace TOOLS.md with an explicit whitelist:

```markdown
# Tools

## Access policy

Restricted to:
- read_file
- search_files
- token_security

## Permission rules

- All other tools require explicit upgrade
```

## Memory

The `memory/` folder holds daily log files (`YYYY-MM-DD.md`). The agent reads today's + yesterday's at session start to maintain context.

`MEMORY.md` holds long-term curated memory (facts, preferences, decisions). Only loaded in the main, private session.

## Philosophy

Agents are personas, not programs. The bootstrap files (SOUL, IDENTITY, USER, TOOLS) compose into a system prompt that gives the agent character and constraints — like a job description for the AI.

Skills are skills, not tools — they teach the agent how to handle specific situations. Tools are the primitives skills compose with.
