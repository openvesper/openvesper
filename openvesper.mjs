#!/usr/bin/env node
// ============================================================
// 🌒 OpenVesper — main entry shim
// Launches the CLI via tsx for dev or compiled dist for prod
// ============================================================

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Prefer compiled dist
const distEntry = join(__dirname, "apps/cli/dist/index.js");
const srcEntry = join(__dirname, "apps/cli/src/index.ts");

if (existsSync(distEntry)) {
  // Compiled mode
  await import(distEntry);
} else if (existsSync(srcEntry)) {
  // Dev mode via tsx
  const tsx = spawn("npx", ["tsx", srcEntry, ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  tsx.on("exit", (code) => process.exit(code || 0));
} else {
  console.error("❌ OpenVesper CLI not found. Run `pnpm install && pnpm build` first.");
  process.exit(1);
}
