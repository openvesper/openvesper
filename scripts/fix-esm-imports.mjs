#!/usr/bin/env node
// ============================================================
// fix-esm-imports.mjs
//
// After tsc compiles to dist/, this walks every .js file and rewrites
// extension-less relative imports to add .js (and dir → /index.js).
//
// Why: TypeScript with moduleResolution "Bundler" lets you write
//   import { X } from "./types";
// but Node.js ESM strict-resolution requires:
//   import { X } from "./types/index.js";
//
// This script bridges both worlds without changing source files.
// ============================================================

import fs from "fs";
import path from "path";

const distRoots = process.argv.slice(2);
if (distRoots.length === 0) {
  console.error("Usage: fix-esm-imports.mjs <dist1> [dist2] ...");
  process.exit(1);
}

let totalFiles = 0;
let totalRewrites = 0;

function walk(dir, fn) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, fn);
    } else if (entry.isFile() && (full.endsWith(".js") || full.endsWith(".d.ts"))) {
      fn(full);
    }
  }
}

const IMPORT_RE = /(import\s+(?:type\s+)?(?:[\w*\s{},]+\s+from\s+)?|export\s+(?:type\s+)?(?:[\w*\s{},]+\s+from\s+|\*\s+from\s+))(["'])(\.\.?\/[^"']+?)\2/g;

function processFile(file) {
  let src = fs.readFileSync(file, "utf-8");
  const originalSrc = src;
  const fileDir = path.dirname(file);

  src = src.replace(IMPORT_RE, (match, prefix, quote, spec) => {
    // Already has .js / .mjs / .cjs / .json extension? leave alone
    if (/\.(m?js|cjs|json)$/.test(spec)) return match;

    // Resolve target
    const target = path.resolve(fileDir, spec);

    // Is it a directory with an index.js inside?
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      if (fs.existsSync(path.join(target, "index.js")) ||
          fs.existsSync(path.join(target, "index.d.ts"))) {
        totalRewrites++;
        return `${prefix}${quote}${spec}/index.js${quote}`;
      }
    }

    // Otherwise — is there a sibling .js?
    if (fs.existsSync(`${target}.js`) || fs.existsSync(`${target}.d.ts`)) {
      totalRewrites++;
      return `${prefix}${quote}${spec}.js${quote}`;
    }

    // No match — leave alone (might be intentionally broken or external)
    return match;
  });

  if (src !== originalSrc) {
    fs.writeFileSync(file, src);
  }
  totalFiles++;
}

for (const root of distRoots) {
  console.log(`Scanning ${root}...`);
  walk(root, processFile);
}

console.log(`\n✓ Processed ${totalFiles} files`);
console.log(`✓ Rewrote ${totalRewrites} import statements`);
