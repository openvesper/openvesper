// ============================================================
// 🌒 vesper init <template> — quick-start project templates
// ============================================================
//
// Three templates today:
//   - crypto-watcher    — agents watching markets + chat alerts
//   - code-reviewer     — agent reviewing GitHub PRs on push
//   - blog-writer       — agent drafting posts from prompts
//
// Each template creates a directory with:
//   - .env.example     (which API keys are needed)
//   - openvesper.json  (provider, default agent, channel config)
//   - cron.yaml        (optional scheduled tasks)
//   - README.md        (how to run it)
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

interface Template {
  name: string;
  description: string;
  defaultAgent: string;
  defaultProvider: string;
  envExample: string;
  readme: string;
  cronYaml?: string;
}

const TEMPLATES: Record<string, Template> = {
  "crypto-watcher": {
    name: "crypto-watcher",
    description: "Agents watching Solana memecoins + chat alerts",
    defaultAgent: "bags-hunter",
    defaultProvider: "anthropic",
    envExample: `# LLM provider — Anthropic recommended for tool-heavy workflows
ANTHROPIC_API_KEY=

# Optional: Telegram bot for alerts (run apps/telegram-bot/)
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USERS=

# Optional: Discord webhook for alerts
DISCORD_WEBHOOK_URL=

# Optional: Helius / QuickNode for richer Solana data
HELIUS_API_KEY=
`,
    readme: `# crypto-watcher

A crypto-focused OpenVesper deployment with bags-hunter, pumpfun-hunter,
and base-hunter agents pre-configured.

## Run

\`\`\`bash
# Configure your provider key
cp .env.example .env
$EDITOR .env

# Start the gateway
vesper gateway start -d

# Ask an agent
vesper -a bags-hunter -q "What are the top 5 Solana memecoins by 24h volume?"
\`\`\`

## What's included

- **bags-hunter** — Solana Pump.fun-style launches on Bags.fm
- **pumpfun-hunter** — Pump.fun specifically
- **base-hunter** — Base chain memecoins
- **defi-strategist** — TVL, yields, liquidity analysis

## Heartbeats

\`cron.yaml\` schedules:
- Hourly: scan top movers, alert on >50% pumps
- Daily 09:00: send Solana market summary to Telegram
`,
    cronYaml: `# Cron jobs for crypto-watcher
jobs:
  - name: hourly-pump-scan
    schedule: "0 * * * *"
    agent: bags-hunter
    prompt: |
      Scan the top 20 Solana memecoins by 24h volume. Report any that have
      pumped more than 50% in the last hour, with token name and current
      market cap.
  
  - name: daily-market-summary
    schedule: "0 9 * * *"
    agent: defi-strategist
    prompt: |
      Daily Solana ecosystem summary: SOL price action, top 3 protocols by
      TVL change, notable launches in the last 24h. Keep it short.
`,
  },

  "code-reviewer": {
    name: "code-reviewer",
    description: "Agent reviewing GitHub PRs + suggesting improvements",
    defaultAgent: "code-reviewer",
    defaultProvider: "anthropic",
    envExample: `# LLM provider — Anthropic is best at reading diffs and reasoning about code
ANTHROPIC_API_KEY=

# GitHub Personal Access Token with 'repo' + 'read:org' scopes
GITHUB_TOKEN=

# Optional: Slack webhook for review summaries
SLACK_WEBHOOK_URL=
`,
    readme: `# code-reviewer

OpenVesper configured for automated PR review on a GitHub repo.

## Run

\`\`\`bash
cp .env.example .env
$EDITOR .env  # add GITHUB_TOKEN and ANTHROPIC_API_KEY

# One-off PR review
vesper -a code-reviewer -q "Review PR #42 on openvesper/openvesper"

# Or run as a heartbeat (see cron.yaml)
vesper gateway start -d
\`\`\`

## What it does

- Reads the PR diff via the GitHub plugin
- Comments on:
  - Logic bugs
  - Test coverage gaps
  - Style inconsistencies vs the rest of the repo
  - Missing CHANGELOG/docs updates
- Does NOT post comments without approval (uses approval queue)
`,
    cronYaml: `# Cron jobs for code-reviewer
jobs:
  - name: review-new-prs
    schedule: "*/15 * * * *"
    agent: code-reviewer
    prompt: |
      Check for new PRs in YOUR_REPO opened in the last 15 minutes that don't
      already have a review. For each, generate a review summary and queue
      it for approval before posting.
`,
  },

  "blog-writer": {
    name: "blog-writer",
    description: "Agent drafting blog posts from prompts",
    defaultAgent: "content-writer",
    defaultProvider: "anthropic",
    envExample: `# LLM provider
ANTHROPIC_API_KEY=

# Optional: web search for research
TAVILY_API_KEY=
`,
    readme: `# blog-writer

A simple OpenVesper deployment for drafting blog posts. The content-writer
agent has web-search and research plugins for fact-checking.

## Run

\`\`\`bash
cp .env.example .env
$EDITOR .env

# Generate a draft
vesper -a content-writer -q "Draft a 600-word post about $TOPIC. Include 3 supporting links."
\`\`\`

## Workflow

1. You describe the topic and audience
2. The agent uses web_search to gather context
3. Drafts in your voice (configure in .agents/content-writer/USER.md if you fork)
4. Returns markdown — paste into your CMS
`,
  },
};

export function initTemplate(templateName: string, opts: { force?: boolean } = {}): void {
  const tpl = TEMPLATES[templateName];
  if (!tpl) {
    console.error(c.red(`\n✗ Unknown template: ${templateName}`));
    console.error(c.dim("\nAvailable templates:"));
    for (const t of Object.values(TEMPLATES)) {
      console.error(`  ${c.cyan(t.name.padEnd(20))} ${c.dim(t.description)}`);
    }
    console.error("");
    process.exit(1);
  }

  const dst = path.resolve(process.cwd(), tpl.name);
  if (fs.existsSync(dst) && !opts.force) {
    console.error(c.red(`\n✗ Directory '${tpl.name}' already exists`));
    console.error(c.dim("  Use --force to overwrite, or pick a different location."));
    process.exit(1);
  }

  console.log("");
  console.log(c.cyan(c.bold(`🌒 Scaffolding template: ${tpl.name}`)));
  console.log(c.dim(`   ${tpl.description}`));
  console.log("");

  fs.mkdirSync(dst, { recursive: true });
  fs.writeFileSync(path.join(dst, ".env.example"), tpl.envExample);
  fs.writeFileSync(
    path.join(dst, "openvesper.json"),
    JSON.stringify(
      {
        version: "1.13.0",
        defaultProvider: tpl.defaultProvider,
        defaultAgent: tpl.defaultAgent,
      },
      null,
      2
    ) + "\n"
  );
  fs.writeFileSync(path.join(dst, "README.md"), tpl.readme);
  if (tpl.cronYaml) {
    fs.writeFileSync(path.join(dst, "cron.yaml"), tpl.cronYaml);
  }
  fs.writeFileSync(path.join(dst, ".gitignore"), ".env\nnode_modules/\n*.log\n");

  console.log(c.green("  ✓") + c.dim(" Created .env.example"));
  console.log(c.green("  ✓") + c.dim(" Created openvesper.json"));
  console.log(c.green("  ✓") + c.dim(" Created README.md"));
  if (tpl.cronYaml) {
    console.log(c.green("  ✓") + c.dim(" Created cron.yaml"));
  }
  console.log(c.green("  ✓") + c.dim(" Created .gitignore"));
  console.log("");
  console.log(c.bold("Next steps:"));
  console.log(`  ${c.cyan("cd")} ${tpl.name}`);
  console.log(`  ${c.cyan("cp .env.example .env")}  ${c.dim("# add your API keys")}`);
  console.log(`  ${c.cyan("vesper gateway start")}`);
  console.log(`  ${c.cyan("vesper")} ${c.dim('-q "Hello"')}`);
  console.log("");
}

export function listTemplates(): void {
  console.log("");
  console.log(c.bold("🌒 Available templates:"));
  console.log("");
  for (const t of Object.values(TEMPLATES)) {
    console.log(`  ${c.cyan(t.name.padEnd(20))} ${c.dim(t.description)}`);
  }
  console.log("");
  console.log(c.dim("Use:  vesper init <template>"));
  console.log("");
}
