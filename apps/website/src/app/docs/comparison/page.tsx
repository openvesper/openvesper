import Link from "next/link";

export const metadata = {
  title: "Comparison · OpenVesper",
  description: "Honest comparison of OpenVesper with related tools.",
};

interface Row {
  feature: string;
  openvesper: string;
  langchain: string;
  claudeCode: string;
  openai: string;
  note?: string;
}

const ROWS: Row[] = [
  {
    feature: "Where state lives",
    openvesper: "Your disk (~/.openvesper/)",
    langchain: "Your code",
    claudeCode: "Your disk (.claude/)",
    openai: "OpenAI servers",
  },
  {
    feature: "Persistent runtime",
    openvesper: "Yes — gateway daemon",
    langchain: "No — library",
    claudeCode: "Yes — terminal session",
    openai: "Yes — Assistants API",
  },
  {
    feature: "Multi-LLM provider",
    openvesper: "15 built-in",
    langchain: "30+ via integrations",
    claudeCode: "Anthropic only",
    openai: "OpenAI only",
  },
  {
    feature: "Agent definition",
    openvesper: "Markdown (.agents/)",
    langchain: "Python / TS code",
    claudeCode: "Markdown (CLAUDE.md, AGENTS.md)",
    openai: "JSON via dashboard",
  },
  {
    feature: "Plugin / tool ecosystem",
    openvesper: "51 bundled + your own",
    langchain: "Hundreds via community",
    claudeCode: "MCP servers",
    openai: "Function calling",
  },
  {
    feature: "Channel surface",
    openvesper: "CLI, Telegram, Slack, Discord, WS",
    langchain: "Bring your own",
    claudeCode: "Terminal only",
    openai: "API only",
  },
  {
    feature: "Cron / heartbeat",
    openvesper: "Built-in (cron.yaml)",
    langchain: "Bring your own",
    claudeCode: "Manual invocation",
    openai: "Bring your own",
  },
  {
    feature: "Self-hosted",
    openvesper: "Required",
    langchain: "Yes",
    claudeCode: "Yes",
    openai: "No",
  },
  {
    feature: "Pricing model",
    openvesper: "Free (LLM costs separate)",
    langchain: "Free OSS (LangSmith $)",
    claudeCode: "Per Claude usage",
    openai: "Per token",
  },
  {
    feature: "Telemetry",
    openvesper: "None",
    langchain: "Opt-in",
    claudeCode: "Opt-in",
    openai: "Always-on (their service)",
  },
];

interface UseCase {
  title: string;
  body: string;
  best: string;
}

const USE_CASES: UseCase[] = [
  {
    title: "I want to chat with Claude in my terminal while coding",
    body: "Claude Code is purpose-built for this. It integrates with your editor, your git history, your repo. OpenVesper can do it via REPL but it's not the focus.",
    best: "Claude Code",
  },
  {
    title: "I want to build a custom RAG app that ships in my product",
    body: "LangChain (or LlamaIndex) has the deepest library of retrievers, vector store adapters, and embedding utilities. OpenVesper has plugin tools but doesn't bundle RAG primitives.",
    best: "LangChain",
  },
  {
    title: "I want an agent that watches markets and pings me on Telegram",
    body: "OpenVesper. The gateway runs persistently, heartbeats run on a cron schedule, channels (Telegram/Discord/Slack) are first-class, and crypto plugins (bagsfm, pumpfun, defi, onchain) are bundled.",
    best: "OpenVesper",
  },
  {
    title: "I want to give my team a hosted assistant with managed memory",
    body: "OpenAI Assistants or ChatGPT Team. OpenVesper deliberately doesn't ship a hosted version — it's software you run.",
    best: "OpenAI / ChatGPT Team",
  },
  {
    title: "I want full data sovereignty (zero data leaves my hardware except the LLM call)",
    body: "OpenVesper. State, audit logs, OAuth tokens, memory all stay on your disk. No telemetry. The LLM call is the only network boundary.",
    best: "OpenVesper",
  },
  {
    title: "I want a Python notebook with 5 LLM calls and embeddings",
    body: "LangChain is overkill. Use the Anthropic / OpenAI SDK directly. OpenVesper is overkill too.",
    best: "Vendor SDK",
  },
];

const TH = "text-left text-sm font-medium text-zinc-300 py-3 px-4 border-b border-zinc-800";
const TD = "py-3 px-4 border-b border-zinc-900 text-sm text-zinc-300 align-top";
const HIGHLIGHT = "bg-cyan-950/30";

export default function ComparisonPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <nav className="text-sm text-zinc-400 mb-6">
        <Link href="/docs" className="hover:text-zinc-200">
          Docs
        </Link>{" "}
        / Comparison
      </nav>

      <h1 className="text-4xl font-bold mb-3">Comparison</h1>
      <p className="text-zinc-400 mb-2">
        Where OpenVesper fits relative to other tools you might be choosing between.
      </p>
      <p className="text-zinc-500 text-sm mb-12">
        Last updated 2026-05. We try to keep this fair — if you spot something
        outdated or inaccurate, please open an issue.
      </p>

      {/* Side-by-side table */}
      <h2 className="text-2xl font-semibold mb-4">Side-by-side</h2>
      <div className="overflow-x-auto mb-12">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Feature</th>
              <th className={`${TH} ${HIGHLIGHT}`}>OpenVesper</th>
              <th className={TH}>LangChain</th>
              <th className={TH}>Claude Code</th>
              <th className={TH}>OpenAI Assistants</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i}>
                <td className={`${TD} font-medium text-zinc-200`}>{r.feature}</td>
                <td className={`${TD} ${HIGHLIGHT}`}>{r.openvesper}</td>
                <td className={TD}>{r.langchain}</td>
                <td className={TD}>{r.claudeCode}</td>
                <td className={TD}>{r.openai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Use cases — when to pick what */}
      <h2 className="text-2xl font-semibold mb-4">When to pick what</h2>
      <p className="text-zinc-400 mb-6 text-sm">
        OpenVesper isn't the right answer for every problem. Some examples:
      </p>
      <div className="space-y-4 mb-12">
        {USE_CASES.map((u, i) => (
          <div key={i} className="border border-zinc-800 rounded-lg p-5 bg-zinc-950/50">
            <h3 className="font-semibold text-zinc-100 mb-2">{u.title}</h3>
            <p className="text-zinc-400 text-sm mb-3">{u.body}</p>
            <div className="text-sm">
              <span className="text-zinc-500">Best fit:</span>{" "}
              <span className="text-cyan-300 font-medium">{u.best}</span>
            </div>
          </div>
        ))}
      </div>

      {/* What OpenVesper is not */}
      <h2 className="text-2xl font-semibold mb-4">What OpenVesper is not</h2>
      <div className="text-zinc-300 space-y-3 mb-12 text-sm">
        <p>
          <strong>Not a hosted SaaS.</strong> There is no openvesper.com account.
          If you want someone else to run the gateway for you, that's a different
          product someone else could build.
        </p>
        <p>
          <strong>Not a replacement for Claude Code.</strong> If you're a developer
          spending most of your day in your editor and want pair-programming AI,
          Claude Code is built specifically for that workflow.
        </p>
        <p>
          <strong>Not a RAG framework.</strong> LangChain and LlamaIndex have
          deeper coverage of vector stores, embedding models, document loaders.
          OpenVesper plugins can read PDFs and search the web, but it's not a
          RAG pipeline builder.
        </p>
        <p>
          <strong>Not a multi-tenant product.</strong> The gateway is single-user
          by design. Bind it to loopback (default), keep your credentials local,
          your conversations local.
        </p>
        <p>
          <strong>Not a trading bot.</strong> Bundled crypto plugins are
          read-only — they query data, they don't sign transactions. If you
          want a bot that trades, write a plugin that signs (the framework runs
          whatever you write), but the safety scaffolding is on you.
        </p>
      </div>

      {/* What we lift from each */}
      <h2 className="text-2xl font-semibold mb-4">What we learned from each</h2>
      <div className="text-zinc-300 space-y-3 mb-12 text-sm">
        <p>
          <strong>From Claude Code:</strong> markdown is enough for agent
          persona. <code className="text-cyan-300">CLAUDE.md</code> and{" "}
          <code className="text-cyan-300">AGENTS.md</code> are convention; no
          DSL needed. We adopted the same shape for{" "}
          <code className="text-cyan-300">.agents/&lt;mode&gt;/</code>.
        </p>
        <p>
          <strong>From LangChain:</strong> a tool is just a function with a
          schema. We didn't reinvent that contract.
        </p>
        <p>
          <strong>From OpenClaw:</strong> a persistent gateway beats one-shot
          CLI invocations. State lives in one place; channels are routes into
          it. Approval queue + audit log are non-negotiable.
        </p>
        <p>
          <strong>From the JSON-schema / OpenAPI ecosystem:</strong> tool
          inputs are JSON Schema. No custom validators.
        </p>
      </div>

      <p className="text-zinc-500 text-sm">
        Got a tool you think should be on this page?{" "}
        <a
          href="https://github.com/openvesper/openvesper/issues/new"
          className="text-cyan-400 hover:underline"
        >
          Open an issue
        </a>{" "}
        — we'll consider adding it if it changes the "when to pick what"
        decision for users.
      </p>
    </main>
  );
}
