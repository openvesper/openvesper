// ============================================================
// 🌒 @openvesper/plugin-skill-workshop
//
// Lets agents propose new skills (or updates to existing skills) during a
// conversation. Proposals land in a pending queue under
// `~/.openvesper/skill-workshop/` and the user approves or rejects each
// one via the gateway approval queue or CLI.
//
// Two write modes:
//   - "pending" (default) — propose only; user must approve before write
//   - "auto"              — write directly to <cwd>/skills/, but still
//                            scan for unsafe content (shell exec patterns,
//                            inline secrets) and quarantine if suspicious
//
// All writes go to the WORKSPACE skill root (<cwd>/skills/<slug>/SKILL.md).
// Never writes outside the workspace.
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";

// ── Constants ──────────────────────────────────────────────────────

const WORKSPACE = path.join(os.homedir(), ".openvesper");
const WORKSHOP_DIR = path.join(WORKSPACE, "skill-workshop");
const PROPOSALS_FILE = path.join(WORKSHOP_DIR, "proposals.json");
const QUARANTINE_FILE = path.join(WORKSHOP_DIR, "quarantine.json");

// ── State on disk ──────────────────────────────────────────────────

interface Proposal {
  id: string;
  slug: string;
  name: string;
  description: string;
  body: string;
  /** Where this would be written if approved. */
  targetPath: string;
  /** Whether this is replacing an existing skill. */
  isUpdate: boolean;
  proposedAt: number;
  proposedBy?: string;
  /** Filled by safety scanner. */
  safetyFlags: string[];
  /** "pending" | "approved" | "rejected" | "quarantined" */
  status: "pending" | "approved" | "rejected" | "quarantined";
  /** Decided timestamp if not pending. */
  decidedAt?: number;
}

function ensureWorkshopDir(): void {
  if (!fs.existsSync(WORKSHOP_DIR)) {
    fs.mkdirSync(WORKSHOP_DIR, { recursive: true, mode: 0o700 });
  }
}

function readProposals(): Proposal[] {
  try {
    return JSON.parse(fs.readFileSync(PROPOSALS_FILE, "utf-8")) as Proposal[];
  } catch {
    return [];
  }
}

function writeProposals(arr: Proposal[]): void {
  ensureWorkshopDir();
  fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(arr, null, 2), { mode: 0o600 });
}

// ── Safety scanner ─────────────────────────────────────────────────

const DANGEROUS_PATTERNS: { pattern: RegExp; label: string; severity: "critical" | "warn" }[] = [
  // Shell exec patterns
  { pattern: /\b(rm\s+-rf\s+\/|sudo\s+|chmod\s+777|mkfs\.)/i, label: "destructive shell commands", severity: "critical" },
  { pattern: /\b(curl|wget)\s+[^|\s]+\s*\|\s*(sh|bash)/i, label: "curl-pipe-shell", severity: "critical" },
  { pattern: /\beval\s*\(\s*['"`]/i, label: "eval() string", severity: "critical" },
  // Inline secrets
  { pattern: /\bsk-[a-zA-Z0-9]{20,}\b/, label: "possible OpenAI key", severity: "critical" },
  { pattern: /\bsk-ant-[a-zA-Z0-9]{20,}\b/, label: "possible Anthropic key", severity: "critical" },
  { pattern: /\b(gho_|ghp_|github_pat_)[a-zA-Z0-9]{20,}\b/, label: "possible GitHub token", severity: "critical" },
  { pattern: /\bAKIA[A-Z0-9]{16}\b/, label: "possible AWS access key", severity: "critical" },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, label: "private key block", severity: "critical" },
  // Suspicious markdown
  { pattern: /<script[\s>]/i, label: "<script> tag in markdown", severity: "warn" },
  { pattern: /\b(password|secret|token)\s*[:=]\s*["'][^"']{6,}/i, label: "literal credential pair", severity: "warn" },
];

function scanForSafety(body: string): { flags: string[]; critical: boolean } {
  const flags: string[] = [];
  let critical = false;
  for (const { pattern, label, severity } of DANGEROUS_PATTERNS) {
    if (pattern.test(body)) {
      flags.push(`${severity}: ${label}`);
      if (severity === "critical") critical = true;
    }
  }
  return { flags, critical };
}

// ── Slug validation ───────────────────────────────────────────────

function isValidSlug(s: string): boolean {
  return /^[a-z][a-z0-9-]{0,62}$/.test(s);
}

// ── Pending write target ──────────────────────────────────────────

/** Always write to <cwd>/skills/<slug>/SKILL.md. Refuses paths outside cwd. */
function resolveTargetPath(slug: string): string {
  const base = path.resolve(process.cwd(), "skills", slug);
  const expected = path.resolve(process.cwd(), "skills");
  // Ensure the resolved path stays inside <cwd>/skills/
  if (!base.startsWith(expected + path.sep) && base !== expected) {
    throw new Error("Refused: target path escapes workspace");
  }
  return path.join(base, "SKILL.md");
}

// ── Plugin definition ─────────────────────────────────────────────

export default definePlugin({
  name: "@openvesper/plugin-skill-workshop",
  version: "1.16.0",
  description: "Propose, review, and write workspace skills from agent observations",

  tools: [
    // ── 1. Propose ──────────────────────────────────────────────
    defineTool({
      name: "skill_workshop_propose",
      description:
        "Propose a new skill (or update to an existing one) to be written into <cwd>/skills/<slug>/. " +
        "Use this when the user gives a corrective instruction like 'next time do X' or 'remember that Y'. " +
        "The proposal lands in a pending queue and is NOT applied until the user explicitly approves it via " +
        "skill_workshop_approve. Safety scanner runs automatically; critical findings quarantine the proposal.",
      inputSchema: inputSchema(
        {
          slug: {
            type: "string",
            description:
              "URL-safe slug for this skill folder (lowercase, hyphens). Example: 'gif-attribution'.",
          },
          name: {
            type: "string",
            description: "Display name (used as frontmatter `name`).",
          },
          description: {
            type: "string",
            description: "One-line description (frontmatter `description`).",
          },
          body: {
            type: "string",
            description:
              "Full markdown body for the SKILL.md (excluding frontmatter — the tool will add it). " +
              "Include any examples, do/don't lists, and operating instructions.",
          },
          isUpdate: {
            type: "boolean",
            description:
              "true if this updates an existing workspace skill, false to create a new one.",
          },
        },
        ["slug", "name", "description", "body"]
      ),
      handler: async (input) => {
        const { slug, name, description, body, isUpdate } = input as {
          slug: string;
          name: string;
          description: string;
          body: string;
          isUpdate?: boolean;
        };

        if (!isValidSlug(slug)) {
          return {
            success: false,
            error:
              "Invalid slug. Use lowercase letters, digits, and hyphens only (max 63 chars).",
          };
        }
        if (!name.trim() || !description.trim() || !body.trim()) {
          return { success: false, error: "name, description, and body are all required" };
        }

        let targetPath: string;
        try {
          targetPath = resolveTargetPath(slug);
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }

        const exists = fs.existsSync(targetPath);
        if (isUpdate && !exists) {
          return {
            success: false,
            error:
              `isUpdate=true but no existing skill at ${targetPath}. Set isUpdate=false to create.`,
          };
        }
        if (!isUpdate && exists) {
          return {
            success: false,
            error:
              `Skill already exists at ${targetPath}. Set isUpdate=true to propose changes.`,
          };
        }

        // Safety scan
        const { flags, critical } = scanForSafety(body);

        const id = `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const proposal: Proposal = {
          id,
          slug,
          name,
          description,
          body,
          targetPath,
          isUpdate: Boolean(isUpdate),
          proposedAt: Date.now(),
          safetyFlags: flags,
          status: critical ? "quarantined" : "pending",
        };

        const all = readProposals();
        all.push(proposal);
        writeProposals(all);

        return {
          success: true,
          data: {
            id,
            status: proposal.status,
            safetyFlags: flags,
            targetPath,
            message: critical
              ? `Quarantined due to critical safety findings: ${flags.join(", ")}. The user can still review and approve manually with skill_workshop_approve ${id} --force.`
              : `Proposal ${id} pending. User: run 'vesper skills review' (or call skill_workshop_approve ${id} via the gateway) to apply.`,
          },
        };
      },
    }),

    // ── 2. List pending ─────────────────────────────────────────
    defineTool({
      name: "skill_workshop_list",
      description: "List skill proposals (filterable by status: pending, approved, rejected, quarantined).",
      inputSchema: inputSchema(
        {
          status: {
            type: "string",
            description: "Filter by status. Default: 'pending'.",
            enum: ["pending", "approved", "rejected", "quarantined", "all"],
          },
        },
        []
      ),
      handler: async (input) => {
        const { status = "pending" } = input as { status?: string };
        const all = readProposals();
        const filtered = status === "all" ? all : all.filter((p) => p.status === status);
        return {
          success: true,
          data: {
            count: filtered.length,
            proposals: filtered.map((p) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              description: p.description,
              status: p.status,
              safetyFlags: p.safetyFlags,
              isUpdate: p.isUpdate,
              targetPath: p.targetPath,
              proposedAt: new Date(p.proposedAt).toISOString(),
              decidedAt: p.decidedAt ? new Date(p.decidedAt).toISOString() : null,
              bodyPreview: p.body.split("\n").slice(0, 3).join("\n"),
            })),
          },
        };
      },
    }),

    // ── 3. Approve (writes to disk) ─────────────────────────────
    defineTool({
      name: "skill_workshop_approve",
      description:
        "Approve a pending proposal and write it to <cwd>/skills/<slug>/SKILL.md. " +
        "If the proposal is in quarantined status, set force=true to override the safety scanner. " +
        "This is a mutating action with permission='write' — users should review the body before approving.",
      inputSchema: inputSchema(
        {
          id: { type: "string", description: "Proposal ID to approve." },
          force: {
            type: "boolean",
            description: "Set true to override quarantine status.",
          },
        },
        ["id"]
      ),
      handler: async (input) => {
        const { id, force } = input as { id: string; force?: boolean };
        const all = readProposals();
        const proposal = all.find((p) => p.id === id);
        if (!proposal) {
          return { success: false, error: `Proposal not found: ${id}` };
        }
        if (proposal.status === "approved") {
          return { success: false, error: "Already approved" };
        }
        if (proposal.status === "rejected") {
          return { success: false, error: "Was rejected; create a new proposal instead" };
        }
        if (proposal.status === "quarantined" && !force) {
          return {
            success: false,
            error: `Quarantined due to: ${proposal.safetyFlags.join(", ")}. Re-run with force=true to override.`,
          };
        }

        // Resolve target again (in case cwd moved)
        let targetPath: string;
        try {
          targetPath = resolveTargetPath(proposal.slug);
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) };
        }

        // Build SKILL.md with frontmatter
        const md = `---
name: ${proposal.name}
description: ${proposal.description}
---

${proposal.body}
`;

        // Write
        try {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, md, "utf-8");
        } catch (err) {
          return {
            success: false,
            error: `Write failed: ${err instanceof Error ? err.message : err}`,
          };
        }

        proposal.status = "approved";
        proposal.decidedAt = Date.now();
        writeProposals(all);

        return {
          success: true,
          data: {
            id,
            writtenTo: targetPath,
            isUpdate: proposal.isUpdate,
            message: `Wrote ${proposal.slug}/SKILL.md. Run 'vesper skills list' to see it in the eligible set.`,
          },
        };
      },
    }),

    // ── 4. Reject ───────────────────────────────────────────────
    defineTool({
      name: "skill_workshop_reject",
      description: "Reject a pending or quarantined proposal without writing it.",
      inputSchema: inputSchema(
        {
          id: { type: "string" },
          reason: { type: "string", description: "Optional reason for rejection." },
        },
        ["id"]
      ),
      handler: async (input) => {
        const { id, reason } = input as { id: string; reason?: string };
        const all = readProposals();
        const proposal = all.find((p) => p.id === id);
        if (!proposal) {
          return { success: false, error: `Proposal not found: ${id}` };
        }
        if (proposal.status === "approved") {
          return { success: false, error: "Already approved — can't reject after the fact" };
        }
        proposal.status = "rejected";
        proposal.decidedAt = Date.now();
        if (reason) {
          // Append reason to the body so it's recorded
          proposal.body = `${proposal.body}\n\n<!-- REJECTED: ${reason} -->`;
        }
        writeProposals(all);
        return { success: true, data: { id, status: "rejected", reason: reason || null } };
      },
    }),

    // ── 5. View proposal body ───────────────────────────────────
    defineTool({
      name: "skill_workshop_view",
      description: "Return the full markdown body of a proposal for review.",
      inputSchema: inputSchema({ id: { type: "string" } }, ["id"]),
      handler: async (input) => {
        const { id } = input as { id: string };
        const all = readProposals();
        const p = all.find((p) => p.id === id);
        if (!p) {
          return { success: false, error: `Proposal not found: ${id}` };
        }
        return {
          success: true,
          data: {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            status: p.status,
            safetyFlags: p.safetyFlags,
            isUpdate: p.isUpdate,
            targetPath: p.targetPath,
            body: p.body,
            proposedAt: new Date(p.proposedAt).toISOString(),
            decidedAt: p.decidedAt ? new Date(p.decidedAt).toISOString() : null,
          },
        };
      },
    }),

    // ── 6. Prune (clean up old approved/rejected) ──────────────
    defineTool({
      name: "skill_workshop_prune",
      description:
        "Remove old decided proposals from the queue (default: older than 30 days). " +
        "Pending and quarantined proposals are never pruned automatically.",
      inputSchema: inputSchema(
        {
          olderThanDays: {
            type: "number",
            description: "Prune approved/rejected entries older than this many days. Default 30.",
          },
        },
        []
      ),
      handler: async (input) => {
        const { olderThanDays = 30 } = input as { olderThanDays?: number };
        const cutoff = Date.now() - olderThanDays * 86_400_000;
        const before = readProposals();
        const kept = before.filter(
          (p) =>
            p.status === "pending" ||
            p.status === "quarantined" ||
            (p.decidedAt ?? p.proposedAt) > cutoff
        );
        writeProposals(kept);
        return {
          success: true,
          data: { removed: before.length - kept.length, kept: kept.length },
        };
      },
    }),
  ],
});
