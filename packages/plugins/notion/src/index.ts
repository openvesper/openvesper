// ============================================================
// 🌒 @openvesper/plugin-notion
// Notion API — pages, databases, blocks
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";

async function notionApi(path: string, options: RequestInit = {}): Promise<ToolResult> {
  const token = process.env.NOTION_API_KEY;
  if (!token) return { success: false, error: "NOTION_API_KEY required (Notion integration token)" };

  try {
    const r = await fetch(`https://api.notion.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
        ...(options.headers || {}),
      },
    });
    const data = await r.json();
    if (!r.ok) return { success: false, error: data.message || `Notion API: ${r.status}`, data };
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function searchNotion(query: string, filter?: string): Promise<ToolResult> {
  const body: any = { query };
  if (filter === "page") body.filter = { property: "object", value: "page" };
  if (filter === "database") body.filter = { property: "object", value: "database" };

  const r = await notionApi("/search", { method: "POST", body: JSON.stringify(body) });
  if (!r.success) return r;
  return {
    success: true,
    data: {
      query,
      results: ((r.data as any).results || []).slice(0, 20).map((item: any) => ({
        id: item.id,
        type: item.object,
        title: item.properties?.title?.title?.[0]?.plain_text ||
               item.properties?.Name?.title?.[0]?.plain_text ||
               item.title?.[0]?.plain_text ||
               "Untitled",
        url: item.url,
        last_edited: item.last_edited_time,
      })),
    },
  };
}

async function getPage(pageId: string): Promise<ToolResult> {
  return notionApi(`/pages/${pageId}`);
}

async function getPageContent(pageId: string): Promise<ToolResult> {
  const r = await notionApi(`/blocks/${pageId}/children?page_size=100`);
  if (!r.success) return r;
  const blocks = ((r.data as any).results || []).map((b: any) => {
    const text = b[b.type]?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    return { id: b.id, type: b.type, text };
  });
  return { success: true, data: { pageId, blocks, totalBlocks: blocks.length } };
}

async function createPage(parentDatabaseId: string, title: string, content: string): Promise<ToolResult> {
  const body = {
    parent: { database_id: parentDatabaseId },
    properties: {
      Name: { title: [{ text: { content: title } }] },
    },
    children: content ? [{
      object: "block",
      paragraph: {
        rich_text: [{ type: "text", text: { content } }],
      },
    }] : [],
  };

  const r = await notionApi("/pages", { method: "POST", body: JSON.stringify(body) });
  if (!r.success) return r;
  return { success: true, data: { id: (r.data as any).id, url: (r.data as any).url, title } };
}

async function appendBlock(pageId: string, text: string): Promise<ToolResult> {
  const body = {
    children: [{
      object: "block",
      paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
    }],
  };
  return notionApi(`/blocks/${pageId}/children`, { method: "PATCH", body: JSON.stringify(body) });
}

async function queryDatabase(databaseId: string, filterJson: string, limit: number): Promise<ToolResult> {
  let body: any = { page_size: limit || 20 };
  if (filterJson) try { body.filter = JSON.parse(filterJson); } catch { /* ignore */ }
  const r = await notionApi(`/databases/${databaseId}/query`, { method: "POST", body: JSON.stringify(body) });
  if (!r.success) return r;
  return {
    success: true,
    data: {
      databaseId,
      count: ((r.data as any).results || []).length,
      pages: ((r.data as any).results || []).map((p: any) => ({
        id: p.id,
        url: p.url,
        title: p.properties?.Name?.title?.[0]?.plain_text || "Untitled",
        properties: Object.fromEntries(Object.entries(p.properties || {}).map(([k, v]: [string, any]) => [k, v.type])),
      })),
    },
  };
}

export default definePlugin({
  name: "@openvesper/plugin-notion",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Notion — pages, databases, blocks",
  license: "MIT",
  tools: [
    defineTool({ name: "notion_search", description: "Search Notion workspace (pages + databases)", inputSchema: inputSchema({ query: { type: "string", description: "Search text" }, filter: { type: "string", description: "Optional: 'page' or 'database'" } }, ["query"]), handler: async (i) => searchNotion(i.query as string, i.filter as string), category: "notion" }),
    defineTool({ name: "notion_get_page", description: "Get page metadata", inputSchema: inputSchema({ page_id: { type: "string", description: "Page ID" } }, ["page_id"]), handler: async (i) => getPage(i.page_id as string), category: "notion" }),
    defineTool({ name: "notion_read_content", description: "Read page content (all blocks)", inputSchema: inputSchema({ page_id: { type: "string", description: "Page ID" } }, ["page_id"]), handler: async (i) => getPageContent(i.page_id as string), category: "notion" }),
    defineTool({ name: "notion_create_page", description: "Create a new page in a database", inputSchema: inputSchema({ database_id: { type: "string", description: "Parent database ID" }, title: { type: "string", description: "Page title" }, content: { type: "string", description: "Initial content (optional)" } }, ["database_id", "title"]), handler: async (i) => createPage(i.database_id as string, i.title as string, (i.content as string) || ""), category: "notion", permission: "write" }),
    defineTool({ name: "notion_append_block", description: "Append text block to a page", inputSchema: inputSchema({ page_id: { type: "string", description: "Page ID" }, text: { type: "string", description: "Text to append" } }, ["page_id", "text"]), handler: async (i) => appendBlock(i.page_id as string, i.text as string), category: "notion", permission: "write" }),
    defineTool({ name: "notion_query_database", description: "Query a Notion database with optional filter", inputSchema: inputSchema({ database_id: { type: "string", description: "Database ID" }, filter: { type: "string", description: "Optional JSON filter (Notion filter syntax)" }, limit: { type: "number", description: "Max results" } }, ["database_id"]), handler: async (i) => queryDatabase(i.database_id as string, i.filter as string || "", (i.limit as number) || 20), category: "notion" }),
  ]

});
