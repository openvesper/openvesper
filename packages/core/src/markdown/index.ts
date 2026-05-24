// ============================================================
// 🌒 @openvesper/core — Markdown Agent Loader
//
// Loads agents + their skills from disk.
//
// Supports two conventions:
//   1. Flat:   .agents/my-agent.md
//   2. Folder: .agents/my-agent/manifest.md  (preferred)
//                                /skills/*.md  (auto-loaded as agent skills)
//                                /prompts/*.md (documentation)
// ============================================================

import * as fs from "fs";
import * as path from "path";
import { AgentDefinition, ProviderName, SkillDefinition } from "../types";

export interface AgentFrontmatter {
  name?: string;
  mode?: string;
  icon?: string;
  model?: string;
  provider?: ProviderName;
  temperature?: number;
  description?: string;
  /** Specific allowed tools (whitelist). Use `allow_all_tools: true` instead for full access. */
  tools?: string[];
  /** If true, agent can call ANY tool from ANY loaded plugin. Overrides `tools`. */
  allow_all_tools?: boolean;
  /** Skill IDs that the agent has access to (auto-loaded into prompt + tools). */
  skills?: string[];
  /** Recommended skills — same as `skills`, kinder name. */
  recommended_skills?: string[];
  permission?: "allow_always" | "ask" | "deny";
  parent?: string;
  version?: string;
  author?: string;
  tags?: string[];
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  trigger_keywords?: string[];
  tools?: string[];
  /** Top-level gating fields (alternative to nested metadata.openvesper). */
  homepage?: string;
  ["user-invocable"]?: boolean;
  ["disable-model-invocation"]?: boolean;
  /**
   * Single-line JSON object with gating + metadata. We accept both
   * `metadata.openvesper.*` (preferred) and legacy `metadata.openclaw.*`
   * for back-compat with skills written against the AgentSkills spec.
   */
  metadata?: string | Record<string, unknown>;
}

export interface LoadedAgent {
  agent: AgentDefinition;
  skills: SkillDefinition[];
  manifestPath: string;
  rootDir: string;
}

/** Parse simple YAML frontmatter (no external deps). */
function parseFrontmatter<T extends object = AgentFrontmatter>(text: string): { frontmatter: T; body: string } {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {} as T, body: text };

  const yaml = match[1];
  const body = match[2];
  const fm: Record<string, unknown> = {};

  const lines = yaml.split("\n");
  let currentArrayKey: string | null = null;
  let currentArray: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;

    if (line.match(/^\s+-\s+/) && currentArrayKey) {
      currentArray.push(line.replace(/^\s+-\s+/, "").trim());
      continue;
    }

    if (currentArrayKey) {
      fm[currentArrayKey] = currentArray;
      currentArrayKey = null;
      currentArray = [];
    }

    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();

    if (value === "") {
      currentArrayKey = key;
      continue;
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      fm[key] = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (value === "true") {
      fm[key] = true;
    } else if (value === "false") {
      fm[key] = false;
    } else if (!isNaN(Number(value))) {
      fm[key] = Number(value);
    } else {
      fm[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  if (currentArrayKey) fm[currentArrayKey] = currentArray;

  return { frontmatter: fm as T, body: body.trim() };
}

/**
 * Load a single skill — see definition below for the standard AgentSkills version.
 */

/**
 * Load a single skill from a markdown file or a folder containing SKILL.md.
 *
 * Supports three conventions (priority order):
 *   1. AgentSkills folder:  skills/my-skill/SKILL.md       (preferred — AgentSkills standard)
 *   2. Legacy folder:    skills/my-skill/manifest.md    (backward compat)
 *   3. Flat:             skills/my-skill.md             (backward compat)
 */
export function loadSkillFromMarkdown(filePathOrDir: string, idPrefix = ""): SkillDefinition {
  let filePath = filePathOrDir;
  let folderName: string | null = null;

  if (fs.existsSync(filePathOrDir) && fs.statSync(filePathOrDir).isDirectory()) {
    folderName = path.basename(filePathOrDir);
    // Prefer SKILL.md (AgentSkills format), fall back to manifest.md
    const skillMd = path.join(filePathOrDir, "SKILL.md");
    const manifestMd = path.join(filePathOrDir, "manifest.md");
    if (fs.existsSync(skillMd)) {
      filePath = skillMd;
    } else if (fs.existsSync(manifestMd)) {
      filePath = manifestMd;
    } else {
      throw new Error(`Skill directory missing SKILL.md or manifest.md: ${filePathOrDir}`);
    }
  } else if (!fs.existsSync(filePath)) {
    throw new Error(`Skill file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter<SkillFrontmatter>(content);

  // Default ID: folder name if loading from <dir>/SKILL.md, else file basename
  const baseId = frontmatter.name || folderName || path.basename(filePath, ".md");
  const id = idPrefix ? `${idPrefix}:${baseId}` : baseId;

  // Parse metadata block (accept both metadata.openvesper.* and legacy metadata.openclaw.*)
  let meta: Record<string, unknown> = {};
  if (typeof frontmatter.metadata === "string") {
    try {
      meta = JSON.parse(frontmatter.metadata);
    } catch {
      // ignore parse errors
    }
  } else if (frontmatter.metadata && typeof frontmatter.metadata === "object") {
    meta = frontmatter.metadata as Record<string, unknown>;
  }
  const ovMeta =
    (meta.openvesper as Record<string, unknown> | undefined) ??
    (meta.openclaw as Record<string, unknown> | undefined) ??
    {};
  const requires = (ovMeta.requires as Record<string, unknown> | undefined) ?? {};

  return {
    id,
    name: frontmatter.name || baseId,
    description: frontmatter.description || "",
    body,
    requiresTools: frontmatter.tools || [],
    keywords: frontmatter.trigger_keywords || [],
    always: ovMeta.always === true,
    os: Array.isArray(ovMeta.os) ? (ovMeta.os as Array<"darwin" | "linux" | "win32">) : undefined,
    requiresBins: Array.isArray(requires.bins) ? (requires.bins as string[]) : undefined,
    requiresAnyBins: Array.isArray(requires.anyBins) ? (requires.anyBins as string[]) : undefined,
    requiresEnv: Array.isArray(requires.env) ? (requires.env as string[]) : undefined,
    requiresConfig: Array.isArray(requires.config) ? (requires.config as string[]) : undefined,
    primaryEnv: typeof ovMeta.primaryEnv === "string" ? ovMeta.primaryEnv : undefined,
    emoji: typeof ovMeta.emoji === "string" ? ovMeta.emoji : undefined,
    homepage:
      typeof ovMeta.homepage === "string"
        ? ovMeta.homepage
        : typeof frontmatter.homepage === "string"
        ? frontmatter.homepage
        : undefined,
    userInvocable: frontmatter["user-invocable"] !== false,
    disableModelInvocation: frontmatter["disable-model-invocation"] === true,
  };
}

/**
 * Load all skills from a directory.
 *
 * Skips: README.md, files starting with _ or .
 * Supports both conventions:
 *   - AgentSkills folder: skills/my-skill/SKILL.md
 *   - Flat:            skills/my-skill.md
 */
export function loadSkillsFromDirectory(dir: string, idPrefix = ""): SkillDefinition[] {
  if (!fs.existsSync(dir)) return [];
  const skills: SkillDefinition[] = [];

  for (const entry of fs.readdirSync(dir)) {
    if (entry.toUpperCase() === "README.MD") continue;
    if (entry.startsWith("_") || entry.startsWith(".")) continue;

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    try {
      if (stat.isDirectory()) {
        // Folder convention: look for SKILL.md (or manifest.md fallback)
        const skillMd = path.join(fullPath, "SKILL.md");
        const manifestMd = path.join(fullPath, "manifest.md");
        if (fs.existsSync(skillMd) || fs.existsSync(manifestMd)) {
          skills.push(loadSkillFromMarkdown(fullPath, idPrefix));
        }
      } else if (entry.endsWith(".md")) {
        // Flat convention
        skills.push(loadSkillFromMarkdown(fullPath, idPrefix));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to load skill ${entry}:`, e);
    }
  }

  return skills;
}

/**
 * Load a single agent from a workspace directory or a flat markdown file.
 *
 * Supports two conventions (priority order):
 *
 *   1. Workspace format (preferred):
 *      .agents/my-agent/
 *      ├── SOUL.md         Persona, tone, boundaries (REQUIRED — becomes system prompt)
 *      ├── IDENTITY.md     Agent name, vibe, emoji (optional — adds to prompt)
 *      ├── USER.md         User context (optional — adds to prompt)
 *      ├── TOOLS.md        Tool conventions (optional — adds to prompt)
 *      ├── HEARTBEAT.md    Cron checklist (optional, not loaded into prompt by default)
 *      ├── MEMORY.md       Long-term memory (optional, only in main session)
 *      ├── memory/         Daily logs (optional)
 *      ├── skills/         Agent-specific skills (auto-loaded)
 *      └── references/     Bundled docs (not loaded into prompt)
 *
 *   2. Legacy manifest format (backward compat):
 *      .agents/my-agent/manifest.md   YAML frontmatter + body
 *      .agents/my-agent.md            (flat file)
 *
 * Returns the agent + any agent-specific skills.
 */
export function loadAgentFromMarkdown(filePathOrDir: string): LoadedAgent {
  let filePath: string;
  let agentDir: string;
  let isWorkspace = false;

  if (fs.existsSync(filePathOrDir) && fs.statSync(filePathOrDir).isDirectory()) {
    agentDir = filePathOrDir;
    const soulPath = path.join(filePathOrDir, "SOUL.md");
    const manifestPath = path.join(filePathOrDir, "manifest.md");

    if (fs.existsSync(soulPath)) {
      // workspace format
      filePath = soulPath;
      isWorkspace = true;
    } else if (fs.existsSync(manifestPath)) {
      // Legacy manifest format
      filePath = manifestPath;
    } else {
      throw new Error(`Agent directory missing SOUL.md or manifest.md: ${filePathOrDir}`);
    }
  } else if (fs.existsSync(filePathOrDir)) {
    // Flat file
    filePath = filePathOrDir;
    agentDir = path.dirname(filePathOrDir);
  } else {
    throw new Error(`Agent file not found: ${filePathOrDir}`);
  }

  // Default mode from folder name (for both workspace + manifest formats)
  const defaultMode =
    isWorkspace || path.basename(filePath) === "manifest.md"
      ? path.basename(path.dirname(filePath))
      : path.basename(filePath, ".md");

  let agent: AgentDefinition;

  if (isWorkspace) {
    // ── workspace format ──────────────────────────────
    agent = loadWorkspaceAgent(agentDir, defaultMode);
  } else {
    // ── Legacy manifest format ──────────────────────────────
    const content = fs.readFileSync(filePath, "utf8");
    const { frontmatter, body } = parseFrontmatter(content);
    const mode = frontmatter.mode || frontmatter.name || defaultMode;

    let allowedTools: string[] | "*";
    if (frontmatter.allow_all_tools === true) {
      allowedTools = "*";
    } else if (Array.isArray(frontmatter.tools) && frontmatter.tools.length > 0) {
      allowedTools = frontmatter.tools;
    } else {
      allowedTools = "*";
    }

    agent = {
      mode,
      icon: frontmatter.icon,
      name: frontmatter.name || mode,
      description: frontmatter.description,
      systemPrompt: body,
      allowedTools,
      skills: [
        ...(frontmatter.skills || []),
        ...(frontmatter.recommended_skills || []),
      ],
      defaultLLM:
        frontmatter.provider || frontmatter.model
          ? { provider: frontmatter.provider as ProviderName, model: frontmatter.model }
          : undefined,
    };
  }

  // Auto-load agent-specific skills from <agentDir>/skills/
  const agentSkills = loadSkillsFromDirectory(path.join(agentDir, "skills"), agent.mode);
  agent.skills = [
    ...(agent.skills || []),
    ...agentSkills.map((s) => s.id),
  ];

  return {
    agent,
    skills: agentSkills,
    manifestPath: filePath,
    rootDir: agentDir,
  };
}

/**
 * Load a workspace-format agent.
 *
 * Composes the system prompt from:
 *   SOUL.md (persona)
 *   + IDENTITY.md (name, vibe)
 *   + USER.md (user context)
 *   + TOOLS.md (tool conventions)
 *
 * Reads metadata from SOUL.md frontmatter if present, otherwise infers from IDENTITY.md.
 */
function loadWorkspaceAgent(agentDir: string, defaultMode: string): AgentDefinition {
  const readIfExists = (filename: string): string => {
    const p = path.join(agentDir, filename);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  };

  const soulRaw = readIfExists("SOUL.md");
  const identityRaw = readIfExists("IDENTITY.md");
  const userRaw = readIfExists("USER.md");
  const toolsRaw = readIfExists("TOOLS.md");

  // SOUL.md frontmatter is the primary metadata source
  const { frontmatter: soulFm, body: soulBody } = parseFrontmatter(soulRaw);

  // Compose system prompt from all four workspace files
  const promptParts: string[] = [];
  if (soulBody) promptParts.push(soulBody);
  if (identityRaw) promptParts.push("\n\n---\n\n" + stripFrontmatter(identityRaw));
  if (userRaw) promptParts.push("\n\n---\n\n" + stripFrontmatter(userRaw));
  if (toolsRaw) promptParts.push("\n\n---\n\n" + stripFrontmatter(toolsRaw));

  const systemPrompt = promptParts.join("").trim();

  // Parse metadata from IDENTITY.md body (look for known patterns)
  const identityFields = parseIdentityFile(identityRaw);

  const mode = soulFm.mode || identityFields.mode || defaultMode;
  const name = soulFm.name || identityFields.name || mode;
  const icon = soulFm.icon || identityFields.icon;

  // Tool access — from TOOLS.md text or SOUL.md frontmatter
  let allowedTools: string[] | "*";
  if (soulFm.allow_all_tools === true || /Full cross-plugin access/i.test(toolsRaw)) {
    allowedTools = "*";
  } else if (Array.isArray(soulFm.tools) && soulFm.tools.length > 0) {
    allowedTools = soulFm.tools;
  } else {
    allowedTools = "*";
  }

  return {
    mode,
    icon,
    name,
    description: soulFm.description || identityFields.description,
    systemPrompt,
    allowedTools,
    skills: [
      ...(soulFm.skills || []),
      ...(soulFm.recommended_skills || []),
    ],
    defaultLLM: soulFm.provider || soulFm.model
      ? { provider: soulFm.provider as ProviderName, model: soulFm.model }
      : undefined,
  };
}

/** Strip YAML frontmatter from a markdown file's content. */
function stripFrontmatter(text: string): string {
  const m = text.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  return m ? m[1].trim() : text.trim();
}

/** Parse known fields from IDENTITY.md body text. */
function parseIdentityFile(text: string): { mode?: string; name?: string; icon?: string; description?: string } {
  const result: { mode?: string; name?: string; icon?: string; description?: string } = {};

  // Match patterns like "- **Name**: Foo" or "- Name: Foo"
  const nameMatch = text.match(/[-*]\s*\*?\*?Name\*?\*?\s*:\s*(.+)/i);
  if (nameMatch) result.name = nameMatch[1].trim();

  const modeMatch = text.match(/[-*]\s*\*?\*?Mode\*?\*?\s*:\s*`?([\w-]+)`?/i);
  if (modeMatch) result.mode = modeMatch[1].trim();

  const iconMatch = text.match(/[-*]\s*\*?\*?Icon\*?\*?\s*:\s*(\S+)/);
  if (iconMatch) result.icon = iconMatch[1].trim();

  // Find first paragraph under "## What I am" or similar
  const whatMatch = text.match(/##\s*(?:What I am|Description)[^\n]*\n+([^\n]+)/i);
  if (whatMatch) result.description = whatMatch[1].trim();

  return result;
}

/**
 * Load all agents from a directory. Each agent's skills (if any) are loaded too.
 *
 * Supports both conventions:
 *   - Flat:   .agents/my-agent.md
 *   - Folder: .agents/my-agent/manifest.md
 */
export function loadAgentsFromDirectory(dir: string): LoadedAgent[] {
  if (!fs.existsSync(dir)) return [];

  const loaded: LoadedAgent[] = [];

  for (const entry of fs.readdirSync(dir)) {
    if (entry.toUpperCase() === "README.MD" || entry.toUpperCase() === "AGENTS.MD") continue;
    if (entry.startsWith("_") || entry.startsWith(".")) continue;

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    try {
      if (stat.isDirectory()) {
        // workspace format takes priority, fall back to manifest.md
        const soulPath = path.join(fullPath, "SOUL.md");
        const manifestPath = path.join(fullPath, "manifest.md");
        if (fs.existsSync(soulPath) || fs.existsSync(manifestPath)) {
          loaded.push(loadAgentFromMarkdown(fullPath));
        }
      } else if (entry.endsWith(".md")) {
        loaded.push(loadAgentFromMarkdown(fullPath));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to load agent ${entry}:`, e);
    }
  }

  return loaded;
}

/**
 * Find and load project's AGENTS.md (closest one walking up from projectDir).
 */
export function loadProjectContext(projectDir: string): string | null {
  let dir = path.resolve(projectDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, "AGENTS.md");
    if (fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate, "utf8");
      } catch {
        return null;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Convert an in-memory agent definition to markdown format. */
export function agentToMarkdown(agent: AgentDefinition): string {
  const fm: string[] = ["---"];
  if (agent.mode) fm.push(`mode: ${agent.mode}`);
  if (agent.name) fm.push(`name: ${agent.name}`);
  if (agent.icon) fm.push(`icon: ${agent.icon}`);
  if (agent.description) fm.push(`description: ${agent.description}`);
  if (agent.defaultLLM?.provider) fm.push(`provider: ${agent.defaultLLM.provider}`);
  if (agent.defaultLLM?.model) fm.push(`model: ${agent.defaultLLM.model}`);
  if (Array.isArray(agent.allowedTools) && agent.allowedTools.length > 0) {
    fm.push("tools:");
    agent.allowedTools.forEach((t) => fm.push(`  - ${t}`));
  }
  if (agent.skills && agent.skills.length > 0) {
    fm.push("skills:");
    agent.skills.forEach((s) => fm.push(`  - ${s}`));
  }
  fm.push("---");
  fm.push("");
  fm.push(agent.systemPrompt || "");
  return fm.join("\n");
}

// ════════════════════════════════════════════════════════════════════
// Skill precedence chain
// ════════════════════════════════════════════════════════════════════

/**
 * Resolve skills from multiple sources with standard precedence.
 *
 * Precedence (highest first):
 *   1. workspace skills    — ~/.openvesper/workspace/skills/  (per-workspace)
 *   2. project agent skills — .agents/<agent>/skills/         (per-agent project)
 *   3. personal agent skills — ~/.openvesper/agents/<agent>/skills/
 *   4. managed skills      — ~/.openvesper/skills/             (user-installed)
 *   5. bundled skills      — ./skills/                          (project-wide)
 *
 * On name conflict, the highest source wins.
 */
export interface SkillSource {
  level: "workspace" | "project-agent" | "personal-agent" | "managed" | "bundled";
  dir: string;
  idPrefix?: string;
}

export function resolveSkillsWithPrecedence(sources: SkillSource[]): SkillDefinition[] {
  const byName = new Map<string, { skill: SkillDefinition; level: SkillSource["level"] }>();

  // Process highest priority FIRST so they win
  const levelRank: Record<SkillSource["level"], number> = {
    "workspace": 1,
    "project-agent": 2,
    "personal-agent": 3,
    "managed": 4,
    "bundled": 5,
  };

  // Sort sources by priority (lower rank = higher priority)
  const sorted = [...sources].sort((a, b) => levelRank[a.level] - levelRank[b.level]);

  for (const source of sorted) {
    const skills = loadSkillsFromDirectory(source.dir, source.idPrefix);
    for (const skill of skills) {
      const existing = byName.get(skill.name);
      if (existing) {
        // Skip — already loaded from higher-priority source
        continue;
      }
      byName.set(skill.name, { skill, level: source.level });
    }
  }

  return Array.from(byName.values()).map((entry) => entry.skill);
}

// ════════════════════════════════════════════════════════════════════
// Workspace bootstrap files
// ════════════════════════════════════════════════════════════════════

/**
 * The standard set of bootstrap files to inject into every session.
 * Order matters: SOUL is the persona, IDENTITY is who I am, USER is who I'm talking to,
 * TOOLS is what I can do, then optional MEMORY, then daily memory log.
 */
export const BOOTSTRAP_FILES = [
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "MEMORY.md",
] as const;

/** Default truncation limits . */
export const BOOTSTRAP_MAX_CHARS = 12_000;
export const BOOTSTRAP_TOTAL_MAX_CHARS = 60_000;

export interface WorkspaceBootstrap {
  /** Combined system prompt content. */
  systemPrompt: string;
  /** Map of file name → was it loaded successfully? */
  loaded: Record<string, boolean>;
  /** Files that were referenced but missing. */
  missing: string[];
  /** Total char count of injected content. */
  totalChars: number;
}

/**
 * Load and concatenate workspace bootstrap files .
 *
 * If a file is missing, injects a "missing file" marker and continues.
 * Truncates files exceeding `BOOTSTRAP_MAX_CHARS` and stops adding once
 * total exceeds `BOOTSTRAP_TOTAL_MAX_CHARS`.
 */
export function loadWorkspaceBootstrap(
  agentDir: string,
  opts: {
    maxCharsPerFile?: number;
    totalMaxChars?: number;
    includeMemory?: boolean;
    includeTodayLog?: boolean;
  } = {}
): WorkspaceBootstrap {
  const maxPerFile = opts.maxCharsPerFile ?? BOOTSTRAP_MAX_CHARS;
  const totalMax = opts.totalMaxChars ?? BOOTSTRAP_TOTAL_MAX_CHARS;
  const includeMemory = opts.includeMemory !== false;

  const parts: string[] = [];
  const loaded: Record<string, boolean> = {};
  const missing: string[] = [];
  let totalChars = 0;

  for (const filename of BOOTSTRAP_FILES) {
    if (filename === "MEMORY.md" && !includeMemory) {
      continue;
    }

    const filePath = path.join(agentDir, filename);
    if (!fs.existsSync(filePath)) {
      missing.push(filename);
      loaded[filename] = false;
      // OpenClaw injects a marker for missing files
      parts.push(`\n\n<!-- ${filename}: not found -->\n`);
      continue;
    }

    if (totalChars >= totalMax) {
      loaded[filename] = false;
      missing.push(`${filename} (skipped: total budget exceeded)`);
      continue;
    }

    let content = fs.readFileSync(filePath, "utf8");
    content = stripFrontmatter(content);

    if (content.length > maxPerFile) {
      content = content.slice(0, maxPerFile) + `\n\n<!-- truncated at ${maxPerFile} chars -->`;
    }

    if (totalChars + content.length > totalMax) {
      const remaining = totalMax - totalChars;
      content = content.slice(0, remaining) + `\n\n<!-- truncated: total budget exceeded -->`;
    }

    parts.push(`\n\n# ${filename}\n\n${content}\n`);
    totalChars += content.length;
    loaded[filename] = true;
  }

  // Optionally include today's memory log
  if (opts.includeTodayLog) {
    const today = new Date().toISOString().split("T")[0];
    const todayLog = path.join(agentDir, "memory", `${today}.md`);
    if (fs.existsSync(todayLog) && totalChars < totalMax) {
      let content = fs.readFileSync(todayLog, "utf8");
      content = stripFrontmatter(content);
      if (content.length > maxPerFile) content = content.slice(0, maxPerFile);
      parts.push(`\n\n# memory/${today}.md\n\n${content}\n`);
      totalChars += content.length;
      loaded[`memory/${today}.md`] = true;
    }
  }

  return {
    systemPrompt: parts.join("").trim(),
    loaded,
    missing,
    totalChars,
  };
}

/**
 * Initialize a brand-new agent workspace with default OpenClaw bootstrap files.
 * Safe to re-run — won't overwrite existing files.
 */
export function setupAgentWorkspace(
  agentDir: string,
  opts: { name?: string; icon?: string; mode?: string } = {}
): { created: string[]; skipped: string[] } {
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const mode = opts.mode || path.basename(agentDir);
  const name = opts.name || mode;
  const icon = opts.icon || "🤖";

  const defaults: Record<string, string> = {
    "SOUL.md": `# ${icon} ${name}\n\n## Persona\n\nYou are ${name}. Describe your personality, tone, and boundaries here.\n\n## Tone\n\n(How you speak.)\n\n## Vibe\n\n(How you feel.)\n`,
    "IDENTITY.md": `# Identity\n\n- **Name**: ${name}\n- **Mode**: \`${mode}\`\n- **Icon**: ${icon}\n- **Version**: 1.0.0\n- **Author**: OpenVesper\n\n## What I am\n\n(Short description.)\n`,
    "USER.md": `# User\n\nThe user I am speaking to is **the project owner**.\n\nAddress them directly and respect their time.\n`,
    "TOOLS.md": `# Tools\n\n## Access policy\n\nFull cross-plugin access. I can call any tool from any loaded plugin.\n\n## Permission rules\n\n- \`read\` / \`external\` tools run automatically\n- \`write\` / \`execute\` / \`trade\` tools prompt before running\n`,
    "HEARTBEAT.md": `# Heartbeat\n\nA short checklist this agent reviews on scheduled heartbeats.\n\n## Daily check-ins\n\n- [ ] No pending issues\n`,
    "MEMORY.md": `# Long-term memory\n\nDurable facts, preferences, decisions.\n\n## Facts\n\n(Populated by the agent.)\n`,
  };

  for (const [filename, content] of Object.entries(defaults)) {
    const filePath = path.join(agentDir, filename);
    if (fs.existsSync(filePath)) {
      skipped.push(filename);
    } else {
      fs.writeFileSync(filePath, content);
      created.push(filename);
    }
  }

  // Create subdirectories
  for (const subdir of ["memory", "skills", "references"]) {
    const dirPath = path.join(agentDir, subdir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      created.push(`${subdir}/`);
    } else {
      skipped.push(`${subdir}/`);
    }
  }

  // Create today's memory log if missing
  const today = new Date().toISOString().split("T")[0];
  const todayLog = path.join(agentDir, "memory", `${today}.md`);
  if (!fs.existsSync(todayLog)) {
    fs.writeFileSync(
      todayLog,
      `# ${today}\n\nDaily memory log for ${name}.\n\n## Sessions\n\n## Notable events\n\n## Tomorrow\n`
    );
    created.push(`memory/${today}.md`);
  } else {
    skipped.push(`memory/${today}.md`);
  }

  return { created, skipped };
}
