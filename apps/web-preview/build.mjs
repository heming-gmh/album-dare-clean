/**
 * Bundles the preview into one self-contained HTML file.
 * Double-clicking dist/index.html must work offline: no server, no DevEco, no network.
 */
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "dist");
mkdirSync(outDir, { recursive: true });

const result = await build({
  entryPoints: [path.join(here, "src/main.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  charset: "utf8",
  write: false,
  logLevel: "warning",
});

const bundle = result.outputFiles?.[0]?.text;
if (!bundle) {
  console.error("bundle produced no output");
  process.exit(1);
}

const shell = readFileSync(path.join(here, "src/index.html"), "utf8");
const html = shell.replace("<!--APP_SCRIPT-->", () => `<script>\n${bundle}</script>`);

// Same wording contract the Harmony shell has to pass in packages/core tests.
const forbidden = ["强力清理", "垃圾", "最佳照片", "相似"];
const required = ["智能整理", "分组建议", "建议移出图库", "不确定"];
let failed = false;
for (const word of forbidden) {
  if (html.includes(word)) {
    console.error(`copy check failed: forbidden wording ${word}`);
    failed = true;
  }
}
for (const word of required) {
  if (!html.includes(word)) {
    console.error(`copy check failed: missing wording ${word}`);
    failed = true;
  }
}
if (failed) process.exit(1);

const target = path.join(outDir, "index.html");
writeFileSync(target, html, "utf8");
console.log(`built ${path.relative(here, target)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
