#!/usr/bin/env node
// MainframeMint — generates the SW precache list from the actual repo tree.
// Idempotent: rewrites ONLY __MM_PRECACHE_LIST__; leaves __MM_CACHE_VERSION__ for CI stamping.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir, base = "", out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === ".github" || name === "tests" || name === "scripts" || name === "bin") continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, rel, out);
    else out.push(rel.split(path.sep).join("/"));
  }
  return out;
}

const files = walk(ROOT).sort();
const list = JSON.stringify(files, null, 1).replace(/\n/g, "\n  ");
const swPath = path.join(ROOT, "sw.js");
let sw = fs.readFileSync(swPath, "utf8");
if (!sw.includes("__MM_PRECACHE_LIST__")) {
  // already generated — reset to marker first so regeneration is stable
  sw = sw.replace(/const PRECACHE = \[[\s\S]*?\];/, "const PRECACHE = __MM_PRECACHE_LIST__;");
}
sw = sw.replace("__MM_PRECACHE_LIST__", list);
fs.writeFileSync(swPath, sw);
console.log(`precache: ${files.length} assets`);
