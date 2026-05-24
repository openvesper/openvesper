// ============================================================
// 🌒 vesper skill <subcommand>
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function color(s: string, c: keyof typeof COLOR) {
  return `${COLOR[c]}${s}${COLOR.reset}`;
}

interface SkillInfo {
  name: string;
  description: string;
  source: "bundled" | "managed" | "personal-agent" | "project-agent" | "workspace";
  agent?: string;
  path: string;
}

function parseFrontmatter(content: string): { name?: string; description?: string } {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = m[1];
  const name = fm.match(/^name:\s*(.+)$/m)?.[1].trim();
  const description = fm.match(/^description:\s*(.+)$/m)?.[1].trim();
  return { name, description };
}

function loadSkill(skillDir: string, source: SkillInfo["source"], agent?: string): SkillInfo | null {
  const skillMd = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillMd)) return null;
  const content = fs.readFileSync(skillMd, "utf8");
  const fm = parseFrontmatter(content);
  return {
    name: fm.name || path.basename(skillDir),
    description: fm.description || "",
    source,
    agent,
    path: skillDir,
  };
}

function findAllSkills(): SkillInfo[] {
  const skills: SkillInfo[] = [];
  const seen = new Set<string>();

  // Skill precedence order (highest first wins)
  const sources: Array<{ dir: string; type: SkillInfo["source"]; agentScan?: boolean }> = [
    { dir: path.join(process.env.HOME || "", ".openvesper", "workspace", "skills"), type: "workspace" },
    { dir: path.join(process.cwd(), ".agents"), type: "project-agent", agentScan: true },
    { dir: path.join(process.env.HOME || "", ".openvesper", "agents"), type: "personal-agent", agentScan: true },
    { dir: path.join(process.env.HOME || "", ".openvesper", "skills"), type: "managed" },
    { dir: path.join(process.cwd(), "skills"), type: "bundled" },
  ];

  for (const source of sources) {
    if (!fs.existsSync(source.dir)) continue;

    if (source.agentScan) {
      // Look inside .agents/<agent>/skills/<name>/SKILL.md
      for (const agentName of fs.readdirSync(source.dir)) {
        const agentSkillsDir = path.join(source.dir, agentName, "skills");
        if (!fs.existsSync(agentSkillsDir)) continue;
        for (const skillName of fs.readdirSync(agentSkillsDir)) {
          const skillDir = path.join(agentSkillsDir, skillName);
          if (!fs.statSync(skillDir).isDirectory()) continue;
          const skill = loadSkill(skillDir, source.type, agentName);
          if (skill && !seen.has(skill.name)) {
            seen.add(skill.name);
            skills.push(skill);
          }
        }
      }
    } else {
      // Look inside skills/<name>/SKILL.md
      for (const skillName of fs.readdirSync(source.dir)) {
        const skillDir = path.join(source.dir, skillName);
        if (!fs.statSync(skillDir).isDirectory()) continue;
        const skill = loadSkill(skillDir, source.type);
        if (skill && !seen.has(skill.name)) {
          seen.add(skill.name);
          skills.push(skill);
        }
      }
    }
  }

  return skills;
}

// ── skill list ──────────────────────────────────────────────

export function listSkills(opts: { json?: boolean; source?: string }) {
  let skills = findAllSkills();
  if (opts.source) {
    skills = skills.filter((s) => s.source === opts.source);
  }

  if (opts.json) {
    console.log(JSON.stringify(skills, null, 2));
    return;
  }

  console.log(color(`\n🌒 Available skills (${skills.length})\n`, "cyan"));

  // Group by source
  const grouped = new Map<string, SkillInfo[]>();
  for (const s of skills) {
    if (!grouped.has(s.source)) grouped.set(s.source, []);
    grouped.get(s.source)!.push(s);
  }

  const sourceOrder: SkillInfo["source"][] = ["workspace", "project-agent", "personal-agent", "managed", "bundled"];
  for (const source of sourceOrder) {
    const group = grouped.get(source);
    if (!group || group.length === 0) continue;

    console.log(color(`── ${source.toUpperCase()} (${group.length})`, "bold"));
    for (const s of group) {
      const name = s.agent ? `${s.agent}:${s.name}` : s.name;
      const desc = s.description.length > 70 ? s.description.slice(0, 70) + "..." : s.description;
      console.log(`  ${color(name.padEnd(36), "cyan")} ${color(desc, "dim")}`);
    }
    console.log();
  }

  if (skills.length === 0) {
    console.log(color("No skills found.", "yellow"));
    console.log(color("Looked in:", "dim"));
    console.log(color("  ./skills/  ./.agents/*/skills/", "dim"));
    console.log(color("  ~/.openvesper/skills/  ~/.openvesper/workspace/skills/", "dim"));
  }
}

// ── skill info ──────────────────────────────────────────────

export function skillInfo(name: string) {
  const skills = findAllSkills();
  const skill = skills.find((s) => s.name === name || `${s.agent}:${s.name}` === name);

  if (!skill) {
    console.error(color(`Skill not found: ${name}`, "red"));
    console.error(color("Use 'vesper skill list' to see available skills.", "dim"));
    process.exit(1);
    return;
  }

  const content = fs.readFileSync(path.join(skill.path, "SKILL.md"), "utf8");
  const body = content.replace(/^---[\s\S]*?\n---\s*\n/, "").trim();

  console.log(color(`\n🌒 ${skill.name}`, "cyan"));
  console.log(color(skill.description, "dim"));
  console.log();
  console.log(color(`Source: ${skill.source}${skill.agent ? ` (agent: ${skill.agent})` : ""}`, "dim"));
  console.log(color(`Path: ${skill.path}`, "dim"));

  // Show subdirs if any
  const subdirs = ["scripts", "references", "assets"]
    .filter((d) => fs.existsSync(path.join(skill.path, d)) && fs.readdirSync(path.join(skill.path, d)).length > 0);
  if (subdirs.length > 0) {
    console.log(color(`Bundled: ${subdirs.join(", ")}/`, "dim"));
  }

  // Body preview
  console.log();
  console.log(color("─".repeat(60), "dim"));
  console.log();
  const previewLines = body.split("\n").slice(0, 30);
  for (const line of previewLines) {
    console.log(line);
  }
  if (body.split("\n").length > 30) {
    console.log(color("\n... (truncated, see SKILL.md for full content)", "dim"));
  }
  console.log();
}

// ── skill install ───────────────────────────────────────────

export async function installSkill(source: string, opts: { dest?: string }) {
  console.log(color(`\n🌒 Install skill from: ${source}\n`, "cyan"));

  // Support: GitHub URL, npm package, local path
  if (source.startsWith("github:") || source.startsWith("https://github.com/")) {
    console.log(color("GitHub installation: clone the skill folder into your skills/ dir.", "yellow"));
    console.log(color(`  git clone ${source} <local-path>`, "dim"));
    console.log(color(`  cp -r <local-path> ~/.openvesper/skills/`, "dim"));
    console.log();
    console.log(color("Full installer coming in v3.10.", "dim"));
    return;
  }

  if (source.startsWith("npm:") || source.startsWith("@openvesper/")) {
    console.log(color("npm installation will pull from registry once published.", "yellow"));
    console.log(color(`  npm install -g ${source.replace("npm:", "")}`, "dim"));
    console.log();
    console.log(color("Full installer coming in v3.10.", "dim"));
    return;
  }

  // Local path
  if (fs.existsSync(source)) {
    const skillName = path.basename(source);
    const destDir = opts.dest || path.join(process.env.HOME || "", ".openvesper", "skills");

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const targetDir = path.join(destDir, skillName);
    if (fs.existsSync(targetDir)) {
      console.error(color(`Skill ${skillName} already installed at ${targetDir}`, "red"));
      return;
    }

    fs.cpSync(source, targetDir, { recursive: true });
    console.log(color(`✓ Installed ${skillName} to ${targetDir}`, "green"));

    // Verify it has SKILL.md
    if (!fs.existsSync(path.join(targetDir, "SKILL.md"))) {
      console.warn(color("⚠ Warning: installed folder has no SKILL.md", "yellow"));
    }
    return;
  }

  console.error(color(`Unknown source: ${source}`, "red"));
  console.error(color("Use: github:user/repo  npm:package  or  /local/path", "dim"));
  process.exit(1);
}
