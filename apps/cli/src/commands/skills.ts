// ============================================================
// 🌒 vesper skills — list, install, update, info
// ============================================================
//
// Subcommands:
//   list [--all]              — show eligible skills (or all with --all)
//   info <name>               — show skill details (gating, source, etc.)
//   install <slug-or-path>    — install from git URL or local directory
//   update <name>             — re-fetch a previously git-installed skill
//   uninstall <name>          — remove a managed skill
//   sources                   — show all skill source dirs
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import {
  loadAllSkills,
  buildDefaultSources,
  estimateSkillsPromptChars,
  SkillSourceLevel,
} from "@openvesper/core";

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  amber: (s: string) => `\x1b[33m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

// ── Helpers ────────────────────────────────────────────────────────

const HOME = os.homedir();
const MANAGED_DIR = path.join(HOME, ".openvesper", "skills");
const REGISTRY_FILE = path.join(HOME, ".openvesper", "skills-registry.json");

interface SkillRegistryEntry {
  /** Installed name (also slug). */
  name: string;
  /** Where this skill came from: git URL or local path */
  source: string;
  /** Git ref (branch/tag) if from git. */
  ref?: string;
  /** When it was installed. */
  installedAt: number;
  /** Path on disk where it was placed. */
  dir: string;
}

interface SkillsRegistry {
  entries: SkillRegistryEntry[];
}

function readRegistry(): SkillsRegistry {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
  } catch {
    return { entries: [] };
  }
}

function writeRegistry(reg: SkillsRegistry): void {
  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2), { mode: 0o600 });
}

function ensureGit(): void {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", ["git"], {
    stdio: "ignore",
  });
  if (r.status !== 0) {
    console.error(c.red("\n  ✗ git is required to install skills from git sources"));
    console.error(c.dim("    Install git first: https://git-scm.com"));
    process.exit(1);
  }
}

// ── list ───────────────────────────────────────────────────────────

const SOURCE_LABEL: Record<SkillSourceLevel, string> = {
  workspace: "ws",
  "project-agent": "p-agt",
  "personal-agent": "u-agt",
  managed: "mgd",
  bundled: "bld",
  extra: "xtra",
};

const SOURCE_COLOR: Record<SkillSourceLevel, (s: string) => string> = {
  workspace: c.green,
  "project-agent": c.cyan,
  "personal-agent": c.cyan,
  managed: c.amber,
  bundled: c.dim,
  extra: c.dim,
};

export function skillsList(opts: { all?: boolean } = {}): void {
  const result = loadAllSkills({ skipGating: opts.all });

  console.log("");
  console.log(c.bold("🌒 Skills"));
  console.log("");

  if (result.skills.length === 0) {
    console.log(c.dim("  No eligible skills."));
    if (!opts.all && result.filtered.length > 0) {
      console.log(c.dim(`  (${result.filtered.length} filtered by gating — try --all to see them)`));
    }
    console.log("");
    return;
  }

  // Group by source
  const bySource = new Map<SkillSourceLevel, typeof result.skills>();
  for (const s of result.skills) {
    const src = s.source ?? ("bundled" as SkillSourceLevel);
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(s);
  }

  const ORDER: SkillSourceLevel[] = [
    "workspace",
    "project-agent",
    "personal-agent",
    "managed",
    "bundled",
    "extra",
  ];
  for (const src of ORDER) {
    const arr = bySource.get(src);
    if (!arr || arr.length === 0) continue;
    console.log(SOURCE_COLOR[src](`  [${SOURCE_LABEL[src]}] ${src}`));
    for (const s of arr) {
      const emoji = s.emoji ? s.emoji + " " : "  ";
      console.log(`    ${emoji}${c.bold(s.name.padEnd(28))} ${c.dim(s.description.slice(0, 60))}`);
    }
    console.log("");
  }

  if (!opts.all && result.filtered.length > 0) {
    console.log(c.dim(`  ${result.filtered.length} skill${result.filtered.length !== 1 ? "s" : ""} filtered (gating). vesper skills list --all to see them.`));
  }

  const overhead = estimateSkillsPromptChars(result.skills);
  console.log(
    c.dim(
      `  ${result.skills.length} eligible · ~${overhead} chars / ~${Math.round(overhead / 4)} tokens injected into system prompt`
    )
  );
  console.log("");
}

// ── info ───────────────────────────────────────────────────────────

export function skillsInfo(name: string): void {
  // Load all (skip gating) so we find gated skills too
  const allResult = loadAllSkills({ skipGating: true });
  const skill = allResult.skills.find((s) => s.name === name);
  if (!skill) {
    console.error(c.red(`\n  ✗ Skill not found: ${name}`));
    console.error(c.dim("    Use 'vesper skills list --all' to see installed skills.\n"));
    process.exit(1);
  }

  // Now re-check gating with the actual gating logic
  const gatedResult = loadAllSkills({ skipGating: false });
  const isEligible = gatedResult.skills.some((s) => s.name === name);
  const filterEntry = gatedResult.filtered.find((f) => f.skill.name === name);
  const status = isEligible
    ? c.green("eligible")
    : c.red(`gated: ${filterEntry?.reason ?? "unknown"}`);

  console.log("");
  console.log(`  ${skill.emoji || ""} ${c.bold(c.cyan(skill.name))}`);
  console.log(`  ${c.dim(skill.description)}`);
  console.log("");
  console.log(`  Source:       ${SOURCE_COLOR[skill.source ?? "bundled"](skill.source ?? "?")}`);
  console.log(`  Status:       ${status}`);
  console.log(`  Directory:    ${c.dim(skill.dir ?? "?")}`);
  if (skill.homepage) console.log(`  Homepage:     ${c.cyan(skill.homepage)}`);
  if (skill.os && skill.os.length > 0) console.log(`  OS:           ${skill.os.join(", ")}`);
  if (skill.requiresBins && skill.requiresBins.length > 0)
    console.log(`  Requires bin: ${skill.requiresBins.join(", ")}`);
  if (skill.requiresAnyBins && skill.requiresAnyBins.length > 0)
    console.log(`  Any bin:      ${skill.requiresAnyBins.join(", ")}`);
  if (skill.requiresEnv && skill.requiresEnv.length > 0)
    console.log(`  Requires env: ${skill.requiresEnv.join(", ")}`);
  if (skill.requiresConfig && skill.requiresConfig.length > 0)
    console.log(`  Requires cfg: ${skill.requiresConfig.join(", ")}`);
  if (skill.primaryEnv) console.log(`  Primary env:  ${skill.primaryEnv}`);
  if (skill.keywords && skill.keywords.length > 0)
    console.log(`  Keywords:     ${skill.keywords.join(", ")}`);
  if (skill.requiresTools && skill.requiresTools.length > 0)
    console.log(`  Tools:        ${skill.requiresTools.join(", ")}`);
  console.log("");

  // Body preview
  const lines = skill.body.split("\n").filter((l) => l.trim().length > 0).slice(0, 6);
  console.log(c.bold("  Body preview:"));
  for (const line of lines) console.log(`    ${c.dim(line.slice(0, 80))}`);
  if (skill.body.split("\n").length > 6) console.log(c.dim("    ..."));
  console.log("");
}

// ── sources ────────────────────────────────────────────────────────

export function skillsSources(): void {
  const sources = buildDefaultSources();
  console.log("");
  console.log(c.bold("🌒 Skill sources (highest precedence first)"));
  console.log("");
  for (const s of sources) {
    const exists = fs.existsSync(s.dir);
    const tag = exists ? c.green("●") : c.dim("○");
    const label = SOURCE_COLOR[s.level](s.level.padEnd(16));
    console.log(`  ${tag} ${label} ${s.dir}`);
  }
  console.log("");
  console.log(c.dim("  ● = exists  ○ = not yet created"));
  console.log(c.dim("  On name conflict, the highest-precedence source wins."));
  console.log("");
}

// ── install ────────────────────────────────────────────────────────

/**
 * Sources supported:
 *   - git URL:     git+https://github.com/owner/repo.git[#ref]
 *   - github slug: git:owner/repo[@ref]
 *   - local dir:   /absolute/path or ./relative/path (must contain SKILL.md)
 *
 * No remote registry (we deliberately don't ship a ClawHub equivalent).
 */
export async function skillsInstall(
  source: string,
  opts: { as?: string; global?: boolean } = {}
): Promise<void> {
  if (!source) {
    console.error("Usage: vesper skills install <git:owner/repo[@ref] | ./path | https://...>");
    process.exit(1);
  }

  const destRoot = opts.global
    ? MANAGED_DIR
    : path.join(process.cwd(), "skills");
  fs.mkdirSync(destRoot, { recursive: true });

  console.log("");

  // ── Local path install ────────────────────────────────────────
  // Detect local path: POSIX absolute (/), relative (./, ../), OR
  // Windows absolute (C:\, D:/...) and UNC paths (\\server\share).
  const looksLocal =
    source.startsWith("/") ||
    source.startsWith("./") ||
    source.startsWith("../") ||
    source.startsWith(".\\") ||
    source.startsWith("..\\") ||
    /^[A-Za-z]:[\\/]/.test(source) ||   // C:\ or C:/
    /^\\\\/.test(source);               // UNC \\server\share

  if (looksLocal) {
    const abs = path.resolve(source);
    if (!fs.existsSync(abs)) {
      console.error(c.red(`✗ Source path does not exist: ${abs}`));
      process.exit(1);
    }
    if (!fs.existsSync(path.join(abs, "SKILL.md"))) {
      console.error(c.red(`✗ ${abs} does not contain SKILL.md`));
      process.exit(1);
    }
    const name = opts.as || path.basename(abs);
    const dest = path.join(destRoot, name);
    if (fs.existsSync(dest)) {
      console.error(c.red(`✗ ${dest} already exists — uninstall first or use --as`));
      process.exit(1);
    }
    console.log(c.cyan(`▶ Copying ${abs} → ${dest}`));
    copyDir(abs, dest);
    const reg = readRegistry();
    reg.entries.push({
      name,
      source: abs,
      installedAt: Date.now(),
      dir: dest,
    });
    writeRegistry(reg);
    console.log(c.green(`  ✓ Installed ${name}`));
    console.log("");
    return;
  }

  // ── git: prefix or full git URL ───────────────────────────────
  ensureGit();
  let url: string;
  let ref: string | undefined;
  let inferredName: string;

  if (source.startsWith("git:")) {
    const stripped = source.slice(4);
    const atIdx = stripped.lastIndexOf("@");
    const repo = atIdx >= 0 ? stripped.slice(0, atIdx) : stripped;
    ref = atIdx >= 0 ? stripped.slice(atIdx + 1) : undefined;
    url = `https://github.com/${repo}.git`;
    inferredName = repo.split("/").pop() || "skill";
  } else if (source.startsWith("https://") || source.startsWith("git+")) {
    const cleaned = source.replace(/^git\+/, "");
    const hashIdx = cleaned.lastIndexOf("#");
    url = hashIdx >= 0 ? cleaned.slice(0, hashIdx) : cleaned;
    ref = hashIdx >= 0 ? cleaned.slice(hashIdx + 1) : undefined;
    inferredName = path.basename(url, ".git");
  } else {
    console.error(c.red("✗ Unrecognised source. Use:"));
    console.error(c.dim("  - git:owner/repo[@ref]"));
    console.error(c.dim("  - https://github.com/owner/repo.git[#ref]"));
    console.error(c.dim("  - ./local/path"));
    process.exit(1);
  }

  const name = opts.as || inferredName;
  const dest = path.join(destRoot, name);
  if (fs.existsSync(dest)) {
    console.error(c.red(`✗ ${dest} already exists — uninstall first or use --as`));
    process.exit(1);
  }

  // Clone shallow into temp, validate SKILL.md, move into place
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ov-skill-"));
  try {
    console.log(c.cyan(`▶ Cloning ${url}${ref ? `#${ref}` : ""} → ${name}`));
    const cloneArgs = ["clone", "--depth", "1"];
    if (ref) cloneArgs.push("--branch", ref);
    cloneArgs.push(url, tempDir);
    const r = spawnSync("git", cloneArgs, { stdio: "inherit" });
    if (r.status !== 0) {
      console.error(c.red(`✗ git clone failed (exit ${r.status})`));
      process.exit(1);
    }
    if (!fs.existsSync(path.join(tempDir, "SKILL.md"))) {
      console.error(c.red(`✗ Cloned repository does not contain SKILL.md at root`));
      process.exit(1);
    }

    // Remove .git dir before installing — we don't need history
    fs.rmSync(path.join(tempDir, ".git"), { recursive: true, force: true });

    // Move into place
    fs.renameSync(tempDir, dest);

    const reg = readRegistry();
    reg.entries.push({
      name,
      source: url,
      ref,
      installedAt: Date.now(),
      dir: dest,
    });
    writeRegistry(reg);
    console.log(c.green(`  ✓ Installed ${name} ${opts.global ? "(global)" : "(workspace)"}`));
    console.log(c.dim(`    Location: ${dest}`));
    console.log("");
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// ── update ────────────────────────────────────────────────────────

export async function skillsUpdate(name: string): Promise<void> {
  const reg = readRegistry();
  const entry = reg.entries.find((e) => e.name === name);
  if (!entry) {
    console.error(c.red(`\n  ✗ No installed skill named '${name}'`));
    console.error(c.dim("    Use 'vesper skills list' or check ~/.openvesper/skills-registry.json\n"));
    process.exit(1);
  }
  if (!entry.source.startsWith("http") && !entry.source.startsWith("git")) {
    console.error(c.red(`\n  ✗ '${name}' was installed from a local path — reinstall to refresh:\n`));
    console.error(c.dim(`      vesper skills uninstall ${name}`));
    console.error(c.dim(`      vesper skills install ${entry.source}\n`));
    process.exit(1);
  }

  console.log("");
  console.log(c.cyan(`▶ Re-fetching ${name} from ${entry.source}${entry.ref ? `#${entry.ref}` : ""}`));

  // Remove existing dir
  fs.rmSync(entry.dir, { recursive: true, force: true });

  // Re-clone
  const cloneArgs = ["clone", "--depth", "1"];
  if (entry.ref) cloneArgs.push("--branch", entry.ref);
  cloneArgs.push(entry.source, entry.dir);
  const r = spawnSync("git", cloneArgs, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(c.red(`✗ git clone failed (exit ${r.status})`));
    process.exit(1);
  }
  fs.rmSync(path.join(entry.dir, ".git"), { recursive: true, force: true });

  entry.installedAt = Date.now();
  writeRegistry(reg);
  console.log(c.green(`  ✓ Updated ${name}`));
  console.log("");
}

// ── uninstall ─────────────────────────────────────────────────────

export function skillsUninstall(name: string): void {
  const reg = readRegistry();
  const entry = reg.entries.find((e) => e.name === name);
  if (!entry) {
    console.error(c.red(`\n  ✗ Not in registry: ${name}\n`));
    process.exit(1);
  }
  if (fs.existsSync(entry.dir)) {
    fs.rmSync(entry.dir, { recursive: true, force: true });
  }
  reg.entries = reg.entries.filter((e) => e.name !== name);
  writeRegistry(reg);
  console.log(c.green(`\n  ✓ Uninstalled ${name}\n`));
}

// ── helpers ────────────────────────────────────────────────────────

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}
