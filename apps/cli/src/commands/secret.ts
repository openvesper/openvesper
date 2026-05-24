// ============================================================
// 🌒 vesper secret — manage API keys via OS keychain
// ============================================================
//
// Subcommands:
//   list                — list stored secret names (where supported)
//   get <name>          — print value (use with care)
//   set <name> [value]  — store; if no value given, read from stdin
//   rm <name>           — delete a stored secret
//   backend             — show which backend is detected
// ============================================================

import * as readline from "node:readline/promises";
import { secrets } from "@openvesper/core";

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

function checkBackend(): boolean {
  const b = secrets.detectBackend();
  if (b === "none") {
    console.error(c.red("\n  ✗ No secrets backend detected"));
    console.error(c.dim("    macOS: built-in (security)"));
    console.error(c.dim("    Linux: install secret-tool (libsecret-tools / libsecret-1-0)"));
    console.error(c.dim("    Any:   install 1Password CLI (op)"));
    console.error("");
    return false;
  }
  return true;
}

export async function secretBackend(): Promise<void> {
  const b = secrets.detectBackend();
  console.log("");
  console.log(`  Detected backend: ${c.cyan(b)}`);
  if (b === "none") {
    console.log(c.dim("  No supported tool found."));
    console.log("");
    console.log(c.dim("  To enable on Linux:"));
    console.log(c.dim("    sudo apt install libsecret-tools     # secret-tool (libsecret)"));
    console.log("");
  }
  console.log("");
}

export async function secretGet(name: string): Promise<void> {
  if (!checkBackend()) process.exit(1);
  const value = await secrets.getSecret(name);
  if (value === null) {
    console.error(c.dim(`  No secret stored for ${name}`));
    process.exit(1);
  }
  // Print raw value so it pipes cleanly
  process.stdout.write(value);
}

export async function secretSet(name: string, value?: string): Promise<void> {
  if (!checkBackend()) process.exit(1);

  let toStore = value;
  if (!toStore) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    toStore = (await rl.question(c.dim(`  Value for ${name} (input hidden by your shell): `))).trim();
    rl.close();
  }
  if (!toStore) {
    console.error(c.red("  ✗ Empty value, nothing stored"));
    process.exit(1);
  }
  try {
    const ok = await secrets.setSecret(name, toStore);
    if (ok) {
      console.log(c.green(`  ✓ Stored ${name} in ${secrets.detectBackend()}`));
    } else {
      console.error(c.red(`  ✗ Backend returned failure (key not stored)`));
      process.exit(1);
    }
  } catch (err) {
    console.error(c.red(`  ✗ ${err instanceof Error ? err.message : err}`));
    process.exit(1);
  }
}

export async function secretRm(name: string): Promise<void> {
  if (!checkBackend()) process.exit(1);
  const ok = await secrets.deleteSecret(name);
  if (ok) {
    console.log(c.green(`  ✓ Deleted ${name}`));
  } else {
    console.log(c.dim(`  (nothing to delete — or backend doesn't allow it)`));
  }
}

export async function secretList(): Promise<void> {
  if (!checkBackend()) process.exit(1);
  const list = await secrets.listSecrets();
  if (list === null) {
    console.log(c.dim(`  Backend (${secrets.detectBackend()}) doesn't support listing.`));
    console.log(c.dim(`  Try: vesper secret get <NAME> to check individual entries.`));
    return;
  }
  if (list.length === 0) {
    console.log(c.dim("  (no secrets stored)"));
    return;
  }
  console.log("");
  for (const k of list) console.log(`  ${c.cyan("●")} ${k}`);
  console.log("");
  console.log(c.dim(`  ${list.length} secret${list.length !== 1 ? "s" : ""} stored in ${secrets.detectBackend()}`));
  console.log("");
}
