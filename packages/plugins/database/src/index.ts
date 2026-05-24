// ============================================================
// 🌒 @openvesper/plugin-database
// SQLite, PostgreSQL, MongoDB tools
// ============================================================

import { definePlugin, defineTool, inputSchema, ToolResult } from "@openvesper/plugin-sdk";
import * as path from "path";

// ── Lazy load drivers (all optional) ────────────────────────

let sqlite3: any = null;
let pg: any = null;
let mongo: any = null;

async function getSqlite() {
  if (sqlite3) return sqlite3;
  try {
    sqlite3 = await import("better-sqlite3" as any);
    return sqlite3;
  } catch {
    throw new Error("better-sqlite3 not installed. Run: npm install better-sqlite3");
  }
}

async function getPg() {
  if (pg) return pg;
  try {
    pg = await import("pg" as any);
    return pg;
  } catch {
    throw new Error("pg not installed. Run: npm install pg");
  }
}

async function getMongo() {
  if (mongo) return mongo;
  try {
    mongo = await import("mongodb" as any);
    return mongo;
  } catch {
    throw new Error("mongodb not installed. Run: npm install mongodb");
  }
}

// Block dangerous SQL
function isDangerousSQL(sql: string): string | null {
  const dangerous = [
    /drop\s+database/i,
    /drop\s+schema/i,
    /truncate\s+\w+\s*;\s*drop/i,
    /;\s*drop\s+/i, // chained drop
    /grant\s+all/i,
    /alter\s+user/i,
  ];
  for (const p of dangerous) {
    if (p.test(sql)) return `Dangerous SQL pattern blocked: ${p}`;
  }
  return null;
}

// ── SQLite ────────────────────────────────────────────────────

async function sqliteQuery(dbPath: string, query: string, params: unknown[], ctx: any): Promise<ToolResult> {
  const danger = isDangerousSQL(query);
  if (danger) return { success: false, error: danger };

  try {
    const Database = (await getSqlite()).default;
    // Sandbox to workspace
    const safePath = path.isAbsolute(dbPath)
      ? dbPath
      : path.join(ctx.workspace.path, dbPath);

    const db = new Database(safePath, { readonly: query.trim().toLowerCase().startsWith("select") });

    const isSelect = /^\s*(select|with|pragma)/i.test(query);
    let result;
    if (isSelect) {
      const stmt = db.prepare(query);
      result = stmt.all(...(params || []));
    } else {
      const stmt = db.prepare(query);
      const info = stmt.run(...(params || []));
      result = { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
    }
    db.close();
    return { success: true, data: { dbPath, query, result, isSelect } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sqliteListTables(dbPath: string, ctx: any): Promise<ToolResult> {
  try {
    const Database = (await getSqlite()).default;
    const safePath = path.isAbsolute(dbPath) ? dbPath : path.join(ctx.workspace.path, dbPath);
    const db = new Database(safePath, { readonly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const result = tables.map((t) => {
      const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
      return { table: t.name, columns: cols };
    });
    db.close();
    return { success: true, data: { dbPath, tables: result } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── PostgreSQL ────────────────────────────────────────────────

async function postgresQuery(query: string, params: unknown[]): Promise<ToolResult> {
  const danger = isDangerousSQL(query);
  if (danger) return { success: false, error: danger };

  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connStr) return { success: false, error: "POSTGRES_URL or DATABASE_URL required" };

  try {
    const pgMod = await getPg();
    const client = new pgMod.Client({ connectionString: connStr });
    await client.connect();
    const res = await client.query(query, params);
    await client.end();
    return {
      success: true,
      data: { rowCount: res.rowCount, rows: res.rows.slice(0, 100), fields: res.fields.map((f: any) => f.name) },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function postgresListTables(): Promise<ToolResult> {
  return postgresQuery(
    `SELECT table_schema, table_name FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
     ORDER BY table_schema, table_name`,
    []
  );
}

// ── MongoDB ───────────────────────────────────────────────────

async function mongoFind(collection: string, filter: object, limit: number): Promise<ToolResult> {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) return { success: false, error: "MONGO_URI required" };

  try {
    const mongoMod = await getMongo();
    const client = new mongoMod.MongoClient(uri);
    await client.connect();
    const dbName = process.env.MONGO_DB || new URL(uri).pathname.slice(1);
    const db = client.db(dbName);
    const coll = db.collection(collection);
    const docs = await coll.find(filter || {}).limit(limit || 20).toArray();
    await client.close();
    return {
      success: true,
      data: { collection, dbName, count: docs.length, docs },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function mongoInsert(collection: string, document: object): Promise<ToolResult> {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) return { success: false, error: "MONGO_URI required" };

  try {
    const mongoMod = await getMongo();
    const client = new mongoMod.MongoClient(uri);
    await client.connect();
    const dbName = process.env.MONGO_DB || new URL(uri).pathname.slice(1);
    const db = client.db(dbName);
    const coll = db.collection(collection);
    const result = await coll.insertOne(document);
    await client.close();
    return {
      success: true,
      data: { collection, insertedId: result.insertedId },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function mongoListCollections(): Promise<ToolResult> {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) return { success: false, error: "MONGO_URI required" };

  try {
    const mongoMod = await getMongo();
    const client = new mongoMod.MongoClient(uri);
    await client.connect();
    const dbName = process.env.MONGO_DB || new URL(uri).pathname.slice(1);
    const db = client.db(dbName);
    const colls = await db.listCollections().toArray();
    await client.close();
    return { success: true, data: { dbName, collections: colls.map((c: any) => c.name) } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export default definePlugin({
  name: "@openvesper/plugin-database",
  version: "1.0.0",
  author: "OpenVesper",
  description: "Database tools — SQLite, PostgreSQL, MongoDB",
  license: "MIT",
  tools: [
    // SQLite
    defineTool({
      name: "sqlite_query",
      description: "Execute SQL query on SQLite database file (relative paths resolve to workspace).",
      inputSchema: inputSchema({
        db_path: { type: "string", description: "Path to .db file" },
        query: { type: "string", description: "SQL query" },
        params: { type: "string", description: "Optional JSON array of parameters" },
      }, ["db_path", "query"]),
      handler: async (i, ctx) => {
        let params: unknown[] = [];
        if (i.params) try { params = JSON.parse(i.params as string); } catch { /* ignore */ }
        return sqliteQuery(i.db_path as string, i.query as string, params, ctx);
      },
      category: "database",
      permission: "execute",
    }),
    defineTool({
      name: "sqlite_list_tables",
      description: "List all tables and columns in a SQLite database.",
      inputSchema: inputSchema({ db_path: { type: "string", description: "Path to .db file" } }, ["db_path"]),
      handler: async (i, ctx) => sqliteListTables(i.db_path as string, ctx),
      category: "database",
      permission: "read",
    }),

    // PostgreSQL
    defineTool({
      name: "postgres_query",
      description: "Execute SQL on PostgreSQL (uses POSTGRES_URL).",
      inputSchema: inputSchema({
        query: { type: "string", description: "SQL query" },
        params: { type: "string", description: "Optional JSON array" },
      }, ["query"]),
      handler: async (i) => {
        let params: unknown[] = [];
        if (i.params) try { params = JSON.parse(i.params as string); } catch { /* */ }
        return postgresQuery(i.query as string, params);
      },
      category: "database",
      permission: "execute",
    }),
    defineTool({
      name: "postgres_list_tables",
      description: "List all PostgreSQL tables.",
      inputSchema: inputSchema({}),
      handler: async () => postgresListTables(),
      category: "database",
      permission: "read",
    }),

    // MongoDB
    defineTool({
      name: "mongo_find",
      description: "Find documents in MongoDB collection.",
      inputSchema: inputSchema({
        collection: { type: "string", description: "Collection name" },
        filter: { type: "string", description: "JSON filter (default: {})" },
        limit: { type: "number", description: "Max docs" },
      }, ["collection"]),
      handler: async (i) => {
        let filter = {};
        if (i.filter) try { filter = JSON.parse(i.filter as string); } catch { /* */ }
        return mongoFind(i.collection as string, filter, (i.limit as number) || 20);
      },
      category: "database",
      permission: "read",
    }),
    defineTool({
      name: "mongo_insert",
      description: "Insert document into MongoDB collection.",
      inputSchema: inputSchema({
        collection: { type: "string", description: "Collection" },
        document: { type: "string", description: "JSON document" },
      }, ["collection", "document"]),
      handler: async (i) => {
        let doc = {};
        try { doc = JSON.parse(i.document as string); } catch { return { success: false, error: "Invalid JSON" }; }
        return mongoInsert(i.collection as string, doc);
      },
      category: "database",
      permission: "execute",
    }),
    defineTool({
      name: "mongo_list_collections",
      description: "List MongoDB collections.",
      inputSchema: inputSchema({}),
      handler: async () => mongoListCollections(),
      category: "database",
      permission: "read",
    }),
  ]

});
