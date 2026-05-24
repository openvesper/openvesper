// ============================================================
// 🌒 @openvesper/core — Slash Command Registry
// ============================================================

import { SlashCommand, SlashCommandContext } from "../types";

export class CommandRegistry {
  private commands: Map<string, SlashCommand> = new Map();

  register(cmd: SlashCommand): void {
    this.commands.set(cmd.name, cmd);
  }

  get(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  list(): SlashCommand[] {
    return Array.from(this.commands.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Parse an input string and execute matching slash command.
   * Returns true if it matched a command (regardless of success).
   */
  async tryExecute(input: string, vesper: unknown, output: (msg: string) => void): Promise<boolean> {
    if (!input.startsWith("/")) return false;
    const parts = input.slice(1).split(/\s+/);
    const name = parts[0];
    const args = parts.slice(1);
    const cmd = this.commands.get(name);
    if (!cmd) return false;

    const ctx: SlashCommandContext = { args, raw: input, vesper, output };
    try {
      await cmd.handler(ctx);
    } catch (e: any) {
      output(`✗ /${name} failed: ${e.message}`);
    }
    return true;
  }
}
