// ============================================================
// 🌒 @openvesper/plugin-pdf
//
// Read text from local PDF files. Search inside PDFs.
//
// PRIVACY: Files read from local filesystem. The agent's filesystem
// sandbox rules (safePath) still apply. Nothing uploaded.
// ============================================================

import fs from "fs/promises";
import path from "path";
import { definePlugin, defineTool, inputSchema } from "@openvesper/plugin-sdk";
import type { ToolResult } from "@openvesper/plugin-sdk";

// pdf-parse is CommonJS — use dynamic import
async function loadPdfParse() {
  const mod = (await import("pdf-parse")) as any;
  return mod.default || mod;
}

async function pdfRead(filePath: string, maxPages?: number): Promise<ToolResult> {
  try {
    const resolved = path.resolve(filePath);
    const buf = await fs.readFile(resolved);
    const pdfParse = await loadPdfParse();
    const data = await pdfParse(buf, {
      max: maxPages || 0, // 0 = all
    });
    return {
      success: true,
      data: {
        file: resolved,
        pageCount: data.numpages,
        textLength: data.text.length,
        info: data.info || {},
        text: data.text,
      },
    };
  } catch (e: any) {
    return { success: false, error: `PDF read failed: ${e.message}` };
  }
}

async function pdfSearch(filePath: string, query: string, contextChars = 100): Promise<ToolResult> {
  try {
    const resolved = path.resolve(filePath);
    const buf = await fs.readFile(resolved);
    const pdfParse = await loadPdfParse();
    const data = await pdfParse(buf);
    const text = data.text as string;

    const matches: { context: string; index: number }[] = [];
    const lower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    let i = 0;
    while ((i = lower.indexOf(queryLower, i)) !== -1) {
      const start = Math.max(0, i - contextChars);
      const end = Math.min(text.length, i + queryLower.length + contextChars);
      matches.push({
        context: text.slice(start, end).replace(/\s+/g, " ").trim(),
        index: i,
      });
      i += queryLower.length;
      if (matches.length >= 50) break;
    }

    return {
      success: true,
      data: {
        file: resolved,
        query,
        matchCount: matches.length,
        matches,
      },
    };
  } catch (e: any) {
    return { success: false, error: `PDF search failed: ${e.message}` };
  }
}

async function pdfMetadata(filePath: string): Promise<ToolResult> {
  try {
    const resolved = path.resolve(filePath);
    const buf = await fs.readFile(resolved);
    const pdfParse = await loadPdfParse();
    const data = await pdfParse(buf, { max: 1 });
    const stat = await fs.stat(resolved);
    return {
      success: true,
      data: {
        file: resolved,
        pageCount: data.numpages,
        size: stat.size,
        modifiedAt: stat.mtime,
        info: data.info || {},
        metadata: data.metadata?._metadata || {},
      },
    };
  } catch (e: any) {
    return { success: false, error: `PDF metadata failed: ${e.message}` };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-pdf",
  version: "1.0.0",
  description: "Read and search local PDF files",
  tools: [
    defineTool({
      name: "pdf_read",
      description: "Extract all text from a PDF file. Returns text + page count.",
      inputSchema: inputSchema(
        {
          file_path: { type: "string", description: "Local PDF file path" },
          max_pages: { type: "number", description: "Limit pages read (0 = all)" },
        },
        ["file_path"]
      ),
      handler: async (input) => pdfRead(input.file_path as string, input.max_pages as number),
      category: "files",
    }),
    defineTool({
      name: "pdf_search",
      description: "Search for text within a PDF, returning surrounding context for each match.",
      inputSchema: inputSchema(
        {
          file_path: { type: "string", description: "Local PDF file path" },
          query: { type: "string", description: "Text to find" },
          context_chars: { type: "number", description: "Chars of context (default 100)" },
        },
        ["file_path", "query"]
      ),
      handler: async (input) =>
        pdfSearch(
          input.file_path as string,
          input.query as string,
          (input.context_chars as number) || 100
        ),
      category: "files",
    }),
    defineTool({
      name: "pdf_metadata",
      description: "Get metadata about a PDF: page count, info dict, file size.",
      inputSchema: inputSchema(
        { file_path: { type: "string", description: "Local PDF file path" } },
        ["file_path"]
      ),
      handler: async (input) => pdfMetadata(input.file_path as string),
      category: "files",
    }),
  ],
});
