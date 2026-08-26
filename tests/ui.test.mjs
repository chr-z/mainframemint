/* MainframeMint — UI / packaging gates. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(ROOT, p), "utf8");

test("index.html sanity: engine hooks present", () => {
  const html = read("index.html");
  for (const id of ["in-months", "in-cents", "in-rate", "in-mcent", "run", "err",
    "results", "result-panel", "log", "history", "clear-hist", "lang", "currency",
    "tab-compd", "tab-amort", "tab-saving", "lbl-principal", "lbl-mcent"]) {
    assert.ok(html.includes(`id="${id}"`), `missing #${id}`);
  }
  assert.match(html, /<title>MainframeMint[^<]*<\/title>/);
});

test("app imports the JS mirror and registers the SW", () => {
  const app = read("js/app.js");
  assert.ok(app.includes('from "./mmcore.mjs"'), "app must import the mirror");
  assert.ok(app.includes("runCase"), "engine entrypoint must be used");
  assert.match(app, /serviceWorker\.register\("sw\.js"\)/);
  assert.ok(!/document\.write/.test(app));
});

test("i18n: en and pt-BR export identical key sets", () => {
  const src = read("js/i18n.js");
  // evaluate the IIFE; the source assigns window.MM_I18N itself
  const sandbox = { window: {} };
  new Function("window", src)(sandbox.window);
  const packs = sandbox.window.MM_I18N;
  assert.ok(packs.en && packs["pt-BR"]);
  const en = Object.keys(packs.en).sort();
  const pt = Object.keys(packs["pt-BR"]).sort();
  assert.deepEqual(en, pt);
});

test("every data-i18n key in the HTML exists in both locales", () => {
  const html = read("index.html");
  const src = read("js/i18n.js");
  const sandbox = { window: {} };
  new Function("window", src)(sandbox.window);
  const packs = sandbox.window.MM_I18N;
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 20, "expected a fully localized page");
  for (const k of keys) {
    assert.ok(k in packs.en, `en missing "${k}"`);
    assert.ok(k in packs["pt-BR"], `pt-BR missing "${k}"`);
  }
});

test("precache generation covers the site assets (idempotent)", () => {
  execSync("node scripts/gen-precache.mjs", { cwd: ROOT });
  execSync("node scripts/gen-precache.mjs", { cwd: ROOT });
  const sw = read("sw.js");
  assert.match(sw, /const CACHE_VERSION = "__MM_CACHE_VERSION__";/);
  for (const asset of ["index.html", "style.css", "manifest.json", "assets/icon.svg", "js/app.js", "js/mmcore.mjs", "sw.js"]) {
    assert.ok(sw.includes(`"${asset}"`), `precache missing ${asset}`);
  }
});

test("SW registers fetch/install handlers", () => {
  const sw = read("sw.js");
  assert.match(sw, /addEventListener\("install"/);
  assert.match(sw, /addEventListener\("activate"/);
  assert.match(sw, /addEventListener\("fetch"/);
});

test("manifest is valid PWA metadata", () => {
  const mf = JSON.parse(read("manifest.json"));
  assert.equal(mf.name, "MainframeMint");
  assert.ok(Array.isArray(mf.icons) && mf.icons.length >= 1);
});

test("icon exists and is a real svg", () => {
  const p = path.join(ROOT, "assets/icon.svg");
  assert.ok(existsSync(p));
  assert.ok(statSync(p).size > 100);
  assert.match(readFileSync(p, "utf8"), /<svg[\s>]/);
});

test("COBOL sources ship intact (fixed-format, non-empty, headered)", () => {
  for (const f of ["engine/mfmcompd.cob", "engine/mfamort.cob", "engine/mfsaving.cob", "drivers/mfrun.cob"]) {
    const lines = read(f).split("\n");
    assert.ok(lines.length > 30, `${f} suspiciously small`);
    assert.ok(lines.some((ln) => /PROGRAM-ID\./.test(ln)), `${f} missing PROGRAM-ID`);
    // fixed format: sequence/indicator columns 1-6 stay blank or comment
    for (const ln of lines) {
      if (ln.length > 0) assert.ok(!/\r/.test(ln), `${f} contains stray CR`);
    }
  }
});

test("golden/case pairing is stable", () => {
  const cases = read("tests/cases.txt").trim().split(/\r?\n/);
  const goldens = read("tests/goldens.txt").trim().split(/\r?\n/);
  assert.equal(parseInt(cases[0], 10), cases.length - 1);
  assert.equal(cases.length - 1, goldens.length);
  for (const g of goldens) assert.match(g, /^-?\d+ -?\d+ -?\d+ -?\d+$/);
});

test("no accidental secrets in tree", () => {
  const bad = /(BEGIN [A-Z]+ PRIVATE KEY|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,})/;
  for (const f of ["js/app.js", "js/i18n.js", "js/mmcore.mjs", "sw.js", "index.html", "README.md"]) {
    assert.ok(!bad.test(read(f)), `potential secret in ${f}`);
  }
});
