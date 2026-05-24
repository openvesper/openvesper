// ============================================================
// 🌒 @openvesper/plugin-filesystem
// Read, write, edit, list workspace files
// Permission-gated: writes require approval
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import * as fs from "fs/promises";
import * as path from "path";

function safePath(workspacePath: string, userPath: string): string {
  const resolved = path.resolve(workspacePath, userPath);
  if (!resolved.startsWith(workspacePath)) {
    throw new Error("Path outside workspace not allowed");
  }
  return resolved;
}

async function readFile(filePath: string, ctx: any): Promise<ToolResult> {
  try {
    const full = safePath(ctx.workspace.path, filePath);
    const content = await fs.readFile(full, "utf8");
    return { success: true, data: { path: filePath, content, size: content.length, lines: content.split("\n").length } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function writeFile(filePath: string, content: string, ctx: any): Promise<ToolResult> {
  try {
    const full = safePath(ctx.workspace.path, filePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
    return { success: true, data: { path: filePath, written: content.length } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function listDirectory(dirPath: string, ctx: any): Promise<ToolResult> {
  try {
    const full = safePath(ctx.workspace.path, dirPath || ".");
    const entries = await fs.readdir(full, { withFileTypes: true });
    return {
      success: true,
      data: {
        path: dirPath || ".",
        entries: entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? "dir" : "file",
        })),
      },
    };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function editFile(filePath: string, oldText: string, newText: string, ctx: any): Promise<ToolResult> {
  try {
    const full = safePath(ctx.workspace.path, filePath);
    const content = await fs.readFile(full, "utf8");
    if (!content.includes(oldText)) {
      return { success: false, error: `Old text not found in ${filePath}` };
    }
    const occurrences = content.split(oldText).length - 1;
    if (occurrences > 1) {
      return { success: false, error: `Old text appears ${occurrences} times — must be unique` };
    }
    const updated = content.replace(oldText, newText);
    await fs.writeFile(full, updated, "utf8");
    return { success: true, data: { path: filePath, oldLength: oldText.length, newLength: newText.length } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function deleteFile(filePath: string, ctx: any): Promise<ToolResult> {
  try {
    const full = safePath(ctx.workspace.path, filePath);
    await fs.unlink(full);
    return { success: true, data: { path: filePath, deleted: true } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

async function searchFiles(pattern: string, ctx: any): Promise<ToolResult> {
  try {
    const results: string[] = [];
    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.name.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(path.relative(ctx.workspace.path, full));
        }
      }
    }
    await walk(ctx.workspace.path);
    return { success: true, data: { pattern, matches: results.slice(0, 50), total: results.length } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export default definePlugin({
  name: "@openvesper/plugin-filesystem",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Read, write, edit, list workspace files (permission-gated)",
  license: "MIT",
  tools: [
    defineTool({ name: "read_file", description: "Read a file from workspace", inputSchema: inputSchema({ path: { type: "string", description: "Relative path" } }, ["path"]), handler: async (i, ctx) => readFile(i.path as string, ctx), category: "filesystem", permission: "read" }),
    defineTool({ name: "write_file", description: "Write or create a file in workspace", inputSchema: inputSchema({ path: { type: "string", description: "Relative path" }, content: { type: "string", description: "File content" } }, ["path", "content"]), handler: async (i, ctx) => writeFile(i.path as string, i.content as string, ctx), category: "filesystem", permission: "write" }),
    defineTool({ name: "list_directory", description: "List directory contents", inputSchema: inputSchema({ path: { type: "string", description: "Directory path" } }), handler: async (i, ctx) => listDirectory((i.path as string) || ".", ctx), category: "filesystem", permission: "read" }),
    defineTool({ name: "edit_file", description: "Replace unique text in a file", inputSchema: inputSchema({ path: { type: "string", description: "File path" }, old_text: { type: "string", description: "Text to replace (must be unique)" }, new_text: { type: "string", description: "Replacement text" } }, ["path", "old_text", "new_text"]), handler: async (i, ctx) => editFile(i.path as string, i.old_text as string, i.new_text as string, ctx), category: "filesystem", permission: "write" }),
    defineTool({ name: "delete_file", description: "Delete a file", inputSchema: inputSchema({ path: { type: "string", description: "File path" } }, ["path"]), handler: async (i, ctx) => deleteFile(i.path as string, ctx), category: "filesystem", permission: "write" }),
    defineTool({ name: "search_files", description: "Find files by name pattern", inputSchema: inputSchema({ pattern: { type: "string", description: "Filename substring" } }, ["pattern"]), handler: async (i, ctx) => searchFiles(i.pattern as string, ctx), category: "filesystem", permission: "read" }),
  ]

});
