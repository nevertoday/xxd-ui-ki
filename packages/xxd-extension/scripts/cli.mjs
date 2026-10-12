#!/usr/bin/env node
// 小小东 UI Kit 命令行（在仓库根目录：pnpm xxd <命令>）
//
//   pnpm xxd new <目录> --name 名字 [--name-en "English Name"] [--slug short-id] [--desc 一句话]
//       从模板新建一个 MV3 插件，并把组件拷进 vendor/xxd/
//   pnpm xxd sync <插件目录> [更多目录…]
//       把最新构建的 @xxd 文件拷进 <插件>/vendor/xxd/，写 VERSION
//   pnpm xxd status <插件目录> [更多目录…]
//       看每个插件用的是哪个版本，是否落后
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

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
    banner: { js: "/* @xxd/extension — Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved. */" },
    outfile: join(pkgDir, "dist/extension.js"),
  });
}

export function sync(target, { quiet = false } = {}) {
  const dir = resolve(target);
  if (!existsSync(join(dir, "manifest.json"))) throw new Error(`${dir} 里没有 manifest.json，不像一个插件`);
  const vendor = join(dir, "vendor/xxd");
  mkdirSync(vendor, { recursive: true });
  for (const f of VENDOR_FILES) {
    const from =
      f === "extension.js" ? join(pkgDir, "dist/extension.js") : f === "tokens.css" ? join(repo, "packages/xxd-tokens/dist/tokens.css") : join(cssDir, "dist", f);
    if (!existsSync(from)) throw new Error(`缺少 ${relative(repo, from)}，先运行 pnpm xxd:build`);
    cpSync(from, join(vendor, f));
  }
  // xxd-chrome-publish 把 vendor/ 下的文件当第三方代码检查许可：放一份整个目录的 LICENSE。
  writeFileSync(
    join(vendor, "LICENSE"),
    "Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved.\n\n" +
      "小小东 UI Kit（xxd-ui-ki）的构建产物：设计令牌、原生组件、图标与插件套件。\n" +
      "闭源，仅供小小东自己的产品使用；未经书面许可不得复制、修改或分发。\n",
  );
  const v = currentVersion();
  // 老项目的令牌文件路径不想改（测试、网站都引用它）：xxd.config.json 里写 { "tokensTargets": ["src/xxd-theme.css"] }，
  // sync 会把同一份 tokens.css 也写到那些路径，开头注明来源。
  const configFile = join(dir, "xxd.config.json");
  if (existsSync(configFile)) {
    const config = JSON.parse(readFileSync(configFile, "utf8"));
    const tokens = readFileSync(join(repo, "packages/xxd-tokens/dist/tokens.css"), "utf8");
    for (const rel of config.tokensTargets ?? []) {
      const out = join(dir, rel);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, `/* 由 xxd-ui-ki 生成（pnpm xxd sync），请勿手改；来源 packages/xxd-tokens/tokens.css @ ${v.commit} */\n${tokens}`);
    }
  }
  writeFileSync(
    join(vendor, "VERSION"),
    `@xxd/css ${v.version}\ncommit ${v.commit}\nsynced ${new Date().toISOString()}\nsource xxd-ui-ki（闭源，请勿手改这个目录，用 pnpm xxd sync 更新）\n`,
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
