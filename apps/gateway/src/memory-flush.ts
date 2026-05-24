// ============================================================
// 🌒 Memory Flush — Persist durable notes before compaction
// ============================================================
//
// OpenClaw runs a silent LLM turn before compaction to ask the agent:
// "What from this conversation should be stored as a durable note in
// MEMORY.md before we summarize and forget the details?"
//
// PRIVACY: The MEMORY.md file lives in .agents/<mode>/MEMORY.md inside
// the user's repo. Not transmitted anywhere. The LLM call goes only to
// the user's configured provider.

import fs from "fs/promises";
import path from "path";
import os from "os";
import type { Session } from "./sessions.js";

const MEMORY_PROMPT_TEMPLATE = `You are about to compact a long conversation. Before we summarize the older messages and lose detail, identify durable facts worth remembering long-term.

Format each fact as a single line:
- Concrete things the user told you about themselves, their projects, or their preferences
- Decisions made
- Open commitments you took on

DO NOT include:
- Transient context (what time is it, what's the BTC price right now)
- Sensitive credentials, keys, secrets — never write these to disk
- Speculation or interpretation

Output format:
\`\`\`
- fact one
- fact two
- fact three
\`\`\`

If nothing is worth remembering, output exactly: NOTHING_TO_REMEMBER

Conversation:
{transcript}`;

export interface FlushResult {
  flushed: boolean;
  notesAdded: number;
  filePath: string;
}

/**
 * Run a memory flush turn for an agent. Reads conversation, asks LLM what
 * to remember, appends to the agent's MEMORY.md.
 */
export async function flushMemory(
  agentMode: string,
  session: Session,
  llmCall: (prompt: string) => Promise<string>,
  agentsDir?: string
): Promise<FlushResult> {
  // Locate agent's MEMORY.md
  const userAgents = path.join(os.homedir(), ".openvesper", "agents", agentMode);
  const bundledAgents = path.join(agentsDir || process.cwd() + "/.agents", agentMode);

  let memoryPath: string;
  try {
    await fs.access(path.join(userAgents, "SOUL.md"));
    memoryPath = path.join(userAgents, "MEMORY.md");
  } catch {
    memoryPath = path.join(bundledAgents, "MEMORY.md");
  }

  // Build transcript
  const transcript = session.messages
    .slice(-30)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const prompt = MEMORY_PROMPT_TEMPLATE.replace("{transcript}", transcript);

  // Call LLM
  let response: string;
  try {
    response = await llmCall(prompt);
  } catch (err) {
    console.error(`[memory] flush LLM call failed: ${err}`);
    return { flushed: false, notesAdded: 0, filePath: memoryPath };
  }

  // Parse: NOTHING_TO_REMEMBER or markdown bullets
  if (response.trim().includes("NOTHING_TO_REMEMBER")) {
    return { flushed: false, notesAdded: 0, filePath: memoryPath };
  }

  // Extract bullets
  const bullets = response
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.slice(1).trim())
    .filter(Boolean);

  if (bullets.length === 0) {
    return { flushed: false, notesAdded: 0, filePath: memoryPath };
  }

  // Append to MEMORY.md with timestamp
  const stamp = new Date().toISOString().slice(0, 10);
  const appended = `\n## ${stamp} (flushed before compaction)\n\n${bullets.map((b) => `- ${b}`).join("\n")}\n`;

  try {
    // Ensure file exists
    try {
      await fs.access(memoryPath);
    } catch {
      await fs.mkdir(path.dirname(memoryPath), { recursive: true, mode: 0o700 });
      await fs.writeFile(memoryPath, "# Memory\n", { mode: 0o600 });
    }

    await fs.appendFile(memoryPath, appended);
  } catch (err) {
    console.error(`[memory] failed to write ${memoryPath}: ${err}`);
    return { flushed: false, notesAdded: 0, filePath: memoryPath };
  }

  return { flushed: true, notesAdded: bullets.length, filePath: memoryPath };
}
