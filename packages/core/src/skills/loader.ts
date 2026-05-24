// ============================================================
// 🌒 @openvesper/core — Skill Loader (multi-source + gating)
// ============================================================
//
// Loads skills from up to 6 sources with strict precedence, applies
// load-time gating (binaries / env / config / OS), and enforces per-agent
// allowlists.
//
// Precedence (highest first):
//   1. workspace        — <cwd>/skills/
//   2. project-agent    — <cwd>/.agents/skills/
//   3. personal-agent   — ~/.agents/skills/
//   4. managed          — ~/.openvesper/skills/
//   5. bundled          — shipped with the install
//   6. extra            — config: skills.load.extraDirs
//
// On name conflict, higher source wins. Same skill name appearing in
// `workspace` overrides the `managed` and `bundled` copies.
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { SkillDefinition } from "../types";
import { loadSkillFromMarkdown } from "../markdown";

// ── Source descriptors ─────────────────────────────────────────────

export type SkillSourceLevel =
  | "workspace"
  | "project-agent"
  | "personal-agent"
  | "managed"
  | "bundled"
  | "extra";

export interface SkillSource {
  level: SkillSourceLevel;
  /** Directory to scan. May not exist — silently skipped. */
  dir: string;
  /** Optional prefix added to skill IDs from this source. */
  idPrefix?: string;
}

export interface LoaderOptions {
  /** Working directory for resolving workspace/project-agent paths. Default: process.cwd(). */
  cwd?: string;
  /** OpenVesper workspace root. Default: ~/.openvesper */
  workspaceRoot?: string;
  /** Bundled skill directories to include at lowest precedence. */
  bundledDirs?: string[];
  /** Additional skill directories at lowest precedence (`skills.load.extraDirs`). */
  extraDirs?: string[];
  /** Config object used for `requires.config` gating. Pass the loaded openvesper.json. */
  config?: Record<string, unknown>;
  /** Skip OS / binary / env / config gating. Used for `vesper skills list --all`. */
  skipGating?: boolean;
}

// ── Build the source list ──────────────────────────────────────────

export function buildDefaultSources(opts: LoaderOptions = {}): SkillSource[] {
  const cwd = opts.cwd ?? process.cwd();
  const home = os.homedir();
  const workspace = opts.workspaceRoot ?? path.join(home, ".openvesper");

  const sources: SkillSource[] = [
    { level: "workspace",       dir: path.join(cwd, "skills") },
    { level: "project-agent",   dir: path.join(cwd, ".agents", "skills") },
    { level: "personal-agent",  dir: path.join(home, ".agents", "skills") },
    { level: "managed",         dir: path.join(workspace, "skills") },
  ];

  for (const b of opts.bundledDirs ?? []) {
    sources.push({ level: "bundled", dir: b });
  }
  for (const e of opts.extraDirs ?? []) {
    sources.push({ level: "extra", dir: e });
  }

  return sources;
}

// ── Gating ─────────────────────────────────────────────────────────

/** Lookup a binary on PATH. Memoised for the lifetime of this module. */
const binCache = new Map<string, boolean>();

function hasBin(name: string): boolean {
  if (binCache.has(name)) return binCache.get(name)!;

  // POSIX `which` / Windows `where`
  const cmd = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(cmd, [name], { stdio: "ignore" });
  const ok = r.status === 0;
  binCache.set(name, ok);
  return ok;
}

/** Resolve a dotted path like "channels.telegram.enabled" against a config object. */
function getConfigPath(cfg: Record<string, unknown> | undefined, dotted: string): unknown {
  if (!cfg) return undefined;
  const parts = dotted.split(".");
  let cur: unknown = cfg;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

export interface GatingResult {
  eligible: boolean;
  /** Reason it was filtered out, if not eligible. */
  reason?: string;
}

/** Check whether a skill is eligible given current OS / bins / env / config. */
export function checkGating(
  skill: SkillDefinition,
  config: Record<string, unknown> | undefined = {}
): GatingResult {
  // `always: true` short-circuits all other gates.
  if (skill.always) return { eligible: true };

  // OS filter
  if (skill.os && skill.os.length > 0) {
    const cur = process.platform as "darwin" | "linux" | "win32";
    if (!skill.os.includes(cur)) {
      return { eligible: false, reason: `os mismatch (need ${skill.os.join("|")}, have ${cur})` };
    }
  }

  // requires.bins — ALL must exist
  if (skill.requiresBins && skill.requiresBins.length > 0) {
    for (const b of skill.requiresBins) {
      if (!hasBin(b)) {
        return { eligible: false, reason: `missing binary: ${b}` };
      }
    }
  }

  // requires.anyBins — at least one must exist
  if (skill.requiresAnyBins && skill.requiresAnyBins.length > 0) {
    const anyOk = skill.requiresAnyBins.some((b) => hasBin(b));
    if (!anyOk) {
      return {
        eligible: false,
        reason: `none of these binaries available: ${skill.requiresAnyBins.join(", ")}`,
      };
    }
  }

  // requires.env — ALL must be set
  if (skill.requiresEnv && skill.requiresEnv.length > 0) {
    for (const e of skill.requiresEnv) {
      if (!process.env[e]) {
        return { eligible: false, reason: `missing env var: ${e}` };
      }
    }
  }

  // requires.config — ALL paths must be truthy
  if (skill.requiresConfig && skill.requiresConfig.length > 0) {
    for (const c of skill.requiresConfig) {
      const v = getConfigPath(config, c);
      if (!v) {
        return { eligible: false, reason: `config not truthy: ${c}` };
      }
    }
  }

  return { eligible: true };
}

// ── Main loader ────────────────────────────────────────────────────

export interface LoadResult {
  /** Eligible skills (passed gating + allowlist) with `source` and `dir` fields populated. */
  skills: SkillDefinition[];
  /** Skills that were filtered out, with reasons. Useful for diagnostics. */
  filtered: Array<{ skill: SkillDefinition; reason: string }>;
  /** Sources actually scanned. */
  scannedSources: SkillSource[];
}

const LEVEL_RANK: Record<SkillSourceLevel, number> = {
  "workspace":      1,
  "project-agent":  2,
  "personal-agent": 3,
  "managed":        4,
  "bundled":        5,
  "extra":          6,
};

function listSkillFolders(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  let stat: fs.Stats;
  try {
    stat = fs.statSync(dir);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) return [];

  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const skillMd = path.join(full, "SKILL.md");
      const manifestMd = path.join(full, "manifest.md");
      if (fs.existsSync(skillMd) || fs.existsSync(manifestMd)) {
        found.push(full);
        continue;
      }

      // One level of grouping: scan subdirectories one level deep
      try {
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue;
          if (sub.name.startsWith(".") || sub.name.startsWith("_")) continue;
          const subPath = path.join(full, sub.name);
          if (
            fs.existsSync(path.join(subPath, "SKILL.md")) ||
            fs.existsSync(path.join(subPath, "manifest.md"))
          ) {
            found.push(subPath);
          }
        }
      } catch {
        // ignore subscan errors
      }
    } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
      found.push(full);
    }
  }
  return found;
}

/** Load all skills from configured sources, apply gating, return result. */
export function loadAllSkills(opts: LoaderOptions = {}): LoadResult {
  const sources = buildDefaultSources(opts);
  const scannedSources: SkillSource[] = [];

  // Map keyed by skill name → highest-precedence definition + level
  const byName = new Map<string, { skill: SkillDefinition; level: SkillSourceLevel }>();

  // Sort sources by precedence (lower rank = higher priority — processed first → wins)
  const sorted = [...sources].sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);

  for (const source of sorted) {
    const folders = listSkillFolders(source.dir);
    if (folders.length > 0) scannedSources.push(source);

    for (const folder of folders) {
      let skill: SkillDefinition;
      try {
        skill = loadSkillFromMarkdown(folder, source.idPrefix);
      } catch {
        continue; // skip malformed skill
      }
      // Tag the skill with its source for diagnostics / UI
      skill.source = source.level;
      skill.dir = folder;

      const existing = byName.get(skill.name);
      if (existing) {
        // already loaded from higher-priority source — skip
        continue;
      }
      byName.set(skill.name, { skill, level: source.level });
    }
  }

  // Apply gating
  const result: LoadResult = { skills: [], filtered: [], scannedSources };
  for (const { skill } of byName.values()) {
    if (opts.skipGating) {
      result.skills.push(skill);
      continue;
    }
    const gate = checkGating(skill, opts.config);
    if (gate.eligible) {
      result.skills.push(skill);
    } else {
      result.filtered.push({ skill, reason: gate.reason ?? "filtered" });
    }
  }
  return result;
}

// ── Agent allowlist ────────────────────────────────────────────────

export interface AgentAllowlistConfig {
  defaults?: { skills?: string[] };
  list?: Array<{ id: string; skills?: string[] }>;
}

/**
 * Resolve the effective skill allowlist for a given agent id.
 *
 * Rules (matches OpenClaw):
 *   - `agents.defaults.skills` undefined → unrestricted.
 *   - `agents.list[id].skills` undefined → inherits defaults.
 *   - `agents.list[id].skills` is non-empty array → that's the FINAL set (no merge).
 *   - `agents.list[id].skills: []` → no skills.
 */
export function resolveAgentAllowlist(
  agentId: string,
  cfg: AgentAllowlistConfig | undefined
): string[] | "unrestricted" {
  if (!cfg) return "unrestricted";

  const entry = (cfg.list ?? []).find((a) => a.id === agentId);

  // Agent has explicit skills list
  if (entry && entry.skills !== undefined) {
    return entry.skills;
  }

  // Fall back to defaults
  if (cfg.defaults?.skills !== undefined) {
    return cfg.defaults.skills;
  }

  return "unrestricted";
}

/** Filter loaded skills against an agent allowlist. */
export function filterByAllowlist(
  skills: SkillDefinition[],
  allowlist: string[] | "unrestricted"
): SkillDefinition[] {
  if (allowlist === "unrestricted") return skills;
  const allow = new Set(allowlist);
  return skills.filter((s) => allow.has(s.name));
}

// ── Token cost estimation (deterministic) ──────────────────────────

/**
 * Rough estimate of system-prompt overhead for an eligible skill set.
 * Returns character count; divide by ~4 for OpenAI-tokenizer estimate.
 *
 * Mirrors OpenClaw's formula:
 *   total = 195 + Σ (97 + name + description + location)
 */
export function estimateSkillsPromptChars(skills: SkillDefinition[]): number {
  if (skills.length === 0) return 0;
  let total = 195;
  for (const s of skills) {
    const xmlEscape = (str: string): number =>
      str.replace(/[&<>"']/g, (c) => `&${c};`).length;
    total +=
      97 +
      xmlEscape(s.name ?? "") +
      xmlEscape(s.description ?? "") +
      xmlEscape(s.dir ?? "");
  }
  return total;
}
