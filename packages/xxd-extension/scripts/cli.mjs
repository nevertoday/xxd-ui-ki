#!/usr/bin/env node
// 小小东 UI Kit 命令行（在仓库根目录：pnpm xxd <命令>）
//
//   pnpm xxd new <目录> --name 名字 [--name-en "English Name"] [--slug short-id] [--desc 一句话]
//       从模板新建一个 MV3 插件，并把组件拷进 vendor/xxd/
//   pnpm xxd sync <插件目录> [更多目录…]
//       把最新构建的 @xxd 文件拷进 <插件>/vendor/xxd/，写 VERSION
//   pnpm xxd status <插件目录> [更多目录…]
//       看每个插件用的是哪个版本，是否落后
//   pnpm xxd ls                      列出全部组件（原生 @xxd/css 与 React @xxd/react）
//   pnpm xxd doc <组件> [--react]     一个组件的用法、属性、规则（--react 看 React 版的 props）
//   pnpm xxd add <block> [--cwd 项目]  把 React 区块装进项目（转给 Kumo CLI 的 add）
//   pnpm xxd adopt <项目目录>          老项目「改为引入令牌」：删掉与令牌亮暗两种值都相同的 :root 声明，旧名改成别名（xxd.config.json 的 adopt）
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { parseBlocks } from "../../xxd-tokens/scripts/build.mjs";

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
  execFileSync("node", ["scripts/build.mjs"], { cwd: cssDir, stdio: quiet ? "ignore" : "inherit" });
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

const REGION_START = "/* xxd:tokens:start —— 由 xxd-ui-ki 生成（pnpm xxd sync），这一段请勿手改 */";
const REGION_END = "/* xxd:tokens:end */";

/** 把一段内容放进文件开头的标记区域里（已有就替换）。 */
export function upsertRegion(text, body) {
  const block = `${REGION_START}\n${body.trim()}\n${REGION_END}\n`;
  const start = text.indexOf(REGION_START);
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
    "小小东 UI Kit（xxd-ui-ki）的构建产物：设计令牌、原生组件、图标与插件套件。\n\n" +
      // 只取根 LICENSE 的 MIT 部分：拷进插件的这些文件都是小小东自己写的，不含 Kumo 的代码。
      readFileSync(join(repo, "LICENSE"), "utf8").split("\n---\n")[0],
  );
  const v = currentVersion();
  // 老项目的令牌文件路径不想改（测试、网站都引用它）：xxd.config.json 里写 { "tokensTargets": ["src/xxd-theme.css"] }，
  // sync 会把同一份 tokens.css 也写到那些路径，开头注明来源。
  const tokens = readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.css"), "utf8");
  for (const rel of config.tokensTargets ?? []) {
    const out = join(dir, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `/* 由 xxd-ui-ki 生成（pnpm xxd sync），请勿手改；来源 packages/xxd-tokens/tokens.css @ ${v.commit} */\n${tokens}`);
  }
  if (config.layeredTokensRegions?.length) {
    const names = Object.keys(JSON.parse(readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.json"), "utf8")).base);
    const skip = [...new Set([...findFallbackConflicts(dir, names), ...(config.layeredTokensExclude ?? [])])].sort();
    if (skip.length && !quiet) console.log(`  跳过 ${skip.length} 个令牌（项目里用了但没声明，声明了会改变现在的样子）：${skip.join(" ")}`);
    const layered = dropDeclarations(readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.layered.css"), "utf8"), skip);
    for (const rel of config.layeredTokensRegions) {
      const out = join(dir, rel);
      const note = skip.length ? `/* 跳过：${skip.join(" ")}（见 xxd-ui-ki docs/member-site.md） */\n` : "";
      writeFileSync(out, upsertRegion(readFileSync(out, "utf8"), `/* @xxd ${v.version} ${v.commit} */\n${note}${layered}`));
    }
  }
  for (const rel of config.iconNodesTargets ?? []) {
    const out = join(dir, rel);
    mkdirSync(dirname(out), { recursive: true });
    const nodes = readFileSync(join(repo, "packages/xxd-icons/src/nodes.js"), "utf8");
    writeFileSync(out, `// 由 xxd-ui-ki 生成（pnpm xxd sync），请勿手改；来源 packages/xxd-icons/src/nodes.js @ ${v.commit}\n${nodes}`);
  }
  if (!vendor) {
    if (!quiet) console.log(`✓ ${basename(dir)} ← @xxd ${v.version} (${v.commit})`);
    return v;
  }
  writeFileSync(
    join(vendor, "VERSION"),
    `@xxd/css ${v.version}\ncommit ${v.commit}\nsynced ${new Date().toISOString()}\nsource xxd-ui-ki（请勿手改这个目录，用 pnpm xxd sync 更新）\n`,
  );
  if (!quiet) console.log(`✓ ${basename(dir)} ← @xxd ${v.version} (${v.commit})`);
  return v;
}

export function status(target) {
  const file = join(resolve(target), "vendor/xxd/VERSION");
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
    `# ${name}\n\n用小小东 UI Kit（xxd-ui-ki）生成。\n\n- 在 chrome://extensions 打开「开发者模式」→「加载已解压的扩展程序」→ 选这个目录\n- 更新组件：在 xxd-ui-ki 里运行 \`pnpm xxd sync ${dir}\`\n- 设计原则：xxd-ui-ki/docs/DESIGN-PRINCIPLES.md\n- 图标：manifest 里还没有 icons，上架前补上（16/32/48/128）\n`,
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

export function listComponents() {
  const { native, react } = loadRegistries();
  const lines = ["原生组件（@xxd/css，插件和会员站用）"];
  const byCat = Map.groupBy ? Map.groupBy(native, (c) => c.category) : native.reduce((m, c) => m.set(c.category, [...(m.get(c.category) || []), c]), new Map());
  for (const [cat, items] of byCat) {
    lines.push(`  ${cat}`);
    for (const c of items) lines.push(`    ${c.name.padEnd(16)} ${c.zh}${c.react ? `  ·  React: ${c.react}` : ""}`);
  }
  const reactNames = Object.keys(react);
  if (reactNames.length) lines.push("", `React 组件（@xxd/react，Kumo 换皮版，${reactNames.length} 个）`, `  ${reactNames.join(" ")}`);
  return lines.join("\n");
}

export function docComponent(name, { react: wantReact = false } = {}) {
  const { native, react } = loadRegistries();
  const key = String(name || "").toLowerCase();
  if (wantReact) {
    const entry = Object.values(react).find((c) => c.name.toLowerCase() === key);
    if (!entry) throw new Error(`没有叫 ${name} 的 React 组件（pnpm xxd ls 看全部）`);
    const props = Object.entries(entry.props || {}).map(([p, v]) => `  ${p}${v.optional ? "?" : ""}: ${v.values ? v.values.join(" | ") : v.type}${v.default ? `（缺省 ${v.default}）` : ""}`);
    return [`${entry.name} — ${entry.description ?? ""}`, `import { ${entry.name} } from "@xxd/react";`, "", "props", ...props].join("\n");
  }
  const c = native.find((x) => x.name.toLowerCase() === key || x.zh === name);
  if (!c) throw new Error(`没有叫 ${name} 的原生组件（pnpm xxd ls 看全部；React 版加 --react）`);
  const out = [`${c.name} · ${c.zh}（${c.category}）`, "", "类名", `  ${c.classes.join(" ")}`];
  if (c.attributes) out.push("", "属性", ...Object.entries(c.attributes).map(([k, v]) => `  ${k}: ${v}`));
  out.push("", "示例", ...c.markup.split("\n").map((l) => `  ${l}`));
  if (c.js) out.push("", "JS", ...c.js.split("\n").map((l) => `  ${l}`));
  if (c.rules?.length) out.push("", "规则（docs/DESIGN-PRINCIPLES.md）", ...c.rules.map((r) => `  · ${r}`));
  if (c.react) out.push("", `React 版：${c.react}（pnpm xxd doc ${c.react.split(" ")[0]} --react）`);
  return out.join("\n");
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[key] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else out._.push(a);
  }
  return out;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  // pnpm 在仓库根目录执行脚本；相对路径按调用者的目录解析
  const cwd = process.env.INIT_CWD || process.cwd();
  const targets = args._.map((t) => resolve(cwd, t));
  if (cmd === "new") {
    await buildAll({ quiet: true });
    await create(targets[0], args);
  } else if (cmd === "sync") {
    if (!targets.length) throw new Error("用法：pnpm xxd sync <插件目录>");
    await buildAll({ quiet: true });
    for (const t of targets) sync(t);
  } else if (cmd === "status") {
    for (const t of targets) {
      const s = status(t);
      console.log(`${basename(s.target).padEnd(24)} ${s.version ? `${s.version} ${s.commit}`.padEnd(22) : "".padEnd(22)} ${s.state}`);
    }
  } else if (cmd === "ls") {
    console.log(listComponents());
  } else if (cmd === "doc") {
    console.log(docComponent(args._[0], { react: Boolean(args.react) }));
  } else if (cmd === "adopt") {
    const dir = targets[0];
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
  } else {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 11).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  });
}
