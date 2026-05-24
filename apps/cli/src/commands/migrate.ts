// ============================================================
// 🌒 vesper migrate — workspace schema migration
// ============================================================
//
// As OpenVesper evolves, the on-disk layout under ~/.openvesper/ may
// change shape: file renames, JSON schema bumps, directory reorganizations.
//
// This command walks through registered migrations and applies them in
// order. Each migration:
//   - Has a unique numeric id (monotonic across releases)
//   - Has a one-line description
//   - Is idempotent — re-running is a no-op
//   - Records itself in ~/.openvesper/migrations.json on success
//
// New migrations are added by appending to MIGRATIONS below.
// ============================================================

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const RESET = "\x1b[0m";
const c = {
  cyan: (s: string) => `\x1b[36m${s}${RESET}`,
  green: (s: string) => `\x1b[32m${s}${RESET}`,
  red: (s: string) => `\x1b[31m${s}${RESET}`,
  dim: (s: string) => `\x1b[2m${s}${RESET}`,
  bold: (s: string) => `\x1b[1m${s}${RESET}`,
};

const WORKSPACE = path.join(os.homedir(), ".openvesper");
const MIGRATIONS_FILE = path.join(WORKSPACE, "migrations.json");

interface Migration {
  id: number;
  description: string;
  apply: (opts: { workspace: string; dryRun: boolean }) => Promise<{ changed: boolean; notes?: string }>;
}

// ── Registered migrations ───────────────────────────────────────────
// Add new ones by appending. Never rewrite history — old migrations
// stay forever so users on stale workspaces can catch up.

const MIGRATIONS: Migration[] = [
  // ──────────────────────────────────────────────────────────────────
  {
    id: 1,
    description: "Ensure standard subdirectories exist (sessions, tokens, audit, ...)",
    apply: async ({ workspace, dryRun }) => {
      const subdirs = [
        "workspace/sessions",
        "agents",
        "tokens",
        "tasks",
        "audit",
        "plugins",
      ];
      let createdAny = false;
      for (const sd of subdirs) {
        const full = path.join(workspace, sd);
        if (!fs.existsSync(full)) {
          if (!dryRun) {
            fs.mkdirSync(full, { recursive: true, mode: 0o700 });
          }
          createdAny = true;
        }
      }
      return { changed: createdAny };
    },
  },
  // ──────────────────────────────────────────────────────────────────
  {
    id: 2,
    description: "Tighten file permissions to 0600 / 0700",
    apply: async ({ workspace, dryRun }) => {
      if (process.platform === "win32") {
        return { changed: false, notes: "skipped on Windows" };
      }
      let fixed = 0;
      // Walk the workspace. Files → 0600 (if not already 600 or stricter),
      // directories → 0700.
      const walk = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        try {
          const stat = fs.statSync(dir);
          const mode = stat.mode & 0o777;
          if (mode !== 0o700) {
            if (!dryRun) fs.chmodSync(dir, 0o700);
            fixed++;
          }
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else if (entry.isFile()) {
              const fstat = fs.statSync(full);
              const fmode = fstat.mode & 0o777;
              if (fmode !== 0o600) {
                if (!dryRun) fs.chmodSync(full, 0o600);
                fixed++;
              }
            }
          }
        } catch {
          // ignore unreadable subtree
        }
      };
      walk(workspace);
      return { changed: fixed > 0, notes: `${fixed} entries adjusted` };
    },
  },
  // ──────────────────────────────────────────────────────────────────
  {
    id: 3,
    description: "Add `version` field to config.json if missing",
    apply: async ({ workspace, dryRun }) => {
      const cfgPath = path.join(workspace, "config.json");
      if (!fs.existsSync(cfgPath)) return { changed: false };
      try {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
        if (cfg.version) return { changed: false };
        cfg.version = "1.0";
        if (!dryRun) {
          fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), { mode: 0o600 });
        }
        return { changed: true };
      } catch {
        return { changed: false, notes: "config.json unparseable, skipped" };
      }
    },
  },
];

// ── State tracking ──────────────────────────────────────────────────

function readApplied(): Set<number> {
  try {
    const data = JSON.parse(fs.readFileSync(MIGRATIONS_FILE, "utf-8"));
    return new Set<number>(data.applied || []);
  } catch {
    return new Set();
  }
}

function writeApplied(ids: Set<number>): void {
  if (!fs.existsSync(WORKSPACE)) {
    fs.mkdirSync(WORKSPACE, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(
    MIGRATIONS_FILE,
    JSON.stringify(
      {
        applied: [...ids].sort((a, b) => a - b),
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
}

// ── Entry point ─────────────────────────────────────────────────────

export async function runMigrate(opts: { dryRun?: boolean } = {}): Promise<void> {
  console.log("");
  console.log(c.cyan(c.bold("  🌒 OpenVesper Migrate")));
  console.log(c.dim(`     Workspace: ${WORKSPACE}`));
  if (opts.dryRun) console.log(c.dim("     Mode: DRY RUN (no changes will be made)"));
  console.log("");

  if (!fs.existsSync(WORKSPACE)) {
    console.log(c.dim("  No workspace yet. Run `vesper onboard` first."));
    return;
  }

  const applied = readApplied();
  const pending = MIGRATIONS.filter((m) => !applied.has(m.id));

  if (pending.length === 0) {
    console.log(c.green(`  ✓ Up to date — ${applied.size} migrations applied.`));
    console.log("");
    return;
  }

  console.log(`  ${pending.length} migration${pending.length !== 1 ? "s" : ""} to apply:\n`);

  for (const m of pending) {
    process.stdout.write(`  ${c.cyan(String(m.id).padStart(3))} ${m.description}... `);
    try {
      const result = await m.apply({ workspace: WORKSPACE, dryRun: !!opts.dryRun });
      if (result.changed) {
        console.log(c.green("changed") + (result.notes ? c.dim(` (${result.notes})`) : ""));
      } else {
        console.log(c.dim("no-op") + (result.notes ? c.dim(` (${result.notes})`) : ""));
      }
      if (!opts.dryRun) {
        applied.add(m.id);
        writeApplied(applied);
      }
    } catch (err) {
      console.log(c.red("failed"));
      console.log(c.red(`     ${err instanceof Error ? err.message : err}`));
      console.log("");
      console.log(c.red("  Migration failed. Stopping. Fix the error and re-run."));
      process.exit(1);
    }
  }

  console.log("");
  if (opts.dryRun) {
    console.log(c.dim(`  Dry run complete — ${pending.length} migration${pending.length !== 1 ? "s" : ""} would be applied.`));
    console.log(c.dim("  Run without --dry-run to apply for real."));
  } else {
    console.log(c.green(`  ✓ All ${pending.length} migrations applied.`));
  }
  console.log("");
}
