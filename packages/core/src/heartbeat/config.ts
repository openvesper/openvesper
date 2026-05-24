// ============================================================
// 🌒 @openvesper/core — Heartbeat config loader
// ============================================================
// Reads cron.yaml + webhooks.yaml from config/ directory.
// Minimal YAML parser — supports the subset we need.
// ============================================================

import * as fs from "fs";
import { CronJob } from "./scheduler";
import { WebhookConfig } from "./webhooks";

// ────────────────────────────────────────────────────────────
// Minimal YAML parser (handles our config schema only)
// For complex YAML, swap in `js-yaml` later.
// ────────────────────────────────────────────────────────────

interface YamlContext {
  lines: string[];
  pos: number;
}

function parseYaml(text: string): any {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => !l.trim().startsWith("#") && l.trim() !== "");
  return parseBlock({ lines, pos: 0 }, 0);
}

function parseBlock(ctx: YamlContext, indent: number): any {
  const result: any = {};
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const lineIndent = line.match(/^(\s*)/)![0].length;
    if (lineIndent < indent) break;
    if (lineIndent > indent) {
      // Shouldn't happen at top of block — skip
      ctx.pos++;
      continue;
    }

    const trimmed = line.slice(indent);

    // Array item at this indent
    if (trimmed.startsWith("- ")) {
      // Caller should have called parseArray instead
      return parseArray(ctx, indent);
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx < 0) {
      ctx.pos++;
      continue;
    }

    const key = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();

    ctx.pos++;

    if (rest === "" || rest === null) {
      // Nested object or array — peek next line
      const next = ctx.lines[ctx.pos];
      if (next === undefined) {
        result[key] = null;
        continue;
      }
      const nextIndent = next.match(/^(\s*)/)![0].length;
      if (nextIndent <= indent) {
        result[key] = null;
        continue;
      }
      const nextTrimmed = next.slice(nextIndent);
      if (nextTrimmed.startsWith("- ")) {
        result[key] = parseArray(ctx, nextIndent);
      } else {
        result[key] = parseBlock(ctx, nextIndent);
      }
    } else {
      result[key] = parseValue(rest);
    }
  }
  return result;
}

function parseArray(ctx: YamlContext, indent: number): any[] {
  const result: any[] = [];
  while (ctx.pos < ctx.lines.length) {
    const line = ctx.lines[ctx.pos];
    const lineIndent = line.match(/^(\s*)/)![0].length;
    if (lineIndent < indent) break;
    const trimmed = line.slice(indent);
    if (!trimmed.startsWith("- ")) break;

    const itemStart = trimmed.slice(2);

    // Inline value: "- foo" or "- key: value"
    const inlineColon = itemStart.indexOf(":");
    if (inlineColon > 0 && !itemStart.startsWith("'") && !itemStart.startsWith('"')) {
      // First key/value of an object item
      const item: any = {};
      const key = itemStart.slice(0, inlineColon).trim();
      const value = itemStart.slice(inlineColon + 1).trim();
      if (value === "") {
        ctx.pos++;
        // Nested
        const next = ctx.lines[ctx.pos];
        if (next) {
          const nextIndent = next.match(/^(\s*)/)![0].length;
          item[key] = parseBlock(ctx, nextIndent);
        } else {
          item[key] = null;
        }
      } else {
        item[key] = parseValue(value);
        ctx.pos++;
      }
      // Continue reading sibling keys at the item-body indent
      const itemBodyIndent = indent + 2; // standard 2-space "  key: value"
      while (ctx.pos < ctx.lines.length) {
        const peek = ctx.lines[ctx.pos];
        const peekIndent = peek.match(/^(\s*)/)![0].length;
        if (peekIndent < itemBodyIndent) break;
        const peekTrimmed = peek.slice(itemBodyIndent);
        if (peekTrimmed.startsWith("- ")) break;
        const c2 = peekTrimmed.indexOf(":");
        if (c2 < 0) {
          ctx.pos++;
          continue;
        }
        const k2 = peekTrimmed.slice(0, c2).trim();
        const v2 = peekTrimmed.slice(c2 + 1).trim();
        ctx.pos++;
        if (v2 === "") {
          // Nested under this key
          const next = ctx.lines[ctx.pos];
          if (next) {
            const nextIndent = next.match(/^(\s*)/)![0].length;
            item[k2] = parseBlock(ctx, nextIndent);
          } else {
            item[k2] = null;
          }
        } else {
          item[k2] = parseValue(v2);
        }
      }
      result.push(item);
    } else {
      // Scalar item
      result.push(parseValue(itemStart));
      ctx.pos++;
    }
  }
  return result;
}

function parseValue(raw: string): any {
  // Strip pipe-style block scalars (rough: treat as multi-line string)
  if (raw === "|" || raw === ">") return ""; // Simplified
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "~") return null;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  // Strip quotes
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

// ────────────────────────────────────────────────────────────
// Loaders
// ────────────────────────────────────────────────────────────

export function loadCronConfig(configPath: string): CronJob[] {
  if (!fs.existsSync(configPath)) return [];
  const text = fs.readFileSync(configPath, "utf8");
  const parsed = parseYaml(text);
  const jobs = parsed?.jobs;
  if (!Array.isArray(jobs)) return [];

  return jobs.map((j: any, i: number) => ({
    id: j.id || j.name || `job-${i}`,
    name: j.name || j.id || `Job ${i + 1}`,
    schedule: j.schedule,
    agent: j.agent || "auto",
    prompt: j.prompt || "",
    deliver_to: j.deliver_to || j.deliverTo,
    enabled: j.enabled ?? true,
    runCount: 0,
  })) as CronJob[];
}

export function loadWebhookConfig(configPath: string): WebhookConfig[] {
  if (!fs.existsSync(configPath)) return [];
  const text = fs.readFileSync(configPath, "utf8");
  const parsed = parseYaml(text);
  const webhooks = parsed?.webhooks;
  if (!Array.isArray(webhooks)) return [];

  return webhooks.map((w: any) => ({
    path: w.path,
    secret_env: w.secret_env || w.secretEnv,
    signature_header: w.signature_header || w.signatureHeader,
    signature_algo: w.signature_algo || w.signatureAlgo,
    signature_prefix: w.signature_prefix || w.signaturePrefix,
    agent: w.agent || "auto",
    prompt_template: w.prompt_template || w.promptTemplate || "",
    filter: w.filter,
    deliver_to: w.deliver_to || w.deliverTo,
    enabled: w.enabled ?? true,
  })) as WebhookConfig[];
}
