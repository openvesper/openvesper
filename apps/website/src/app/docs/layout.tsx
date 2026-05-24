"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const DOCS_NAV = [
  {
    title: "Start",
    items: [
      { title: "Getting Started", href: "/docs/start/getting-started" },
      { title: "Docker", href: "/docs/install/docker" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "Architecture", href: "/docs/concepts/architecture" },
      { title: "Agent Loop", href: "/docs/concepts/agent-loop" },
      { title: "Agents", href: "/docs/concepts/agent" },
      { title: "Sessions", href: "/docs/concepts/session" },
      { title: "Channel Docking", href: "/docs/concepts/channel-docking" },
      { title: "Command Queue", href: "/docs/concepts/command-queue" },
      { title: "Compaction", href: "/docs/concepts/compaction" },
      { title: "Context Engine", href: "/docs/concepts/context-engine" },
      { title: "Delegate & Sub-agents", href: "/docs/concepts/delegate" },
      { title: "Memory Engine", href: "/docs/concepts/memory" },
      { title: "Multi-agent Routing", href: "/docs/concepts/multi-agent" },
      { title: "Streaming", href: "/docs/concepts/streaming" },
      { title: "Plugins", href: "/docs/concepts/plugins" },
      { title: "Crypto Plugins", href: "/docs/concepts/crypto" },
    ],
  },
  {
    title: "Agents",
    items: [
      { title: "Overview", href: "/docs/agents" },
      { title: "🤖 auto", href: "/docs/agents/auto" },
      { title: "🎒 bags-hunter", href: "/docs/agents/bags-hunter" },
      { title: "🏦 defi-strategist", href: "/docs/agents/defi-strategist" },
      { title: "🔬 investment-researcher", href: "/docs/agents/investment-researcher" },
      { title: "☀️ solana-dev-coach", href: "/docs/agents/solana-dev-coach" },
      { title: "👨‍💻 code-reviewer", href: "/docs/agents/code-reviewer" },
      { title: "🛡 security-reviewer", href: "/docs/agents/security-reviewer" },
      { title: "🧪 tdd-coach", href: "/docs/agents/tdd-coach" },
      { title: "🔨 skill-workshop", href: "/docs/agents/skill-workshop" },
      { title: "⚡ productivity-coach", href: "/docs/agents/productivity-coach" },
      { title: "📊 data-analyst", href: "/docs/agents/data-analyst" },
      { title: "✍️ content-writer", href: "/docs/agents/content-writer" },
      { title: "💼 sales-coach", href: "/docs/agents/sales-coach" },
      { title: "⚖️ legal-assistant", href: "/docs/agents/legal-assistant" },
      { title: "🏛 stoic-mentor", href: "/docs/agents/stoic-mentor" },
      { title: "💪 fitness-trainer", href: "/docs/agents/fitness-trainer" },
      { title: "👨‍🍳 cooking-coach", href: "/docs/agents/cooking-coach" },
      { title: "🗣 language-tutor", href: "/docs/agents/language-tutor" },
      { title: "✈️ travel-planner", href: "/docs/agents/travel-planner" },
    ],
  },
  {
    title: "Templates",
    items: [
      { title: "Overview", href: "/docs/templates" },
      { title: "SOUL.md", href: "/docs/templates/soul" },
      { title: "IDENTITY.md", href: "/docs/templates/identity" },
      { title: "USER.md", href: "/docs/templates/user" },
      { title: "TOOLS.md", href: "/docs/templates/tools" },
      { title: "HEARTBEAT.md", href: "/docs/templates/heartbeat" },
      { title: "MEMORY.md", href: "/docs/templates/memory" },
      { title: "SKILL.md", href: "/docs/templates/skill" },
    ],
  },
  {
    title: "Tools",
    items: [
      { title: "Overview", href: "/docs/tools" },
      { title: "Skills", href: "/docs/tools/skills" },
      { title: "Plugin SDK", href: "/docs/tools/plugin-sdk" },
      { title: "Plugin Manifest", href: "/docs/tools/manifest" },
      { title: "Testing Helpers", href: "/docs/tools/testing" },
      { title: "Apply Patch", href: "/docs/tools/apply-patch" },
      { title: "Web Search", href: "/docs/tools/web-search" },
      { title: "PDF", href: "/docs/tools/pdf" },
    ],
  },
  {
    title: "Channels",
    items: [
      { title: "Overview", href: "/docs/channels" },
      { title: "Telegram", href: "/docs/channels/telegram" },
      { title: "Slack", href: "/docs/channels/slack" },
      { title: "Discord", href: "/docs/channels/discord" },
      { title: "Routing Rules", href: "/docs/channels/routing" },
      { title: "Access Groups", href: "/docs/channels/access-groups" },
    ],
  },
  {
    title: "Automation",
    items: [
      { title: "Cron Jobs", href: "/docs/automation/cron-jobs" },
      { title: "Webhooks", href: "/docs/automation/webhook" },
      { title: "Background Tasks", href: "/docs/automation/tasks" },
      { title: "Standing Orders", href: "/docs/automation/standing-orders" },
      { title: "Commitments", href: "/docs/automation/commitments" },
    ],
  },
  {
    title: "Gateway",
    items: [
      { title: "Overview", href: "/docs/gateway" },
      { title: "Configuration", href: "/docs/gateway/configuration" },
      { title: "Slash Commands", href: "/docs/gateway/slash-commands" },
      { title: "Approvals", href: "/docs/gateway/approvals" },
      { title: "OAuth", href: "/docs/gateway/oauth" },
      { title: "Audit Logs", href: "/docs/gateway/audit" },
      { title: "Diagnostics", href: "/docs/gateway/diagnostics" },
      { title: "Remote Access", href: "/docs/gateway/remote" },
      { title: "Workspaces", href: "/docs/gateway/workspaces" },
      { title: "Security", href: "/docs/gateway/security" },
      { title: "Sandboxing", href: "/docs/gateway/sandboxing" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "CLI Commands", href: "/docs/reference/cli" },
      { title: "Gateway API", href: "/docs/reference/api" },
      { title: "Environment Variables", href: "/docs/reference/env-vars" },
      { title: "File Layout", href: "/docs/reference/file-layout" },
    ],
  },
  {
    title: "Help",
    items: [
      { title: "FAQ", href: "/docs/help/faq" },
      { title: "Troubleshooting", href: "/docs/help/troubleshooting" },
      { title: "Comparison", href: "/docs/comparison" },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-fg font-mono">
      {/* Top nav */}
      <nav className="border-b border-border sticky top-0 bg-bg z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            🌒 OpenVesper
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/integrations" className="hover:text-accent transition">Integrations</Link>
            <Link href="/docs/start/getting-started" className="text-accent">Docs</Link>
            <a
              href="https://github.com/openvesper/openvesper"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition"
            >
              GitHub
            </a>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1 border border-border rounded"
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden md:block"
          } w-64 shrink-0 border-r border-border h-[calc(100vh-65px)] sticky top-[65px] overflow-y-auto py-6 px-4`}
        >
          {DOCS_NAV.map((section) => (
            <div key={section.title} className="mb-6">
              <div className="text-[10px] text-fg/40 uppercase tracking-wider mb-2 px-2">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block text-sm px-2 py-1 rounded transition ${
                          isActive
                            ? "bg-accent/10 text-accent"
                            : "text-fg/70 hover:bg-bg-elevated hover:text-fg"
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 px-6 md:px-12 py-12 max-w-3xl">
          <article className="prose">{children}</article>
        </main>
      </div>
    </div>
  );
}
