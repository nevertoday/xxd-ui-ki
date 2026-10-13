#!/usr/bin/env node
// 小小东 UI Kit 命令行。在仓库里：pnpm xxd <命令>；装成全局（pnpm xxd link）之后：xxd-ui <命令>。
// 全部命令和说明在 scripts/commands.mjs（help 和展示站都从那里生成）；pnpm xxd help 看全部。
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, statSync, symlinkSync, watch, writeFileSync, accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { parseBlocks } from "../../xxd-tokens/scripts/build.mjs";
import { COMMANDS, GROUPS } from "./commands.mjs";
import { c, columns, copy, openUrl, suggest } from "./lib/term.mjs";
import { forgetProject, isProject, listProjects, rememberProject } from "./lib/projects.mjs";
import { catalog, findComponent, iconAs, listTokens, pageUrl, searchIcons } from "./lib/find.mjs";
import { RULES, doctor } from "./lib/doctor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(here, "..");
const repo = resolve(pkgDir, "../..");
const cssDir = join(repo, "packages/xxd-css");

// tokens.css：只要令牌（老插件逐步迁移时先换这一层）；xxd.css：令牌 + 全部组件。
const VENDOR_FILES = ["tokens.css", "xxd.css", "xxd.shadow.css", "xxd.js", "boot.js", "icons.js", "extension.js"];

function git(args) {
  try {
    return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function currentVersion() {
  const pkg = JSON.parse(readFileSync(join(cssDir, "package.json"), "utf8"));
  const commit = git(["rev-parse", "--short", "HEAD"]) || "unknown";
  const dirty = git(["status", "--porcelain", "--", "packages/xxd-tokens", "packages/xxd-icons", "packages/xxd-css", "packages/xxd-extension"]) ? "+dirty" : "";
  return { version: pkg.version, commit: commit + dirty };
}

export async function buildAll({ quiet = false } = {}) {
  // 令牌和图标每次都重新构建：xxd-css 的构建只在它们没有 dist 时才补，改了 tokens.css 或图标再 sync 会拷到旧的
  for (const pkg of ["xxd-tokens", "xxd-icons", "xxd-css"]) execFileSync("node", ["scripts/build.mjs"], { cwd: join(repo, "packages", pkg), stdio: quiet ? "ignore" : "inherit" });
  mkdirSync(join(pkgDir, "dist"), { recursive: true });
  await build({
    entryPoints: [join(pkgDir, "src/global.js")],
    bundle: true,
    format: "iife",
    minify: true,
    target: "es2020",
    legalComments: "none",
    banner: { js: "/* @xxd/extension — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). MIT License. */" },
    outfile: join(pkgDir, "dist/extension.js"),
  });
}

const REGION_START = "/* xxd:tokens:start —— 由 xxd-ui-kit 生成（pnpm xxd sync），这一段请勿手改 */";
const REGION_END = "/* xxd:tokens:end */";

/** 把一段内容放进文件开头的标记区域里（已有就替换）。 */
export function upsertRegion(text, body) {
  const block = `${REGION_START}\n${body.trim()}\n${REGION_END}\n`;
  // 只认固定的开头：标记里的说明文字改过（比如项目改名前写的是 xxd-ui-ki），老项目里的那一段也要认得出来
  const start = text.search(/\/\* xxd:tokens:start\b[^]*?\*\//);
  const end = text.indexOf(REGION_END);
  if (start !== -1 && end > start) return text.slice(0, start) + block + text.slice(end + REGION_END.length).replace(/^\n/, "");
  // @charset / @import 必须在最前面：放在它们后面
  const lead = text.match(/^(?:\s*@(?:charset|import)[^;]+;\s*)*/)[0];
  return lead + block + (lead ? "" : "\n") + text.slice(lead.length);
}

/**
 * xxd.config.json（放在项目根目录，插件或网站都行）：
 *   vendorDir          组件拷到哪（插件默认 "vendor/xxd"；网站写 false 表示不拷）
 *   tokensTargets      把 tokens.css 原样写到这些路径（老路径不想改时）
 *   layeredTokensRegions  把 layered 令牌写进这些 CSS 文件开头的标记区域（已有一套变量的老项目：老变量永远优先）
 *   iconNodesTargets   把图标数据（@xxd/icons/src/nodes.js）写到这些路径
 */
/**
 * 老项目里「用了但自己没声明」的变量（靠 var(--x, 后备值) 或干脆无效）：我们一声明，它们的样子就会变。
 * layered 令牌默认跳过这些名字，并打印出来，统一它们是另一件需要人决定的事。
 */
export function findFallbackConflicts(dir, tokenNames) {
  const declared = new Set();
  const used = new Set();
  const visit = (d) => {
    for (const name of readdirSync(d)) {
      if (/^(node_modules|\.git|dist|vendor)$/.test(name)) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) visit(p);
      else if (/\.(css|js|mjs|html)$/.test(name) && !/\.[a-f0-9]{10}\.(css|js)$/.test(name) && st.size < 4_000_000) {
        const text = readFileSync(p, "utf8").replace(/\/\* xxd:tokens:start[\s\S]*?xxd:tokens:end \*\//, "");
        for (const m of text.matchAll(/(--[a-zA-Z][\w-]*)\s*:/g)) declared.add(m[1]);
        for (const m of text.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) declared.add(m[1]);
        for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) used.add(m[1]);
      }
    }
  };
  visit(dir);
  return tokenNames.filter((t) => used.has(t) && !declared.has(t));
}

/** 从一段 CSS 里去掉这些自定义属性的声明。 */
export function dropDeclarations(css, names) {
  if (!names.length) return css;
  const re = new RegExp(`^\\s*(?:${names.map((n) => n.replace(/[-]/g, "\\-")).join("|")})\\s*:[^;]*;\\s*$\\n?`, "gm");
  return css.replace(re, "");
}

/**
 * 老项目接过令牌之后的第二步（「改为引入 @xxd/tokens，旧名先做别名」）：
 * - :root 与 :root[data-theme="dark"] 里，亮暗两种值都与令牌相同的变量 → 删掉，改由令牌提供；
 *   只要有一种模式不同就保留（否则老项目没进 layer 的亮色声明会在暗色里继续生效）。
 * - aliases：{ "--ui-radius": "var(--r-md)" } 把旧名的值换成指向令牌（只在亮暗值都不变时才该写）。
 * 返回 { css, removed, aliased }。只动 xxd:tokens 区域之外的那两个块。
 */
export function adoptTokens(css, { tokensCss, parseBlocks, aliases = {}, darkSelector = ':root[data-theme="dark"]' }) {
  const regionEnd = css.indexOf("/* xxd:tokens:end */");
  const head = regionEnd === -1 ? "" : css.slice(0, regionEnd + "/* xxd:tokens:end */".length);
  let body = regionEnd === -1 ? css : css.slice(head.length);
  const ours = parseBlocks(tokensCss);
  const oursLight = ours[":root"];
  const oursDark = { ...oursLight, ...ours[':root[data-theme="dark"]'] };
  const theirs = parseBlocks(body);
  const theirLight = theirs[":root"] || {};
  const theirDark = { ...theirLight, ...(theirs[darkSelector] || {}) };
  const removed = Object.keys(theirLight).filter(
    (k) => k in oursLight && !(k in aliases) && theirLight[k] === oursLight[k] && theirDark[k] === oursDark[k],
  );
  const firstBlock = (sel) => {
    const re = new RegExp(`(^|\\n)${sel.replace(/[[\]"().*+?^$|\\]/g, "\\$&")}\\s*\\{`, "");
    const m = re.exec(body);
    if (!m) return null;
    const start = m.index + m[0].length;
    const end = body.indexOf("}", start);
    return { start, end };
  };
  const rewrite = (sel, fn) => {
    const b = firstBlock(sel);
    if (!b) return;
    body = body.slice(0, b.start) + fn(body.slice(b.start, b.end)) + body.slice(b.end);
  };
  const dropLines = (text) => removed.reduce((t, k) => t.replace(new RegExp(`\\n[ \\t]*${k}\\s*:[^;]*;[^\\n]*`), ""), text);
  const aliased = [];
  rewrite(":root", (text) => {
    let t = dropLines(text);
    for (const [k, v] of Object.entries(aliases)) {
      const next = t.replace(new RegExp(`(\\n[ \\t]*${k}\\s*:)[^;]*;`), `$1 ${v}; /* 别名 → @xxd/tokens */`);
      if (next !== t) aliased.push(k);
      t = next;
    }
    return t;
  });
  rewrite(darkSelector, dropLines);
  return { css: head + body, removed, aliased };
}

function readConfig(dir) {
  const file = join(dir, "xxd.config.json");
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

export function sync(target, { quiet = false } = {}) {
  const dir = resolve(target);
  const config = readConfig(dir) ?? {};
  const isExtension = existsSync(join(dir, "manifest.json"));
  if (!isExtension && !existsSync(join(dir, "xxd.config.json"))) throw new Error(`${dir} 里既没有 manifest.json 也没有 xxd.config.json`);
  const vendorRel = config.vendorDir ?? (isExtension ? "vendor/xxd" : false);
  const vendor = vendorRel ? join(dir, vendorRel) : null;
  if (vendor) mkdirSync(vendor, { recursive: true });
  for (const f of vendor ? VENDOR_FILES : []) {
    const from =
      f === "extension.js" ? join(pkgDir, "dist/extension.js") : f === "tokens.css" ? join(repo, "packages/xxd-tokens/dist/tokens.css") : join(cssDir, "dist", f);
    if (!existsSync(from)) throw new Error(`缺少 ${relative(repo, from)}，先运行 pnpm xxd:build`);
    cpSync(from, join(vendor, f));
  }
  // xxd-chrome-publish 把 vendor/ 下的文件当第三方代码检查许可：放一份整个目录的 LICENSE。
  if (vendor) writeFileSync(
    join(vendor, "LICENSE"),
    "小小东 UI Kit（xxd-ui-kit）的构建产物：设计令牌、原生组件、图标与插件套件。\n\n" +
      readFileSync(join(repo, "LICENSE"), "utf8"),
  );
  const v = currentVersion();
  // 老项目的令牌文件路径不想改（测试、网站都引用它）：xxd.config.json 里写 { "tokensTargets": ["src/xxd-theme.css"] }，
  // sync 会把同一份 tokens.css 也写到那些路径，开头注明来源。
  const tokens = readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.css"), "utf8");
  for (const rel of config.tokensTargets ?? []) {
    const out = join(dir, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `/* 由 xxd-ui-kit 生成（pnpm xxd sync），请勿手改；来源 packages/xxd-tokens/tokens.css @ ${v.commit} */\n${tokens}`);
  }
  if (config.layeredTokensRegions?.length) {
    const names = Object.keys(JSON.parse(readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.json"), "utf8")).base);
    const skip = [...new Set([...findFallbackConflicts(dir, names), ...(config.layeredTokensExclude ?? [])])].sort();
    if (skip.length && !quiet) console.log(`  跳过 ${skip.length} 个令牌（项目里用了但没声明，声明了会改变现在的样子）：${skip.join(" ")}`);
    const layered = dropDeclarations(readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.layered.css"), "utf8"), skip);
    for (const rel of config.layeredTokensRegions) {
      const out = join(dir, rel);
      const note = skip.length ? `/* 跳过：${skip.join(" ")}（见 xxd-ui-kit docs/member-site.md） */\n` : "";
      writeFileSync(out, upsertRegion(readFileSync(out, "utf8"), `/* @xxd ${v.version} ${v.commit} */\n${note}${layered}`));
    }
  }
  for (const rel of config.iconNodesTargets ?? []) {
    const out = join(dir, rel);
    mkdirSync(dirname(out), { recursive: true });
    const nodes = readFileSync(join(repo, "packages/xxd-icons/src/nodes.js"), "utf8");
    writeFileSync(out, `// 由 xxd-ui-kit 生成（pnpm xxd sync），请勿手改；来源 packages/xxd-icons/src/nodes.js @ ${v.commit}\n${nodes}`);
  }
  if (!vendor) {
    if (!quiet) console.log(`✓ ${basename(dir)} ← @xxd ${v.version} (${v.commit})`);
    return v;
  }
  writeFileSync(
    join(vendor, "VERSION"),
    `@xxd/css ${v.version}\ncommit ${v.commit}\nsynced ${new Date().toISOString()}\nsource xxd-ui-kit（请勿手改这个目录，用 pnpm xxd sync 更新）\n`,
  );
  if (!quiet) console.log(`✓ ${basename(dir)} ← @xxd ${v.version} (${v.commit})`);
  return v;
}

export function status(target) {
  const vendorRel = readConfig(resolve(target))?.vendorDir ?? "vendor/xxd";
  if (vendorRel === false) return { target, state: "只用令牌（不拷组件）" };
  const file = join(resolve(target), vendorRel, "VERSION");
  const now = currentVersion();
  if (!existsSync(file)) return { target, state: "未接入" };
  const text = readFileSync(file, "utf8");
  const version = text.match(/@xxd\/css (\S+)/)?.[1];
  const commit = text.match(/commit (\S+)/)?.[1];
  const state = commit === now.commit ? "最新" : `落后（当前 ${now.version} ${now.commit}）`;
  return { target, version, commit, state };
}

function walk(dir, fn) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, fn);
    else fn(p);
  }
}

const toSlug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "xxd-ext";

/** 简体 → 繁体的极小对照（模板里的名字常用字）；完整转换交给 opencc。 */
const HANT = { 发: "發", 图: "圖", 片: "片", 链: "鏈", 接: "接", 记: "記", 录: "錄", 设: "設", 置: "置", 长: "長", 文: "文", 东: "東", 写: "寫", 批: "批", 量: "量", 存: "存", 办: "辦", 待: "待", 今: "今", 日: "日", 排: "排", 序: "序", 标: "標", 题: "題", 生: "生", 成: "成", 换: "換", 识: "識", 别: "別" };
const toHant = (s) => [...s].map((c) => HANT[c] || c).join("");

export async function create(target, { name, nameEn, slug, desc, descEn } = {}) {
  const dir = resolve(target);
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} 已存在且不为空`);
  if (!name) throw new Error("需要 --name（四个朴素的字说清它做什么，比如「长文发布」）");
  const values = {
    __APP_NAME__: name,
    __APP_NAME_HANT__: toHant(name),
    __APP_NAME_EN__: nameEn || name,
    __APP_DESC__: desc || `${name}——小小东出品的 Chrome 插件。`,
    __APP_DESC_EN__: descEn || `${nameEn || name} — a Chrome extension by XXD.`,
    __SLUG__: slug || toSlug(nameEn || "") || "xxd-ext",
  };
  mkdirSync(dir, { recursive: true });
  cpSync(join(pkgDir, "template"), dir, { recursive: true });
  walk(dir, (file) => {
    if (!/\.(json|html|js|css|md)$/.test(file)) return;
    let text = readFileSync(file, "utf8");
    for (const [k, v] of Object.entries(values)) text = text.replaceAll(k, v);
    writeFileSync(file, text);
  });
  writeFileSync(
    join(dir, "README.md"),
    `# ${name}\n\n用小小东 UI Kit（xxd-ui-kit）生成。\n\n- 在 chrome://extensions 打开「开发者模式」→「加载已解压的扩展程序」→ 选这个目录\n- 更新组件：在 xxd-ui-kit 里运行 \`pnpm xxd sync ${dir}\`\n- 设计原则：xxd-ui-kit/docs/DESIGN-PRINCIPLES.md\n- 图标：manifest 里还没有 icons，上架前补上（16/32/48/128）\n`,
  );
  sync(dir, { quiet: true });
  console.log(`✓ 新建 ${name} → ${dir}`);
  return dir;
}

function loadRegistries() {
  const native = JSON.parse(readFileSync(join(cssDir, "registry.json"), "utf8")).components;
  const reactFile = join(repo, "packages/kumo/ai/component-registry.json");
  const react = existsSync(reactFile) ? JSON.parse(readFileSync(reactFile, "utf8")).components : {};
  return { native, react };
}

/** 组件和模式列表；filter 按分类、英文名、中文名过滤。 */
export function listComponents(filter = "") {
  const { react } = loadRegistries();
  const f = String(filter).trim().toLowerCase();
  const items = catalog().filter((x) => !f || x.category.toLowerCase().includes(f) || x.name.toLowerCase().includes(f) || x.zh.includes(filter));
  const lines = [];
  const byCat = new Map();
  for (const x of items) byCat.set(x.category, [...(byCat.get(x.category) || []), x]);
  for (const [cat, list] of byCat) {
    lines.push(c.bold(cat === "模式" ? "模式（几个组件拼成的固定做法）" : cat));
    lines.push(columns(list.map((x) => [`  ${x.name}`, x.zh, x.react ? c.dim(`React: ${x.react}`) : ""])));
  }
  if (!items.length) return `没有和「${filter}」相关的组件。${BIN} ls 看全部`;
  const reactNames = Object.keys(react);
  if (!f && reactNames.length) lines.push("", c.bold(`React 组件（@xxd/react，Kumo 换皮版，${reactNames.length} 个）`), `  ${reactNames.join(" ")}`);
  return lines.join("\n");
}

/** 一个组件（或模式）的用法。找不到时抛错并给出最像的几个。 */
export function docComponent(name, { react: wantReact = false, markup = false } = {}) {
  const { react } = loadRegistries();
  if (wantReact) {
    const key = String(name || "").toLowerCase();
    const entry = Object.values(react).find((x) => x.name.toLowerCase() === key);
    if (!entry) {
      const near = suggest(name, Object.values(react).map((x) => x.name));
      throw new Error(`没有叫 ${name} 的 React 组件${near.length ? `，是不是 ${near.join(" / ")}` : ""}（${BIN} ls 看全部）`);
    }
    const props = Object.entries(entry.props || {}).map(([p, v]) => `  ${p}${v.optional ? "?" : ""}: ${v.values ? v.values.join(" | ") : v.type}${v.default ? `（缺省 ${v.default}）` : ""}`);
    return [`${entry.name} — ${entry.description ?? ""}`, `import { ${entry.name} } from "@xxd/react";`, "", "props", ...props].join("\n");
  }
  const { exact, matches, near } = findComponent(name);
  if (!exact) {
    if (near && matches.length) throw new Error(`没有叫 ${name} 的组件，是不是 ${matches.map((x) => `${x.name}（${x.zh}）`).join(" / ")}`);
    if (matches.length) throw new Error(`「${name}」对上了 ${matches.length} 个：${matches.slice(0, 8).map((x) => `${x.name}（${x.zh}）`).join("、")}`);
    throw new Error(`没有叫 ${name} 的组件或模式（${BIN} ls 看全部；React 版加 --react）`);
  }
  const x = exact;
  if (markup) return x.markup.trim();
  const out = [`${c.bold(`${x.name} · ${x.zh}`)}（${x.category}）`];
  if (x.summary) out.push("", x.summary);
  out.push("", c.bold("类名"), `  ${x.classes.join(" ")}`);
  if (x.attributes) out.push("", c.bold("属性"), ...Object.entries(x.attributes).map(([k, v]) => `  ${k}: ${v}`));
  out.push("", c.bold("示例"), ...x.markup.split("\n").map((l) => `  ${l}`));
  if (x.js) out.push("", c.bold("JS"), ...x.js.split("\n").map((l) => `  ${l}`));
  if (x.rules?.length) out.push("", c.bold("规则（docs/DESIGN-PRINCIPLES.md）"), ...x.rules.map((r) => `  · ${r}`));
  if (x.react) out.push("", `React 版：${x.react}（${BIN} doc ${x.react.split(" ")[0]} --react）`);
  out.push("", c.dim(`展示站：${pageUrl(x.name)}`));
  return out.join("\n");
}

/** 让已有的项目接入：写 xxd.config.json（需要时）、拷组件、记住它。返回要加进 <head> 的几行。 */
export function init(target, { vendor, noVendor = false, quiet = false } = {}) {
  const dir = resolve(target);
  if (!existsSync(dir)) throw new Error(`${dir} 不存在`);
  const isExtension = existsSync(join(dir, "manifest.json"));
  const configFile = join(dir, "xxd.config.json");
  let config = existsSync(configFile) ? JSON.parse(readFileSync(configFile, "utf8")) : null;
  const wanted = noVendor ? false : vendor || (isExtension ? "vendor/xxd" : existsSync(join(dir, "public")) ? "public/vendor/xxd" : "vendor/xxd");
  if (!config && (!isExtension || wanted !== "vendor/xxd")) {
    config = { vendorDir: wanted };
    writeFileSync(configFile, JSON.stringify(config, null, 2) + "\n");
    if (!quiet) console.log(`✓ 写了 xxd.config.json（组件放在 ${wanted || "不拷，只用令牌"}）`);
  }
  sync(dir, { quiet });
  rememberProject(dir);
  const v = (config?.vendorDir ?? "vendor/xxd") || "";
  const base = v.replace(/^public\//, "");
  const key = `${toSlug(basename(dir))}-ui`;
  return [
    "<head>",
    `  <script src="${base}/boot.js" data-key="${key}"></script>`,
    `  <link rel="stylesheet" href="${base}/xxd.css">`,
    `  <script src="${base}/icons.js"></script>`,
    `  <script src="${base}/xxd.js"></script>`,
    ...(isExtension ? [`  <script src="${base}/extension.js"></script>`] : []),
    "</head>",
    '<body class="xxd-page">',
  ].join("\n");
}

/** 找一个在 PATH 里、能写的目录放全局命令。 */
function binDir() {
  const path = (process.env.PATH || "").split(":");
  const home = homedir();
  for (const d of [join(home, ".local/bin"), join(home, "bin"), "/opt/homebrew/bin", "/usr/local/bin"]) {
    if (!path.includes(d) || !existsSync(d)) continue;
    try {
      accessSync(d, constants.W_OK);
      return { dir: d, inPath: true };
    } catch {
      // 换下一个
    }
  }
  return { dir: join(home, ".local/bin"), inPath: false };
}

export function link() {
  const self = fileURLToPath(import.meta.url);
  chmodSync(self, 0o755);
  const { dir, inPath } = binDir();
  mkdirSync(dir, { recursive: true });
  const target = join(dir, "xxd-ui");
  let exists = false;
  try {
    exists = Boolean(lstatSync(target));
  } catch {
    // 不存在
  }
  if (exists) {
    const current = lstatSync(target).isSymbolicLink() ? resolve(dir, readlinkSync(target)) : null;
    if (current === self) return `已经装好了：${target}`;
    throw new Error(`${target} 已经有别的东西了，先看一眼再删`);
  }
  symlinkSync(self, target);
  return inPath ? `✓ 装好了：${target}。在任何目录都可以用 xxd-ui 了` : `✓ 放在了 ${target}，但 ${dir} 不在 PATH 里：在 ~/.zshrc 加一行 export PATH="$HOME/.local/bin:$PATH"`;
}

function help(name) {
  const lines = [];
  if (name) {
    const cmd = COMMANDS.find((x) => x.name === name);
    if (!cmd) return unknown(name);
    lines.push(`${c.bold(`${BIN} ${cmd.usage}`)}`, "", cmd.zh, "", c.bold("例子"), ...cmd.examples.map((e) => `  ${BIN} ${e}`));
    return lines.join("\n");
  }
  lines.push(`${c.bold("小小东 UI Kit 命令行")}  ${c.dim(`（${BIN} help <命令> 看用法和例子）`)}`);
  for (const g of GROUPS) {
    lines.push("", c.bold(g.zh));
    const w = Math.max(...COMMANDS.map((x) => x.name.length)) + 4;
    lines.push(...COMMANDS.filter((x) => x.group === g.id).map((x) => `  ${x.name.padEnd(w)}${x.zh}`));
  }
  lines.push("", c.dim(`展示站：${pageUrl("tools")}`));
  return lines.join("\n");
}

function unknown(name) {
  const near = suggest(name, COMMANDS.map((x) => x.name));
  return `没有 ${name} 这个命令${near.length ? `，是不是 ${near.map((n) => c.bold(n)).join(" / ")}` : ""}。${BIN} help 看全部`;
}

// 这些开关不带值：后面跟的词是参数，不是它的值（icon 购物车 --svg 删除 ……）
const BOOLEAN = new Set(["all", "json", "react", "markup", "copy", "svg", "js", "html", "en", "noVendor", "help", "list"]);

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h") out.help = true;
    else if (a.startsWith("--")) {
      const [rawKey, inline] = a.slice(2).split(/=(.*)/s);
      const key = rawKey.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      if (inline !== undefined) out[key] = inline;
      else if (BOOLEAN.has(key)) out[key] = true;
      else out[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else out._.push(a);
  }
  return out;
}

const BIN = process.env.npm_lifecycle_event === "xxd" ? "pnpm xxd" : "xxd-ui";

function printStatus(targets) {
  const rows = targets.map((t) => {
    if (!existsSync(t)) return [basename(t), "", c.red("目录不在了"), c.dim(`${BIN} projects --forget ${t}`)];
    const s = status(t);
    const state = s.state === "最新" ? c.green("最新") : s.state === "未接入" ? c.yellow("未接入") : c.yellow(s.state);
    return [basename(t), s.version ? `${s.version} ${s.commit}` : "", state, c.dim(t)];
  });
  console.log(columns(rows));
}

function printDoctor(result) {
  const { findings, dir, kind } = result;
  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.length - errors;
  console.log(`${c.bold(basename(dir))} ${c.dim(`（${kind === "extension" ? "插件" : kind === "site" ? "网站" : "没认出是插件还是网站"}）`)}`);
  const byFile = new Map();
  for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) || []), f]);
  for (const [file, list] of byFile) {
    console.log(`\n${c.cyan(file)}`);
    // 同一个文件里同一条规则太多时只列前 6 条
    const perRule = {};
    for (const f of list.sort((a, b) => (a.line || 0) - (b.line || 0))) {
      perRule[f.rule] = (perRule[f.rule] || 0) + 1;
      if (perRule[f.rule] === 7) console.log(c.dim(`  …${RULES[f.rule] || f.rule}还有 ${list.filter((x) => x.rule === f.rule).length - 6} 处`));
      if (perRule[f.rule] > 6) continue;
      const tag = f.level === "error" ? c.red("错误") : c.yellow("提醒");
      console.log(`  ${c.dim(String(f.line || "").padStart(4))}  ${tag}  ${c.dim(`[${RULES[f.rule] || f.rule}]`)} ${f.message}`);
    }
  }
  console.log("");
  if (!findings.length) console.log(c.green("✓ 没发现问题"));
  else console.log(`${errors ? c.red(`${errors} 个错误`) : c.green("0 个错误")}，${warns} 个提醒${c.dim("　某一行是有意的例外：在那一行写 xxd-ignore")}`);
  return errors;
}

async function main() {
  const [cmd = "help", ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  // pnpm 在仓库根目录执行脚本；相对路径按调用者的目录解析
  const cwd = process.env.INIT_CWD || process.cwd();
  const targets = args._.map((t) => resolve(cwd, t.replace(/^~(?=\/|$)/, homedir())));
  if (args.help && cmd !== "help") return console.log(help(cmd));
  if (cmd === "help" || cmd === "--help" || cmd === "-h") {
    console.log(help(args._[0]));
  } else if (cmd === "new") {
    if (!targets[0]) throw new Error(`用法：${BIN} new <目录> --name 名字`);
    await buildAll({ quiet: true });
    const dir = await create(targets[0], args);
    rememberProject(dir);
    console.log(c.dim(`下一步：chrome://extensions →「加载已解压的扩展程序」→ 选 ${dir}；改完跑 ${BIN} doctor ${dir}`));
  } else if (cmd === "init") {
    const dir = targets[0] || cwd;
    await buildAll({ quiet: true });
    const head = init(dir, { vendor: args.vendor, noVendor: args.noVendor });
    console.log(`\n把这几行放进页面（路径按页面所在位置调整）：\n\n${head}\n`);
    console.log(c.dim(`以后：${BIN} sync 更新组件，${BIN} doctor 体检`));
  } else if (cmd === "sync") {
    let list = targets;
    if (args.all) list = listProjects().filter((p) => existsSync(p));
    else if (!list.length) list = [cwd];
    if (!list.length) throw new Error(`还没有记住的项目。先 ${BIN} init <目录> 或 ${BIN} sync <目录>`);
    await buildAll({ quiet: true });
    for (const t of list) {
      sync(t);
      rememberProject(t);
    }
  } else if (cmd === "status") {
    let list = targets;
    if (!list.length) {
      list = listProjects();
      if (isProject(cwd) && !list.includes(cwd)) list.unshift(cwd);
    }
    if (!list.length) return console.log(`还没有记住的项目。${BIN} status <目录…>，或先 ${BIN} init / sync 一次`);
    printStatus(list);
  } else if (cmd === "doctor" || cmd === "check") {
    const result = doctor(targets[0] || cwd, { now: currentVersion(), bin: BIN });
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else if (printDoctor(result)) process.exitCode = 1;
    if (args.json && result.findings.some((f) => f.level === "error")) process.exitCode = 1;
  } else if (cmd === "watch") {
    if (!targets.length) throw new Error(`用法：${BIN} watch <项目目录…>`);
    const sources = ["packages/xxd-tokens/tokens.css", "packages/xxd-icons/src", "packages/xxd-css/src", "packages/xxd-extension/src"].map((p) => join(repo, p));
    let timer = null;
    let running = false;
    const run = async (why) => {
      if (running) return;
      running = true;
      const t0 = Date.now();
      try {
        await buildAll({ quiet: true });
        for (const t of targets) sync(t, { quiet: true });
        console.log(`${c.green("✓")} ${new Date().toLocaleTimeString()} ${why ? c.dim(why) + " → " : ""}已同步 ${targets.length} 个项目（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
      } catch (err) {
        console.log(`${c.red("✗")} ${err.message}`);
      }
      running = false;
    };
    await run();
    for (const src of sources) {
      watch(src, { recursive: true }, (_, file) => {
        clearTimeout(timer);
        timer = setTimeout(() => run(relative(repo, join(src.endsWith(".css") ? dirname(src) : src, file || ""))), 250);
      });
    }
    console.log(c.dim(`盯着 tokens、图标、组件、插件套件的源码；Ctrl+C 停`));
  } else if (cmd === "projects") {
    if (args.forget) {
      const dir = resolve(cwd, String(args.forget).replace(/^~(?=\/|$)/, homedir()));
      console.log(forgetProject(dir) ? `✓ 不再记 ${dir}` : `本来就没记 ${dir}`);
    } else {
      const list = listProjects();
      if (!list.length) console.log(`还没有记住的项目（new / init / sync 过的会自动记住）`);
      else printStatus(list);
    }
  } else if (cmd === "ls") {
    console.log(listComponents(args._.join(" ")));
  } else if (cmd === "doc") {
    if (!args._.length) throw new Error(`用法：${BIN} doc <组件>（中文名也行，比如 ${BIN} doc 对话框）`);
    const text = docComponent(args._.join(" "), { react: Boolean(args.react), markup: Boolean(args.markup) });
    console.log(text);
    if (args.copy) console.error(copy(args.markup ? text : docComponent(args._.join(" "), { markup: true })) ? c.green("✓ 示例代码已复制") : c.yellow("没能复制（找不到剪贴板工具）"));
  } else if (cmd === "icon" || cmd === "icons") {
    const format = args.svg ? "svg" : args.react ? "react" : args.js ? "js" : args.html ? "html" : null;
    const results = searchIcons(args._.join(" "));
    if (!args._.length && !format) {
      console.log(`${results.length} 个图标。${BIN} icon <关键词>，比如 ${BIN} icon 删除；看图：${BIN} open icons`);
      return;
    }
    if (!results.length) {
      console.log(`没有和「${args._.join(" ")}」相关的图标。换个词，或者看全部：${BIN} open icons`);
      process.exitCode = 1;
      return;
    }
    const exact = results[0].name.toLowerCase() === args._.join(" ").toLowerCase() || results[0].aliases.some((a) => a.toLowerCase() === args._.join(" ").toLowerCase());
    if (format || results.length === 1 || exact) {
      const top = results[0];
      const code = iconAs(top.name, format || "html");
      console.log(code);
      if (results.length > 1 && !exact) console.error(c.dim(`（最像的是 ${top.name}；还有 ${results.slice(1, 6).map((r) => r.name).join(" ")}…）`));
      if (args.copy) console.error(copy(code) ? c.green(`✓ 已复制 ${top.name}`) : c.yellow("没能复制（找不到剪贴板工具）"));
      return;
    }
    const shown = results.slice(0, 30);
    console.log(columns(shown.map((r) => [r.name, c.dim(r.group), r.keywords])));
    if (results.length > shown.length) console.log(c.dim(`…还有 ${results.length - shown.length} 个，多加一个词缩小范围`));
    console.log(c.dim(`\n要哪个：${BIN} icon ${shown[0].name}（加 --svg / --react / --copy）`));
  } else if (cmd === "tokens") {
    const list = listTokens(args._.join(" "));
    if (args.json) return console.log(JSON.stringify(list, null, 2));
    const swatch = (v) => {
      const m = /^#([0-9a-f]{6})$/i.exec(v || "");
      if (!m || !process.stdout.isTTY || process.env.NO_COLOR) return "";
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      return `\x1b[48;2;${r};${g};${b}m  \x1b[0m `;
    };
    console.log(columns([[c.dim("令牌"), c.dim("亮色"), c.dim("暗色"), c.dim("圆角 / 紧凑")], ...list.map((t) => [t.name, `${swatch(t.light)}${t.light}`, t.dark && t.dark !== t.light ? `${swatch(t.dark)}${t.dark}` : "", t.rounded || t.compact || ""])]));
  } else if (cmd === "open") {
    const q = args._.join(" ");
    const url = pageUrl(q, { en: Boolean(args.en) });
    if (!url) {
      const near = suggest(q, catalog().map((x) => x.name));
      throw new Error(`展示站上没有「${q}」${near.length ? `，是不是 ${near.join(" / ")}` : ""}`);
    }
    console.log(url);
    openUrl(url);
  } else if (cmd === "adopt") {
    const dir = targets[0];
    if (!dir) throw new Error(`用法：${BIN} adopt <项目目录>`);
    const config = readConfig(dir)?.adopt;
    if (!config?.file) throw new Error("xxd.config.json 里需要 adopt: { file, aliases }");
    const file = join(dir, config.file);
    const result = adoptTokens(readFileSync(file, "utf8"), {
      tokensCss: readFileSync(join(repo, "packages/xxd-tokens/tokens.css"), "utf8"),
      parseBlocks,
      aliases: config.aliases,
      darkSelector: config.darkSelector,
    });
    writeFileSync(file, result.css);
    console.log(`✓ 改由令牌提供（删掉 ${result.removed.length} 个相同的声明）：${result.removed.join(" ")}`);
    console.log(`✓ 旧名改为别名：${result.aliased.join(" ") || "（无）"}`);
  } else if (cmd === "add" || cmd === "blocks") {
    const kumoCli = join(repo, "packages/kumo/dist/command-line/cli.js");
    if (!existsSync(kumoCli)) throw new Error("先构建 React 组件库：pnpm --filter @cloudflare/kumo build");
    execFileSync("node", [kumoCli, cmd, ...rest], { stdio: "inherit", cwd });
  } else if (cmd === "build") {
    await buildAll();
  } else if (cmd === "link") {
    console.log(link());
  } else {
    console.log(unknown(cmd));
    process.exitCode = 1;
  }
}

const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main().catch((err) => {
    console.error(`${c.red("✗")} ${err.message}`);
    process.exit(1);
  });
}
