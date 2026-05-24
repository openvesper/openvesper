#!/usr/bin/env node
// ============================================================
// 🌒 OpenVesper — Publish Helper
// Interactive npm publish with safety checks
// ============================================================

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function log(msg, color = "") {
  console.log(`${color}${msg}${COLOR.reset}`);
}

function header(msg) {
  log(`\n${"━".repeat(60)}`, COLOR.cyan);
  log(`🌒 ${msg}`, COLOR.bold + COLOR.cyan);
  log(`${"━".repeat(60)}\n`, COLOR.cyan);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function findPackages() {
  const packages = [];

  // packages/core, packages/plugin-sdk
  for (const dir of ["packages/core", "packages/plugin-sdk"]) {
    const pkgPath = join(ROOT, dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = readJson(pkgPath);
      if (!pkg.private) packages.push({ name: pkg.name, version: pkg.version, dir });
    }
  }

  // packages/plugins/*
  const pluginsDir = join(ROOT, "packages/plugins");
  if (existsSync(pluginsDir)) {
    for (const entry of readdirSync(pluginsDir)) {
      const pkgPath = join(pluginsDir, entry, "package.json");
      if (existsSync(pkgPath)) {
        const pkg = readJson(pkgPath);
        if (!pkg.private) packages.push({ name: pkg.name, version: pkg.version, dir: `packages/plugins/${entry}` });
      }
    }
  }

  // apps/cli
  const cliPath = join(ROOT, "apps/cli/package.json");
  if (existsSync(cliPath)) {
    const pkg = readJson(cliPath);
    if (!pkg.private) packages.push({ name: pkg.name, version: pkg.version, dir: "apps/cli" });
  }

  return packages;
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
  } catch (e) {
    return null;
  }
}

function runQuiet(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT, ...opts }).trim();
  } catch (e) {
    return null;
  }
}

async function main() {
  header("OpenVesper — NPM Publish Helper");

  // ── Pre-flight checks ──────────────────────────────────
  log("📋 Pre-flight checks...", COLOR.cyan);

  // Check npm login
  const whoami = runQuiet("npm whoami");
  if (!whoami) {
    log("❌ Not logged into npm. Run: npm login", COLOR.red);
    process.exit(1);
  }
  log(`✓ Logged in as: ${whoami}`, COLOR.green);

  // Check pnpm
  const pnpmVersion = runQuiet("pnpm --version");
  if (!pnpmVersion) {
    log("❌ pnpm not installed. Run: npm install -g pnpm", COLOR.red);
    process.exit(1);
  }
  log(`✓ pnpm ${pnpmVersion}`, COLOR.green);

  // ── Find publishable packages ──────────────────────────
  const packages = findPackages();
  log(`\n📦 Found ${packages.length} publishable packages\n`, COLOR.cyan);

  for (const pkg of packages.slice(0, 5)) {
    log(`  • ${pkg.name}@${pkg.version}`, COLOR.dim);
  }
  if (packages.length > 5) log(`  ... and ${packages.length - 5} more`, COLOR.dim);

  // ── Check version consistency ──────────────────────────
  const versions = new Set(packages.map((p) => p.version));
  if (versions.size > 1) {
    log(`\n⚠️  Mixed versions detected: ${[...versions].join(", ")}`, COLOR.yellow);
    log("   Consider syncing all packages to one version first.\n", COLOR.yellow);
  }

  // ── Menu ───────────────────────────────────────────────
  log("\nWhat do you want to do?", COLOR.bold);
  log("  1) 🧪 Dry run (preview, no actual publish)");
  log("  2) 🚀 Publish ALL packages");
  log("  3) 🎯 Publish ONE package (interactive)");
  log("  4) 🛠  Build all packages first (run pnpm build)");
  log("  5) ❌ Cancel\n");

  const choice = await ask("Your choice [1-5]: ");

  switch (choice) {
    case "1":
      header("DRY RUN");
      run("pnpm -r --filter=\"@openvesper/*\" publish --access public --dry-run");
      log("\n✓ Dry run complete. No packages were published.", COLOR.green);
      break;

    case "2":
      log("\n⚠️  This will publish ALL packages to npm.", COLOR.yellow);
      log("⚠️  Cannot be unpublished after 72 hours.", COLOR.yellow);
      const confirm = await ask("Type 'PUBLISH' to confirm: ");
      if (confirm !== "PUBLISH") {
        log("\n❌ Cancelled.", COLOR.red);
        process.exit(0);
      }
      header("PUBLISHING ALL PACKAGES");
      run("pnpm -r --filter=\"@openvesper/*\" publish --access public --no-git-checks");
      log("\n✅ Done. Verify with: npx @openvesper/cli --version", COLOR.green);
      break;

    case "3":
      log("\nWhich package?", COLOR.bold);
      packages.forEach((pkg, i) => {
        log(`  ${i + 1}) ${pkg.name}@${pkg.version}`);
      });
      const idx = await ask("\nPackage number: ");
      const n = parseInt(idx) - 1;
      if (isNaN(n) || n < 0 || n >= packages.length) {
        log("❌ Invalid choice.", COLOR.red);
        process.exit(1);
      }
      const pkg = packages[n];
      log(`\n📦 Publishing ${pkg.name}@${pkg.version}...`, COLOR.cyan);
      run(`cd ${pkg.dir} && npm publish --access public`);
      break;

    case "4":
      header("BUILDING ALL PACKAGES");
      run("pnpm install");
      run("pnpm build");
      log("\n✅ Build complete. Re-run this script to publish.", COLOR.green);
      break;

    case "5":
    default:
      log("\n❌ Cancelled.", COLOR.dim);
      process.exit(0);
  }
}

main().catch((err) => {
  log(`\n❌ Error: ${err.message}`, COLOR.red);
  process.exit(1);
});
