// tokens.css（人写，唯一来源）→ dist/
//   tokens.css         原样复制
//   tokens.shadow.css  :root → :host，给 Shadow DOM 注入用
//   tokens.json        各模式下的变量值（文档站、对比度检查、Figma）
//   tokens.d.ts        类型化的变量名
//   boot.js            首帧前执行的经典脚本（window.XxdTheme）
//   theme.js           ESM（有构建的项目直接 import "@xxd/tokens"）
import { build } from "esbuild";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const source = readFileSync(join(root, "tokens.css"), "utf8");

/** :root → :host；:root[...] → :host([...])；保留后代选择器。 */
export function toShadow(css) {
  return css.replace(/:root((?:\[[^\]]+\])*)/g, (_, attrs) => (attrs ? `:host(${attrs})` : ":host"));
}

/** 解析出每个规则块里的自定义属性。 */
export function parseBlocks(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = {};
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const selector = m[1].trim().replace(/^@media[^{]*$/, "").trim();
    const vars = {};
    for (const decl of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[decl[1]] = decl[2].trim().replace(/\s+/g, " ");
    if (Object.keys(vars).length) blocks[selector] = { ...(blocks[selector] || {}), ...vars };
  }
  return blocks;
}

/**
 * 给已有一套变量的老项目（会员站）用：整份令牌放进 @layer xxd.tokens。
 * 没进 layer 的样式永远赢过 layer 里的，所以老项目自己的同名变量不受影响（不管选择器优先级），
 * 只多出它还没有的变量。去掉全局的减少动效规则（老项目有自己的处理，不能替它决定）。
 */
export function toLayered(css) {
  const withoutMotion = css.replace(/\/\* 减少动效[^*]*\*\/\s*@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}\n?/, "");
  // :root → :where(:root)：layer 里本来就最弱，再去掉优先级；文字上也和老项目自己的 :root[...] 块区分开
  // （有些老测试按文本找第一个 `:root[data-theme="dark"] {`）。
  const scoped = withoutMotion.replace(/:root((?:\[[^\]]+\])*)/g, (_, attrs) => `:where(:root${attrs})`);
  return `/* @xxd/tokens（layered）— Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved. */\n@layer xxd.tokens {\n${scoped.trim()}\n}\n`;
}

const MODE_NAMES = {
  ":root": "base",
  ':root[data-theme="dark"]': "dark",
  ':root[data-corners="rounded"]': "rounded",
  ':root[data-density="compact"]': "compact",
  ":root[data-accent]": "accent",
  ':root[data-theme="dark"][data-accent]': "darkAccent",
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, "tokens.css"), `/* @xxd/tokens — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved. */\n${source}`);
  writeFileSync(join(dist, "tokens.shadow.css"), toShadow(source));
  writeFileSync(join(dist, "tokens.layered.css"), toLayered(source));

  const blocks = parseBlocks(source);
  const json = {};
  for (const [selector, vars] of Object.entries(blocks)) {
    const name = MODE_NAMES[selector] || (selector === ":root" ? "base" : null);
    if (name) json[name] = vars;
  }
  // @media (pointer: coarse) 里的 :root 会被解析成 ":root" 覆盖 base 的 --hit-min，单独还原。
  json.base["--hit-min"] = "40px";
  json.coarse = { "--hit-min": "44px" };
  writeFileSync(join(dist, "tokens.json"), JSON.stringify(json, null, 2) + "\n");

  const names = Object.keys(json.base).sort();
  writeFileSync(
    join(dist, "tokens.d.ts"),
    `/** 小小东设计令牌的 CSS 变量名（自动生成）。 */\nexport type XxdToken =\n${names.map((n) => `  | "${n}"`).join("\n")};\n`,
  );

  const common = { bundle: true, target: "es2020", legalComments: "none", banner: { js: "/* @xxd/tokens — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved. */" } };
  await build({ ...common, entryPoints: [join(root, "src/boot.js")], format: "iife", minify: true, outfile: join(dist, "boot.js") });
  await build({ ...common, entryPoints: [join(root, "src/index.js")], format: "esm", outfile: join(dist, "theme.js") });
  console.log(`@xxd/tokens: ${names.length} tokens → dist/`);
}
