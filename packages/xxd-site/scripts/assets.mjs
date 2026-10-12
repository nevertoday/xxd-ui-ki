// 展示站的静态资源：
//   public/xxd/      @xxd/css 的构建产物（boot.js、xxd.css、xxd.js、icons.js）
//   public/xxd/kumo.css  React 组件的预编译样式（@cloudflare/kumo standalone，Kumo 换皮版）
//   public/xxd/forced-states.css  状态矩阵用：把组件 CSS 里的 :hover / :focus-visible / :active 复制成 [data-force~="…"] 版本，
//                                 这样「悬停 / 聚焦 / 按下」可以静态并排展示，用的是真实的组件规则而不是手写的模仿。
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkgs = join(here, "../..");
const out = join(here, "../public/xxd");
mkdirSync(out, { recursive: true });

const cssDist = join(pkgs, "xxd-css/dist");
if (!existsSync(join(cssDist, "xxd.js"))) execFileSync("node", ["scripts/build.mjs"], { cwd: join(pkgs, "xxd-css"), stdio: "inherit" });
for (const f of ["boot.js", "xxd.css", "xxd.js", "icons.js"]) copyFileSync(join(cssDist, f), join(out, f));

const kumoCss = join(pkgs, "kumo/dist/styles/kumo-standalone.css");
if (existsSync(kumoCss)) copyFileSync(kumoCss, join(out, "kumo.css"));
else console.warn("！没有 kumo-standalone.css：先运行 pnpm --filter @cloudflare/kumo build（React 演示会没有样式）");

/** 把 :hover / :focus-visible / :active 规则复制成强制状态版本。只处理选择器，不动声明。 */
export function forceStates(css) {
  const PSEUDO = { ":hover": "hover", ":focus-visible": "focus", ":active": "active" };
  const out = [];
  let i = 0;
  const depthStack = [];
  // 逐个读出「选择器 { 声明 }」；@media / @layer / @supports 往里走。
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const close = css.indexOf("}", i);
    if (close !== -1 && close < open) {
      depthStack.pop();
      i = close + 1;
      continue;
    }
    const prelude = css.slice(i, open).trim().replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (prelude.startsWith("@")) {
      if (/^@(media|layer|supports|container)/.test(prelude)) {
        depthStack.push(prelude);
        i = open + 1;
        continue;
      }
      // @keyframes / @font-face / @starting-style 等：整块跳过
      let depth = 1;
      let j = open + 1;
      while (j < css.length && depth) {
        if (css[j] === "{") depth += 1;
        else if (css[j] === "}") depth -= 1;
        j += 1;
      }
      i = j;
      continue;
    }
    const end = css.indexOf("}", open);
    const body = css.slice(open + 1, end);
    const selectors = prelude.split(/,(?![^(]*\))/).map((x) => x.trim());
    const forced = [];
    for (const sel of selectors) {
      let next = sel;
      let touched = false;
      for (const [pseudo, name] of Object.entries(PSEUDO)) {
        if (next.includes(pseudo)) {
          next = next.split(pseudo).join(`[data-force~="${name}"]`);
          touched = true;
        }
      }
      if (touched && !next.includes(":not([data-force")) forced.push(`.xxd-force-scope ${next}`);
    }
    if (forced.length) {
      const media = depthStack.filter((p) => p.startsWith("@media") || p.startsWith("@supports"));
      let rule = `${forced.join(",\n")} {${body}}`;
      for (const m of media.reverse()) rule = `${m} {\n${rule}\n}`;
      out.push(rule);
    }
    i = end + 1;
  }
  return `/* 由 scripts/assets.mjs 生成：状态矩阵用的强制状态（请勿手改） */\n@layer xxd.components {\n${out.join("\n")}\n}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const components = readFileSync(join(cssDist, "components.css"), "utf8");
  writeFileSync(join(out, "forced-states.css"), forceStates(components));
  console.log("xxd-site assets → public/xxd/");
}
