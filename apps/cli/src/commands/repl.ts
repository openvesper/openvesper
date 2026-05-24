// ============================================================
// 🌒 vesper repl — interactive prompt
// ============================================================
//
// Reads lines from stdin, sends each to the agent, prints the reply.
// Maintains conversation history across turns within the session.
//
// Slash commands:
//   /agent <mode>    — switch agent
//   /clear           — clear conversation history
//   /status          — show current agent + history length
//   /help            — show commands
//   /exit, /quit, ^D — leave
// ============================================================

import * as readline from "node:readline";
import { createVesper } from "@openvesper/core";

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

export async function runRepl(opts: {
  agent?: string;
  provider?: string;
  model?: string;
} = {}): Promise<void> {
  let currentAgent = opts.agent || "auto";
  const provider = opts.provider || process.env.LLM_PROVIDER || "anthropic";

  console.log("");
  console.log(c.cyan(c.bold("  🌒 OpenVesper REPL")));
  console.log(c.dim(`     agent=${currentAgent}, provider=${provider}`));
  console.log(c.dim("     Type /help for commands, /exit or Ctrl-D to leave."));
  console.log("");

  // Load plugins (lazy — share with the main CLI's plugin list)
  const vesper = createVesper({
    llm: {
      provider: provider as any,
      ...(opts.model ? { model: opts.model } : {}),
    },
  });
  // The full plugin list is large; in REPL we keep it light to reduce
  // startup cost. Users who want a specific plugin can launch the gateway
  // and use a normal CLI session instead.
  try {
    const webSearch = (await import("@openvesper/plugin-web-search")).default;
    vesper.use(webSearch);
  } catch {
    // ignore — plugin not installed
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // History is local to this REPL session
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];

  const prompt = () => {
    rl.setPrompt(c.cyan(`${currentAgent} ${c.dim("›")} `));
    rl.prompt();
  };

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      prompt();
      return;
    }

    // Slash commands
    if (trimmed === "/exit" || trimmed === "/quit") {
      rl.close();
      return;
    }
    if (trimmed === "/help") {
      console.log(c.dim("\n  Commands:"));
      console.log(c.dim("    /agent <mode>    switch agent"));
      console.log(c.dim("    /clear           clear conversation history"));
      console.log(c.dim("    /status          show current agent + history"));
      console.log(c.dim("    /exit, /quit     leave REPL\n"));
      prompt();
      return;
    }
    if (trimmed.startsWith("/agent ")) {
      const mode = trimmed.split(" ")[1]?.trim();
      if (mode) {
        currentAgent = mode;
        history.length = 0;
        console.log(c.green(`  ✓ Switched to ${mode}, history cleared`));
      }
      prompt();
      return;
    }
    if (trimmed === "/clear") {
      history.length = 0;
      console.log(c.dim("  History cleared"));
      prompt();
      return;
    }
    if (trimmed === "/status") {
      console.log(c.dim(`  Agent: ${currentAgent}`));
      console.log(c.dim(`  Provider: ${provider}`));
      console.log(c.dim(`  History: ${history.length} message${history.length !== 1 ? "s" : ""}`));
      prompt();
      return;
    }
    if (trimmed.startsWith("/")) {
      console.log(c.amber(`  Unknown command: ${trimmed} (try /help)`));
      prompt();
      return;
    }

    // Normal message — send to agent
    history.push({ role: "user", content: trimmed });
    process.stdout.write(c.dim("  thinking...\r"));

    try {
      // Build conversational prompt from history. Vesper.run() accepts a
      // single string prompt; we fold history into a transcript.
      const transcript =
        history.length === 1
          ? trimmed
          : history
              .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
              .join("\n\n");

      const replyText = await vesper.run({
        agent: currentAgent,
        prompt: transcript,
      });

      // Clear "thinking..." line
      process.stdout.write("\r" + " ".repeat(20) + "\r");

      console.log(c.green("  ◆ ") + replyText);
      console.log("");
      history.push({ role: "assistant", content: replyText });
    } catch (err) {
      process.stdout.write("\r" + " ".repeat(20) + "\r");
      const msg = err instanceof Error ? err.message : String(err);
      console.log(c.red(`  ✗ Error: ${msg}`));
      console.log("");
    }

    prompt();
  });

  rl.on("close", () => {
    console.log(c.dim("\n  Bye 🌒"));
    process.exit(0);
  });

  prompt();
}
