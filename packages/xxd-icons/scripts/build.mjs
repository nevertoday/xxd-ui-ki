// 构建：dist/icons.iife.js（无构建插件用，window.XxdIcons）、dist/sprite.svg、dist/svg/*.svg
import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ICON_NAMES, ICON_NODES, iconSVG } from "../src/svg.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "svg"), { recursive: true });

await build({
  entryPoints: [join(root, "src/svg.js")],
  bundle: true,
  format: "iife",
  globalName: "XxdIcons",
  target: "es2020",
  minify: true,
  legalComments: "none",
  outfile: join(dist, "icons.iife.js"),
  banner: { js: "/* @xxd/icons — 小小东图标。Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved. */" },
});

for (const name of ICON_NAMES) writeFileSync(join(dist, "svg", `${name}.svg`), iconSVG(name, { size: 24 }) + "\n");

const symbols = ICON_NAMES.map((name) => {
  const inner = iconSVG(name).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return `<symbol id="xxd-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="miter">${inner}</symbol>`;
});
writeFileSync(join(dist, "sprite.svg"), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join("")}</svg>\n`);
console.log(`@xxd/icons: ${Object.keys(ICON_NODES).length} icons → dist/`);
