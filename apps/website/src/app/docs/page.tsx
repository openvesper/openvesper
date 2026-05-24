import Link from "next/link";

export default function DocsHome() {
  return (
    <div>
      <h1>OpenVesper Documentation</h1>
      <p>
        Welcome to the OpenVesper docs. This is everything you need to install, configure, extend,
        and master the crypto-native AI agent framework.
      </p>

      <h2>By goal</h2>

      <ul>
        <li>
          <strong>New here:</strong>{" "}
          <Link href="/docs/start/getting-started">Getting Started</Link> →{" "}
          <Link href="/docs/start/wizard">Onboarding Wizard</Link>
        </li>
        <li>
          <strong>Want to understand the architecture:</strong>{" "}
          <Link href="/docs/concepts/architecture">Architecture</Link>,{" "}
          <Link href="/docs/concepts/agent">Agents</Link>,{" "}
          <Link href="/docs/concepts/plugins">Plugins</Link>
        </li>
        <li>
          <strong>Building an agent or skill:</strong>{" "}
          <Link href="/docs/tools/skills">Skills</Link>,{" "}
          <Link href="/docs/concepts/agent">Agents</Link>
        </li>
        <li>
          <strong>Configuring channels:</strong>{" "}
          <Link href="/docs/channels/telegram">Telegram</Link>,{" "}
          <Link href="/docs/channels/slack">Slack</Link>,{" "}
          <Link href="/docs/channels/discord">Discord</Link>
        </li>
        <li>
          <strong>Stuck?:</strong>{" "}
          <Link href="/docs/help/faq">FAQ</Link> or{" "}
          <Link href="/docs/help/troubleshooting">Troubleshooting</Link>
        </li>
      </ul>

      <h2>Quick install</h2>

      <pre>
        <code>{`# One-liner
curl -fsSL https://openvesper.com/install.sh | bash

# Or via npm
npm i -g @openvesper/cli
vesper onboard`}</code>
      </pre>

      <p>
        See <Link href="/docs/start/getting-started">Getting Started</Link> for the full walkthrough.
      </p>

      <h2>What is OpenVesper?</h2>

      <p>
        OpenVesper is a crypto-native AI agent framework that runs on your machine. It pairs:
      </p>

      <ul>
        <li>
          <strong>47 plugins</strong> — Solana, Telegram, Notion, weather, fitness, on-chain analytics, and more.
        </li>
        <li>
          <strong>16 agents</strong> — security-reviewer, defi-strategist, travel-planner, productivity-coach...
        </li>
        <li>
          <strong>36 skills</strong> — agent-bound prompt templates that combine tools across plugins
        </li>
        <li>
          <strong>Standard AgentSkills format</strong> — SKILL.md and workspace conventions used widely in the agent ecosystem
        </li>
      </ul>

      <p>
        Your data stays on your machine. Use Anthropic, OpenAI, Groq, or run locally with Ollama or LM Studio.
      </p>
    </div>
  );
}
