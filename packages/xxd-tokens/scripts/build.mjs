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

// 写在 <html>（Shadow 里是 host）上的外观属性
const ROOT_ATTR = /^\[data-(?:theme|corners|accent|density|finish|input)\b[^\]]*\]/;

/** 按顶层逗号切选择器列表（:is() / :not() 里的逗号不切）。 */
function splitSelectors(list) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    const ch = list[i];
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    else if (ch === "," && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function shadowSelector(list) {
  const out = [];
  for (const sel of splitSelectors(list)) {
    out.push(sel);
    // 令牌块：host 上的值可能被宿主页面的规则盖掉（页面里 `div { --ink: … }` 会打到 host 上，
    // 而且外面的规则永远赢过 :host），所以在 Shadow 内部的顶层元素上再声明一次——那里宿主页面够不着。
    if (/^:host(\((?:[^()]|\([^()]*\))*\))?$/.test(sel)) out.push(`${sel} > *`);
    // `[data-finish=material] .xxd-btn` 这类：属性写在 host 上时也生效
    const attr = sel.match(ROOT_ATTR);
    if (attr && /^\s/.test(sel.slice(attr[0].length))) out.push(`:host(${attr[0]})${sel.slice(attr[0].length)}`);
    // 光秃秃的 `[data-finish=material]`（设变量给里面继承）：写在 host 上时也生效
    if (attr && attr[0] === sel && !out.includes(`:host(${sel})`)) out.push(`:host(${sel})`);
  }
  return [...new Set(out)].join(",\n");
}

/**
 * 继承属性的隔离：宿主页面的 text-transform / letter-spacing / text-align / line-height … 会穿过 Shadow 边界继承进来。
 * 在 Shadow 的顶层元素上重置；放在最先声明的 layer 里，所以任何组件样式都赢过它。
 */
export const SHADOW_RESET = `@layer xxd.reset {
  :host > * {
    color: var(--ink);
    font: var(--weight-regular) var(--text-sm) / 1.55 var(--font-body);
    letter-spacing: normal;
    word-spacing: normal;
    text-transform: none;
    text-align: start;
    text-indent: 0;
    text-shadow: none;
    white-space: normal;
    cursor: auto;
    visibility: visible;
    hyphens: manual;
    writing-mode: horizontal-tb;
    -webkit-text-fill-color: currentcolor;
    -webkit-font-smoothing: antialiased;
    font-synthesis: none;
  }
}
`;

/** :root → :host；:root[...] / :root:lang(...) → :host([...])；令牌在 Shadow 内部再声明一次；外观属性选择器加 :host() 版本；继承属性重置。 */
export function toShadow(css) {
  const hosted = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/:root((?:\[[^\]]+\]|:lang\([^)]*\))*)/g, (_, attrs) => (attrs ? `:host(${attrs})` : ":host"));
  // 只改规则的选择器（前面是 { } ; 或开头），不碰 @规则
  const body = hosted.replace(/(^|[{};])(\s*)([^{}@;\s][^{};]*?)(\s*)\{/g, (_, pre, ws, sel, ws2) =>
    /^(from|to|\d+(\.\d+)?%)(\s*,\s*(from|to|\d+(\.\d+)?%))*$/.test(sel) ? `${pre}${ws}${sel}${ws2}{` : `${pre}${ws}${shadowSelector(sel)}${ws2}{`,
  );
  return `${SHADOW_RESET}${body}`;
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
 * 只多出它还没有的变量。（tokens.css 只有变量；全局规则在 base.css，老项目不引。）
 */
export function toLayered(css) {
  // :root → :where(:root)：layer 里本来就最弱，再去掉优先级；文字上也和老项目自己的 :root[...] 块区分开
  // （有些老测试按文本找第一个 `:root[data-theme="dark"] {`）。
  const scoped = css.replace(/:root((?:\[[^\]]+\])*)/g, (_, attrs) => `:where(:root${attrs})`);
  return `/* @xxd/tokens（layered）— Copyright (c) 2026 小小东 (xiaoxiaodong.ai). MIT License. */\n@layer xxd.tokens {\n${scoped.trim()}\n}\n`;
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
  const blocks = parseBlocks(source);
  // 没有 JS 时（boot.js 没跑、SSR 首屏）也跟随系统暗色：从暗色块生成一段 prefers-color-scheme 的兜底，只放进 dist。
  const darkVars = Object.entries(blocks[':root[data-theme="dark"],\n[data-theme="dark"]'] ?? blocks[':root[data-theme="dark"]'] ?? {});
  const fallback = darkVars.length
    ? `\n/* 没有 JS 时也跟随系统暗色（scripts/build.mjs 从暗色块生成；boot.js 写了 data-theme 以后以它为准） */\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n    color-scheme: dark;\n${darkVars.map(([k, v]) => `    ${k}: ${v};`).join("\n")}\n  }\n}\n`
    : "";
  const full = source + fallback;
  writeFileSync(join(dist, "tokens.css"), `/* @xxd/tokens — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). MIT License. */\n${full}`);
  writeFileSync(join(dist, "tokens.shadow.css"), toShadow(full));
  writeFileSync(join(dist, "tokens.layered.css"), toLayered(full));
  // 全局规则（减少动效、选中色、输入光标）：不是变量，单独一份
  const base = readFileSync(join(root, "base.css"), "utf8");
  writeFileSync(join(dist, "base.css"), `/* @xxd/tokens base — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). MIT License. */\n${base}`);

  const json = {};
  for (const [selector, vars] of Object.entries(blocks)) {
    // 一个块可以写成「:root[data-x], [data-x]」（整页或页面里的一块都生效）：按第一个选择器认
    const [first, second, ...more] = splitSelectors(selector);
    const pair = !more.length && second && second === first.replace(/^:root/, "") ? MODE_NAMES[first] : null;
    const name = MODE_NAMES[selector] || pair || (selector === ":root" ? "base" : null);
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

  const common = { bundle: true, target: "es2020", legalComments: "none", banner: { js: "/* @xxd/tokens — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). MIT License. */" } };
  await build({ ...common, entryPoints: [join(root, "src/boot.js")], format: "iife", minify: true, outfile: join(dist, "boot.js") });
  await build({ ...common, entryPoints: [join(root, "src/index.js")], format: "esm", outfile: join(dist, "theme.js") });
  console.log(`@xxd/tokens: ${names.length} tokens → dist/`);
}
