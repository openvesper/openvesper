// ============================================================
// 🌒 @openvesper/plugin-apply-patch
//
// Applies a unified diff (the kind `git diff` produces) to local files.
// Marked as `mutation` permission — gateway should prompt for approval
// before this runs in interactive sessions.
//
// PRIVACY: All edits are local. The diff content stays on your machine.
// ============================================================

import fs from "fs/promises";
import path from "path";
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import type { ToolResult } from "@openvesper/plugin-sdk";

interface PatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

interface PatchedFile {
  oldPath: string;
  newPath: string;
  hunks: PatchHunk[];
}

/** Parse a unified diff into structured form */
function parsePatch(patch: string): PatchedFile[] {
  const files: PatchedFile[] = [];
  const lines = patch.split("\n");
  let current: PatchedFile | null = null;
  let currentHunk: PatchHunk | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File headers
    if (line.startsWith("--- ")) {
      const oldPath = line.slice(4).trim().replace(/^a\//, "");
      // Next line should be "+++ "
      const next = lines[i + 1];
      if (next?.startsWith("+++ ")) {
        const newPath = next.slice(4).trim().replace(/^b\//, "");
        current = { oldPath, newPath, hunks: [] };
        files.push(current);
        i++;
      }
      continue;
    }

    // Hunk header
    if (line.startsWith("@@")) {
      const m = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (m && current) {
        currentHunk = {
          oldStart: parseInt(m[1], 10),
          oldLines: m[2] ? parseInt(m[2], 10) : 1,
          newStart: parseInt(m[3], 10),
          newLines: m[4] ? parseInt(m[4], 10) : 1,
          lines: [],
        };
        current.hunks.push(currentHunk);
      }
      continue;
    }

    // Hunk content
    if (currentHunk && (line.startsWith(" ") || line.startsWith("+") || line.startsWith("-"))) {
      currentHunk.lines.push(line);
    }
  }

  return files;
}

/** Apply one hunk to file content lines. Returns updated lines or null on conflict. */
function applyHunk(fileLines: string[], hunk: PatchHunk): string[] | null {
  const result: string[] = [...fileLines.slice(0, hunk.oldStart - 1)];
  let oldLineIdx = hunk.oldStart - 1;

  for (const line of hunk.lines) {
    if (line.startsWith(" ")) {
      // Context line — must match
      const existing = fileLines[oldLineIdx];
      if (existing === undefined || existing !== line.slice(1)) {
        return null; // conflict
      }
      result.push(existing);
      oldLineIdx++;
    } else if (line.startsWith("-")) {
      // Deletion — verify
      const existing = fileLines[oldLineIdx];
      if (existing === undefined || existing !== line.slice(1)) {
        return null;
      }
      oldLineIdx++;
      // Don't push — it's deleted
    } else if (line.startsWith("+")) {
      // Addition
      result.push(line.slice(1));
    }
  }

  // Append rest
  return [...result, ...fileLines.slice(oldLineIdx)];
}

async function applyPatch(patchContent: string, workdir: string, dryRun: boolean): Promise<ToolResult> {
  try {
    const files = parsePatch(patchContent);
    if (files.length === 0) {
      return { success: false, error: "No file changes found in patch" };
    }

    const results: { file: string; status: string; hunks: number; error?: string }[] = [];

    for (const file of files) {
      const filePath = path.resolve(workdir, file.newPath);

      // Read current content
      let fileLines: string[] = [];
      try {
        const content = await fs.readFile(filePath, "utf-8");
        fileLines = content.split("\n");
      } catch {
        // New file
        fileLines = [];
      }

      // Apply hunks bottom-up (so line numbers stay valid)
      let updated = [...fileLines];
      let appliedHunks = 0;
      for (const hunk of [...file.hunks].reverse()) {
        const result = applyHunk(updated, hunk);
        if (result === null) {
          results.push({
            file: file.newPath,
            status: "CONFLICT",
            hunks: appliedHunks,
            error: `Hunk at line ${hunk.oldStart} doesn't match current file content`,
          });
          break;
        }
        updated = result;
        appliedHunks++;
      }

      if (appliedHunks < file.hunks.length) continue;

      if (!dryRun) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, updated.join("\n"));
      }

      results.push({
        file: file.newPath,
        status: dryRun ? "WOULD APPLY" : "APPLIED",
        hunks: appliedHunks,
      });
    }

    const failed = results.filter((r) => r.status === "CONFLICT").length;
    return {
      success: failed === 0,
      data: {
        dryRun,
        filesAffected: results.length,
        applied: results.filter((r) => r.status === "APPLIED").length,
        wouldApply: results.filter((r) => r.status === "WOULD APPLY").length,
        conflicts: failed,
        results,
      },
      error: failed > 0 ? `${failed} file(s) had conflicts — patch not fully applied` : undefined,
    };
  } catch (e: any) {
    return { success: false, error: `Apply patch failed: ${e.message}` };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-apply-patch",
  version: "1.0.0",
  description: "Apply unified diffs to local files (mutation — sandboxed)",
  tools: [
    defineTool({
      name: "apply_patch",
      description:
        "Apply a unified diff patch to local files. Use dry_run=true first to preview. Mutation operation — gateway will prompt for approval.",
      inputSchema: inputSchema(
        {
          patch: { type: "string", description: "Unified diff content (output of `git diff`)" },
          workdir: { type: "string", description: "Working directory (default: cwd)" },
          dry_run: { type: "boolean", description: "Preview only, don't write (default: false)" },
        },
        ["patch"]
      ),
      permission: "write",
      handler: async (input) =>
        applyPatch(
          input.patch as string,
          (input.workdir as string) || process.cwd(),
          (input.dry_run as boolean) || false
        ),
      category: "files",
    }),
  ],
});
