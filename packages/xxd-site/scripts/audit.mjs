// 对抗门禁（优化计划 O8）：截图回归看「长得对不对」，这里看「打得坏打不坏」。
//   1. axe：每一页 × 两种外观（亮直角墨色 / 暗圆角 X 蓝），WCAG 2.1 AA + best-practice，零违规。
//      原则页「不好」的示例（[data-kind="dont"]）是故意做错的，不扫。
//   2. 长内容：注册表里每个组件、每个小小东模式的示例放进 320px 宽的格子，文字换成长中文 / 长链接，任何元素都不许伸出格子。
//   3. 恶意宿主页：Shadow DOM 里的组件不受宿主页继承样式和同名变量影响；tooltip / toast 留在 Shadow 里。
//   4. 高对比模式（forced-colors）：开关、勾选、分段、tab 的选中态和未选中态看得出差别。
//   5. 英文版：/en/ 下每一页 <html lang="en">，看得见的字和 aria-label / placeholder / title / tooltip 里没有汉字
//      （标了 lang="zh…" 的地方除外：切换语言的按钮、中文提交记录、语言本名），中文页和英文页互相链到对方。
//   6. 细节（scripts/polish.js）：专业的人一眼看出来的小毛病 —— 字贴边、控件被截断或折行、最后一行只剩一个字、
//      字被挤成一字一行、元素互相压住、图标和字没对齐。扫两处：全站每一页（1280 / 390 宽），
//      以及每个组件、模式的中英文示例放进 260 / 360 / 560px 宽的演示格子。
//   7. 浮层（评审 R1）：每个演示里会弹出东西的按钮都真的点一下 —— 对话框 / sheet / 面板 / 菜单 / popover / toast
//      要整个在视口里（桌面上对话框居中，手机上贴底），对话框类焦点要进去、Esc 关得掉、关掉后焦点回到按钮；
//      toast 不被别的东西盖住。以前截图只拍关着的浮层，对话框跑到左上角也没人发现。
//   8. 真实浏览器冒烟（评审 R1）：happy-dom 看不到的东西 —— 层叠层顺序（Tailwind 的工具类能盖住 xxd）、
//      带 *{margin:0} reset 时对话框仍居中、mountXxdUI 之后 host 的定位不被清掉。
//   10. 对照（设计师评审 V1）：/tools/parity 上同一组件的原生 HTML 和 React 逐项比较（尺寸、字号、字重、颜色、边、圆角、底色），以 HTML 为准。
// 用法：pnpm --filter @xxd/site build && pnpm --filter @xxd/site run audit [--only=axe|long|shadow|forced|en|polish|overlay|smoke|sr|parity]
// 需要 Chromium：CHROME_EXE=<chrome-headless-shell 路径>（缺省用 Playwright 自带的）。
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { srAudit } from "./sr.mjs";
import { compareOverlays, compareParity, OVERLAYS, PARITY_LOOKS } from "./parity.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const pkgs = join(root, "..");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const AXE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

if (!existsSync(join(dist, "index.html"))) {
  console.error("先构建：pnpm --filter @xxd/site build");
  process.exit(1);
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
const PAGES = {
  "/__audit/long": () => longPage(),
  "/__audit/hostile": () => hostilePage(),
  "/__audit/cells": (q) => cellsPage(q.get("lang"), Number(q.get("w"))),
  "/__audit/smoke": () => smokePage(),
};
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (PAGES[p]) {
    Promise.resolve(PAGES[p](new URL(req.url, "http://x").searchParams)).then((html) => res.writeHead(200, { "content-type": TYPES[".html"] }).end(html));
    return;
  }
  // /@pkg/xxd-css/dist/… → 仓库里的构建产物（不进展示站）
  let file = p.startsWith("/@pkg/") ? join(pkgs, p.slice(6)) : join(dist, p);
  if (!file.startsWith(pkgs)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end("not found");
  res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.CHROME_EXE ? { executablePath: process.env.CHROME_EXE } : {});
const failures = [];
const fail = (section, msg) => failures.push(`[${section}] ${msg}`);

const pages = [];
(function walk(d) {
  for (const name of readdirSync(d)) {
    const f = join(d, name);
    // /mini/ 是演示小程序编出的 H5（Taro 的页面，不是展示站的页）：它有自己的检查（pnpm --filter @xxd/mini-demo check）
    if (d === dist && name === "mini") continue;
    if (statSync(f).isDirectory()) walk(f);
    else if (name === "index.html") pages.push(`/${relative(dist, d).split("\\").join("/")}/`.replace(/^\/\/$/, "/"));
  }
})(dist);

/* ── 1. axe ── */
async function axeAudit() {
  const modes = [
    { id: "亮·直角·墨色", s: { theme: "light", corners: "square", accent: "", density: "comfortable", finish: "flat" } },
    { id: "暗·圆角·自定义蓝", s: { theme: "dark", corners: "rounded", accent: "#1d9bf0", density: "comfortable", finish: "material" } },
  ];
  let count = 0;
  for (const mode of modes) {
    for (const page of pages) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
      await ctx.addInitScript((s) => localStorage.setItem("xxd-site", JSON.stringify(s)), mode.s);
      const tab = await ctx.newPage();
      await tab.goto(origin + page, { waitUntil: "networkidle" });
      await tab.waitForTimeout(120);
      await tab.addScriptTag({ content: AXE });
      const violations = await tab.evaluate(async () => {
        const r = await axe.run({ exclude: [['[data-kind="dont"]']] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } });
        return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => `${n.target.join(" ")} ${n.any?.[0]?.data?.contrastRatio ? `(${n.any[0].data.fgColor} on ${n.any[0].data.bgColor} = ${n.any[0].data.contrastRatio})` : ""}`) }));
      });
      for (const v of violations) for (const n of v.nodes.slice(0, 3)) fail("axe", `${mode.id} ${page} ${v.id}: ${n}`);
      count += 1;
      await ctx.close();
    }
  }
  console.log(`axe：${count} 次扫描`);
}

/* ── 2. 长内容 ── */
function longPage() {
  return `<!doctype html><html lang="zh-CN" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/xxd/xxd.css"><style>.cell{width:var(--cell,320px);margin:0 0 24px}</style></head>
<body class="xxd-page" style="margin:0"><div id="app"></div><script src="/xxd/icons.js"></script><script src="/xxd/xxd.js"></script><script src="/xxd/extension.js"></script></body></html>`;
}

// 只有一个字形的格子（字形表）和故意定宽的东西不算
const LONG_EXEMPT = new Set(["Glyphs"]);
const TEXTS = {
  长中文: "这是一段非常非常长的中文文字用来测试换行和截断是否正确处理而且还要再长一点点才行",
  长链接: "https://vip.xiaoxiaodong.ai/prompts/2026/very-long-slug-without-any-spaces-at-all",
};

async function longAudit() {
  const registry = [
    ...JSON.parse(readFileSync(join(pkgs, "xxd-css/registry.json"), "utf8")).components,
    ...JSON.parse(readFileSync(join(pkgs, "xxd-css/patterns.json"), "utf8")).patterns.map((p) => ({ ...p, name: `模式 ${p.name}` })),
  ].filter((c) => typeof c.markup === "string");
  for (const [label, text, cellWidth] of [["原文", null, 320], ["原文 · 260px", null, 260], ...Object.entries(TEXTS).map(([k, v]) => [k, v, 320])]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: "reduce" });
    const tab = await ctx.newPage();
    const errors = [];
    tab.on("pageerror", (e) => errors.push(e.message));
    await tab.goto(`${origin}/__audit/long`);
    const bad = await tab.evaluate(({ registry, text, exempt, cellWidth }) => {
      const app = document.getElementById("app");
      app.style.setProperty("--cell", `${cellWidth}px`);
      for (const c of registry) {
        if (exempt.includes(c.name)) continue;
        // 侧栏本身就是 232px 的桌面组件：比它还窄的地方应当折叠（data-collapsed），不在 260px 格子里测
        if (cellWidth < 300 && c.name === "Sidebar") continue;
        const cell = document.createElement("section");
        cell.className = "cell";
        cell.dataset.name = c.name;
        cell.innerHTML = c.markup;
        if (text) {
          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
          const nodes = [];
          while (walker.nextNode()) if (walker.currentNode.nodeValue.trim() && !walker.currentNode.parentElement.closest("script, style, pre, code, kbd, .xxd-kbd, [data-spark]")) nodes.push(walker.currentNode);
          for (const n of nodes) n.nodeValue = text;
        }
        app.append(cell);
      }
      Xxd.install(document);
      globalThis.XxdIcons?.hydrateIcons?.(document);
      const out = [];
      for (const cell of app.children) {
        const box = cell.getBoundingClientRect();
        for (const el of cell.querySelectorAll("*")) {
          if (el.closest("[popover]:not(:popover-open), dialog:not([open]), [hidden], template, .xxd-sr-only, svg")) continue;
          // 收起的侧面板 / sheet 本来就在屏幕外
          let fixedAncestor = false;
          for (let p = el; p && p !== cell; p = p.parentElement) if (getComputedStyle(p).position === "fixed") fixedAncestor = true;
          if (fixedAncestor) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.position === "fixed") continue;
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          let clipped = false;
          for (let p = el.parentElement; p && p !== cell; p = p.parentElement) {
            if (getComputedStyle(p).overflowX !== "visible") {
              clipped = true;
              break;
            }
          }
          const tag = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""}`;
          if (!clipped && r.right > box.right + 1) {
            out.push(`${cell.dataset.name}: ${tag} 伸出 ${Math.round(r.right - box.right)}px`);
            break;
          }
          // 被挤窄：标题、名字、按钮的字被旁边的东西挤到不到 3 个字宽，折成好几行（一字一行）
          if (!text && el.matches("h1, h2, h3, h4, [class*='__title'], [class*='__name'], .xxd-btn, .xxd-chip, .xxd-badge")) {
            const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join("");
            const size = parseFloat(cs.fontSize);
            const lines = Math.round(r.height / (parseFloat(cs.lineHeight) || size * 1.4));
            if ([...own].length >= 4 && r.width < size * 3 && lines >= 2) {
              out.push(`${cell.dataset.name}: ${tag} 被挤成 ${Math.round(r.width)}px 宽、${lines} 行`);
              break;
            }
          }
        }
      }
      return out;
    }, { registry, text, exempt: [...LONG_EXEMPT], cellWidth });
    for (const b of bad) fail("长内容", `${label} · ${b}`);
    for (const e of errors) fail("长内容", `${label} · 脚本错误 ${e}`);
    await ctx.close();
  }
  console.log(`长内容：${registry.length - LONG_EXEMPT.size} 个组件和模式 × 3 种文字（另加 260px 窄格子），不溢出、不被挤成一字一行`);
}

/* ── 3. 恶意宿主页 ── */
function hostilePage() {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  * { box-sizing: content-box; }
  body { font: 20px/2.4 Georgia, serif; color: #e11d48; letter-spacing: 2px; text-transform: uppercase; word-spacing: 6px; text-align: center; cursor: crosshair; }
  div, xxd-host { --ink: #00ff00; --r-sm: 40px; --paper: #ffff00; --font-body: Georgia; }
  button { all: unset; background: red !important; }
  dialog { background: yellow !important; }
  .xxd-tooltip, .xxd-toast { display: none !important; }
</style></head><body>
<p>宿主页</p><div id="host" data-finish="material"></div>
<script src="/xxd/icons.js"></script>
<script type="module">
  const css = await (await fetch("/@pkg/xxd-css/dist/xxd.shadow.css")).text();
  const X = await import("/@pkg/xxd-css/dist/xxd.esm.js");
  const host = document.getElementById("host");
  const root = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  root.adoptedStyleSheets = [sheet];
  root.innerHTML = \`<div class="xxd-page" id="pg">
    <button class="xxd-btn" id="b">保存</button>
    <button class="xxd-btn" id="p" data-variant="primary">写入</button>
    <p id="t">正文 text</p>
    <button class="xxd-btn" id="tt" data-tooltip="提示">tip</button>
  </div>\`;
  X.install(root);
  window.X = X; window.root = root; window.ready = true;
</script></body></html>`;
}

async function hostileAudit() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 }, reducedMotion: "reduce" });
  const tab = await ctx.newPage();
  const errors = [];
  tab.on("pageerror", (e) => errors.push(e.message));
  await tab.goto(`${origin}/__audit/hostile`);
  await tab.waitForFunction(() => window.ready);
  const r = await tab.evaluate(async () => {
    const $ = (id) => root.getElementById(id);
    const b = getComputedStyle($("b"));
    const t = getComputedStyle($("t"));
    const p = getComputedStyle($("p"));
    const out = {
      圆角: b.borderTopLeftRadius,
      按钮底色: b.backgroundColor,
      正文颜色: t.color,
      大写: t.textTransform,
      字距: t.letterSpacing,
      对齐: t.textAlign,
      词距: t.wordSpacing,
      光标: t.cursor,
      字体: t.fontFamily.includes("Georgia"),
      质感: p.boxShadow,
    };
    X.showTooltip($("tt"));
    out.tooltip在Shadow里 = !!root.querySelector(".xxd-tooltip") && !document.querySelector(".xxd-tooltip");
    try {
      X.toast("已保存", { within: root });
      out.toast在Shadow里 = !!root.querySelector(".xxd-toast") && !document.querySelector(".xxd-toast");
    } catch (e) {
      out.toast在Shadow里 = "报错 " + e.message;
    }
    return out;
  });
  const expect = {
    圆角: "0px",
    按钮底色: "rgb(255, 255, 255)",
    正文颜色: "rgb(17, 17, 17)",
    大写: "none",
    字距: "normal",
    对齐: "start",
    词距: "0px",
    光标: "auto",
    字体: false,
    tooltip在Shadow里: true,
    toast在Shadow里: true,
  };
  for (const [k, v] of Object.entries(expect)) if (r[k] !== v) fail("宿主页", `${k}：期望 ${JSON.stringify(v)}，实际 ${JSON.stringify(r[k])}`);
  if (!/inset/.test(r.质感)) fail("宿主页", `host 上的 data-finish="material" 没生效（box-shadow: ${r.质感}）`);
  for (const e of errors) fail("宿主页", `脚本错误 ${e}`);
  await ctx.close();
  console.log("宿主页：Shadow DOM 隔离 12 项");
}

/* ── 4. 高对比模式 ── */
async function forcedAudit() {
  const ctx = await browser.newContext({ viewport: { width: 600, height: 400 }, forcedColors: "active", reducedMotion: "reduce" });
  const tab = await ctx.newPage();
  await tab.goto(`${origin}/__audit/long`);
  await tab.evaluate(() => {
    document.getElementById("app").innerHTML = `<div style="display:grid;gap:12px;padding:12px;width:320px">
      <div data-pair="开关"><input type="checkbox" class="xxd-switch" aria-label="a"> <input type="checkbox" class="xxd-switch" checked aria-label="b"></div>
      <div data-pair="勾选"><input type="checkbox" class="xxd-check" aria-label="a"> <input type="checkbox" class="xxd-check" checked aria-label="b"></div>
      <div data-pair="单选"><input type="radio" class="xxd-radio" name="r" aria-label="a"> <input type="radio" class="xxd-radio" name="r2" checked aria-label="b"></div>
      <div data-pair="分段"><div class="xxd-segmented" role="radiogroup" aria-label="s"><button role="radio" aria-checked="false">文本</button></div> <div class="xxd-segmented" role="radiogroup" aria-label="s2"><button role="radio" aria-checked="true">文本</button></div></div>
      <div data-pair="tab"><div class="xxd-tabs" role="tablist"><button role="tab" aria-selected="false">写作</button></div> <div class="xxd-tabs" role="tablist"><button role="tab" aria-selected="true">写作</button></div></div>
      <div data-pair="进度"><progress class="xxd-progress" value="0" max="100"></progress> <progress class="xxd-progress" value="60" max="100"></progress></div>
      <div data-pair="chip"><button class="xxd-chip" aria-pressed="false">海报</button> <button class="xxd-chip" aria-pressed="true">海报</button></div>
    </div>`;
  });
  for (const pair of await tab.$$("[data-pair]")) {
    const name = await pair.getAttribute("data-pair");
    const [a, b] = await pair.$$(":scope > *");
    const [sa, sb] = [await a.screenshot(), await b.screenshot()];
    if (sa.equals(sb)) fail("高对比", `${name}：选中和未选中看起来一样`);
  }
  await ctx.close();
  console.log("高对比：7 组状态");
}

/* ── 5. 英文版 ── */
async function englishAudit() {
  const enPages = pages.filter((p) => p.startsWith("/en/"));
  const zhPages = pages.filter((p) => !p.startsWith("/en/"));
  if (enPages.length !== zhPages.length) fail("英文", `中文 ${zhPages.length} 页、英文 ${enPages.length} 页，数量不一样`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const tab = await ctx.newPage();
  for (const page of enPages) {
    await tab.goto(origin + page, { waitUntil: "networkidle" });
    await tab.waitForTimeout(100);
    const r = await tab.evaluate(() => {
      const han = /\p{Script=Han}/u;
      const found = [];
      const skip = "[lang|=zh], script, style, template, [hidden]";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement && !n.parentElement.closest(skip) && han.test(n.textContent)) found.push(n.textContent.trim().slice(0, 30));
      for (const el of document.querySelectorAll("[aria-label],[placeholder],[title],[data-tooltip]")) {
        if (el.closest("[lang|=zh]")) continue;
        for (const a of ["aria-label", "placeholder", "title", "data-tooltip"]) if (han.test(el.getAttribute(a) ?? "")) found.push(`${a}="${el.getAttribute(a).slice(0, 20)}"`);
      }
      return { lang: document.documentElement.lang, found: [...new Set(found)], other: document.querySelector(".site-lang")?.getAttribute("href") };
    });
    if (r.lang !== "en") fail("英文", `${page} <html lang="${r.lang}">`);
    for (const f of r.found.slice(0, 3)) fail("英文", `${page} 有汉字：${f}`);
    const zh = page.replace(/^\/en/, "") || "/";
    if ((r.other ?? "").replace(/\/$/, "") !== zh.replace(/\/$/, "")) fail("英文", `${page} 的语言切换指向 ${r.other}，应当是 ${zh}`);
  }
  await ctx.close();
  console.log(`英文：${enPages.length} 页`);
}

/* ── 6. 细节 ── */
const POLISH = readFileSync(join(root, "scripts/polish.js"), "utf8");
// 侧栏本身是 232px 的桌面组件，比它窄的格子里本来就该折叠；图表要 ECharts，格子里没有
const POLISH_EXEMPT = new Set(["Sidebar", "Chart"]);

async function cellsPage(lang, w) {
  const reg = JSON.parse(readFileSync(join(pkgs, "xxd-css/registry.json"), "utf8")).components;
  const pat = JSON.parse(readFileSync(join(pkgs, "xxd-css/patterns.json"), "utf8")).patterns;
  const en = await import(pathToFileURL(join(pkgs, "xxd-css/registry.en.js")).href);
  const enp = await import(pathToFileURL(join(pkgs, "xxd-css/patterns.en.js")).href);
  // 每个格子里的 id 加上序号，几个示例放在一页上也不会互相抢（对话框、tab、sheet 都按 id 找）
  const uniq = (m, i) => m.replace(/\b(id|for|aria-controls|aria-labelledby|data-sidebar-sub|data-submenu|data-xxd-dialog-open|data-xxd-sheet-open|data-xxd-panel-open|data-xxd-menu|data-xxd-popover|data-xxd-sidebar-toggle|data-copy-target)="([^"]+)"/g, (_, a, v) => `${a}="${v.split(" ").map((x) => (x.startsWith("#") ? x.replace(/^#([\w-]+)/, `#$1-${i}`) : `${x}-${i}`)).join(" ")}"`).replace(/getElementById\("([\w-]+)"\)/g, `getElementById("$1-${i}")`);
  const cells = [...reg, ...pat].filter((c) => !POLISH_EXEMPT.has(c.name)).map((c, i) => {
    const isPat = pat.includes(c);
    const e = (isPat ? enp.patterns : en.components)[c.name] ?? {};
    const markup = lang === "en" ? e.markup ?? c.markup : c.markup;
    return `<div class="site-demo cell" data-name="${c.name}" style="width:${w}px;margin:0 0 12px"><div class="site-demo__stage" data-align="${c.align ?? (isPat ? "start" : "center")}" ${c.block ?? isPat ? "data-block" : ""}>${uniq(markup, i)}</div></div>`;
  });
  return `<!doctype html><html lang="${lang === "en" ? "en" : "zh-CN"}" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/xxd/xxd.css"><link rel="stylesheet" href="/site.css"><script src="/xxd/boot.js"></script><script src="/xxd/icons.js"></script><script src="/xxd/xxd.js"></script><script src="/xxd/extension.js"></script></head>
<body class="xxd-page" style="padding:12px">${cells.join("")}</body></html>`;
}

async function polishAudit() {
  const seen = new Set();
  const report = (where, x) => {
    const key = `${x.kind}|${x.where}`;
    if (seen.has(key)) return;
    seen.add(key);
    fail("细节", `${where} ${x.kind}：${x.where} —— ${x.detail}`);
  };
  // 全站每一页
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    const tab = await ctx.newPage();
    for (const page of pages) {
      await tab.goto(origin + page, { waitUntil: "networkidle" });
      await tab.waitForTimeout(80);
      await tab.addScriptTag({ content: POLISH });
      for (const x of await tab.evaluate(() => xxdPolish(document.querySelector("main") || document.body))) report(`[${w}] ${page}`, x);
      // 模板预览框 overflow:hidden：里面的东西超出左右边会被悄悄裁掉（不算「溢出」，上面查不到）
      if (/\/templates\//.test(page)) {
        const clipped = await tab.evaluate(() => {
          const out = [];
          for (const frame of document.querySelectorAll(".site-template")) {
            const box = frame.getBoundingClientRect();
            for (const el of frame.querySelectorAll("*")) {
              if (el.closest("[hidden], dialog:not([open]), [popover]:not(:popover-open), svg") || !el.getClientRects().length) continue;
              // 能横向滚动的容器（表格、标签栏）里面不算
              let scroller = false;
              for (let p = el.parentElement; p && p !== frame; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) scroller = true;
              if (scroller) continue;
              const r = el.getBoundingClientRect();
              if (r.width && (r.left < box.left - 1 || r.right > box.right + 1)) out.push({ kind: "被预览框裁掉", where: `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""}「${(el.textContent || "").trim().slice(0, 16)}」`, detail: `左 ${Math.round(r.left - box.left)}px / 右 ${Math.round(box.right - r.right)}px` });
            }
          }
          return out.slice(0, 5);
        });
        for (const x of clipped) report(`[${w}] ${page}`, x);
      }
    }
    await ctx.close();
  }
  // 首页组件墙：每格按组件大小占几列几行（Home.astro 的脚本）。格子 overflow:hidden，被裁掉的东西上面查不到，单独查：
  // 不截（内容超出格子）、不挤（一个元素比它的自然宽度窄，而墙上明明还有更宽的位置）、不留空洞（格子拼满整面墙）
  for (const lang of ["", "/en"]) {
    for (const [w, look] of [[1440, ""], [1100, ""], [820, ""], [1280, "rounded-compact"], [390, ""]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
      const tab = await ctx.newPage();
      await tab.goto(`${origin}${lang}/`, { waitUntil: "networkidle" });
      if (look) {
        await tab.evaluate(() => {
          document.documentElement.setAttribute("data-corners", "rounded");
          document.documentElement.setAttribute("data-density", "compact");
          document.dispatchEvent(new CustomEvent("xxd:appearance"));
        });
      }
      await tab.waitForTimeout(250);
      const problems = await tab.evaluate(() => {
        const out = [];
        const wall = document.querySelector(".site-wall");
        const cols = getComputedStyle(wall).gridTemplateColumns.split(" ").filter(Boolean).length;
        const name = (c) => c.querySelector(".site-wall__name")?.textContent.trim().split(/\s+/).pop();
        let area = 0;
        for (const cell of wall.querySelectorAll(".site-wall__cell")) {
          const st = cell.querySelector(".site-wall__stage");
          const r = cell.getBoundingClientRect();
          area += r.width * r.height;
          if (st.scrollHeight > st.clientHeight + 1 || st.scrollWidth > st.clientWidth + 1) out.push(`${name(cell)} 被格子截掉（高 ${st.scrollHeight - st.clientHeight}px / 宽 ${st.scrollWidth - st.clientWidth}px）`);
          if (st.hasAttribute("data-block")) continue;
          const cs = getComputedStyle(st);
          const inner = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const probe = document.createElement("div");
          probe.className = st.className;
          probe.style.cssText = "position:absolute;left:-10000px;top:0;width:max-content;display:block;padding:0;visibility:hidden";
          document.body.appendChild(probe);
          for (const child of st.children) {
            probe.replaceChildren(child.cloneNode(true));
            const need = probe.firstChild.getBoundingClientRect().width;
            if (need > inner + 1 && need < wall.clientWidth - 64) out.push(`${name(cell)} 被挤窄：要 ${Math.round(need)}px，格子里只有 ${Math.round(inner)}px`);
          }
          probe.remove();
        }
        if (cols > 1) {
          const wr = wall.getBoundingClientRect();
          const inside = (wr.width - wall.clientLeft) * (wr.height - wall.clientTop);
          if (inside - area > 2000) out.push(`墙上有空洞：约 ${Math.round((inside - area) / 1000)}k 平方像素没有格子`);
        }
        return out;
      });
      for (const x of problems) fail("细节", `[首页${lang || ""} ${w}${look ? " " + look : ""}] 组件墙 ${x}`);
      await ctx.close();
    }
  }
  // 每个示例放进窄 / 中 / 宽的格子
  for (const lang of ["zh", "en"]) {
    for (const w of [260, 360, 560]) {
      const ctx = await browser.newContext({ viewport: { width: w + 40, height: 900 }, reducedMotion: "reduce" });
      const tab = await ctx.newPage();
      const errors = [];
      tab.on("pageerror", (e) => errors.push(e.message));
      await tab.goto(`${origin}/__audit/cells?lang=${lang}&w=${w}`, { waitUntil: "networkidle" });
      await tab.waitForTimeout(150);
      await tab.addScriptTag({ content: POLISH });
      const found = await tab.evaluate(() => [...document.querySelectorAll(".cell")].flatMap((c) => xxdPolish(c).map((x) => ({ ...x, cell: c.dataset.name }))));
      for (const x of found) report(`[${lang} ${w}px] ${x.cell}`, x);
      for (const e of errors) fail("细节", `[${lang} ${w}px] 脚本错误 ${e}`);
      await ctx.close();
    }
  }
  console.log(`细节：${pages.length} 页 × 2 种宽度，每个组件和模式 × 中英 × 3 种格子宽，首页组件墙 × 中英 × 5 种宽度 / 外观`);
}

/* ── 7. 浮层：真的打开每一个 ── */
const OPENERS = "[data-xxd-dialog-open], [data-xxd-sheet-open], [data-xxd-panel-open], [data-xxd-menu], [data-xxd-popover], button[onclick]";
async function overlayAudit() {
  const targets = pages.filter((p) => /^\/(en\/)?(components|patterns|templates)\//.test(p) && (!process.env.AUDIT_PAGE || p.includes(process.env.AUDIT_PAGE)));
  let opened = 0;
  for (const [w, h] of [[1280, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    const tab = await ctx.newPage();
    for (const page of targets) {
      await tab.goto(origin + page, { waitUntil: "networkidle" });
      const count = await tab.evaluate((sel) => {
        const list = [...document.querySelectorAll(".site-demo__stage, .site-template")].flatMap((stage) => [...stage.querySelectorAll(sel)]).filter((b) => !b.closest("form") && b.getClientRects().length);
        list.forEach((b, i) => b.setAttribute("data-audit-opener", String(i)));
        return list.length;
      }, OPENERS);
      for (let i = 0; i < count; i += 1) {
        const opener = tab.locator(`[data-audit-opener="${i}"]`);
        if (!(await opener.isVisible())) continue;
        await opener.scrollIntoViewIfNeeded();
        const label = `[${w}] ${page} 「${((await opener.textContent()) || (await opener.getAttribute("aria-label")) || "").trim().slice(0, 16)}」`;
        await tab.evaluate(() => (window.__toastsBefore = document.querySelectorAll(".xxd-toast").length));
        // 用键盘打开（菜单用鼠标打开时焦点留在按钮上是有意的；键盘打开必须进去）
        await opener.focus();
        await tab.keyboard.press("Enter");
        await tab.waitForTimeout(260);
        const r = await tab.evaluate(() => {
          const vw = innerWidth;
          const vh = innerHeight;
          const box = (el) => el.getBoundingClientRect();
          const inView = (b) => b.left >= -1 && b.top >= -1 && b.right <= vw + 1 && b.bottom <= vh + 1;
          // 演示区里「打开后的样子」是静态的（inert，只给看），不算打开的浮层
          const layers = [...document.querySelectorAll("dialog[open], .xxd-sheet[data-open], .xxd-panel[data-open]")].filter((el) => !el.closest("[inert]"));
          const pops = [...document.querySelectorAll(":popover-open")].filter((p) => !p.classList.contains("xxd-tooltip") && !p.classList.contains("xxd-bubble"));
          const toasts = [...document.querySelectorAll(".xxd-toast:not([data-leaving])")].slice(window.__toastsBefore);
          const active = document.activeElement;
          const out = [];
          for (const el of layers) {
            const b = box(el);
            const kind = el.tagName === "DIALOG" ? "对话框" : el.classList.contains("xxd-sheet") ? "sheet" : "面板";
            out.push({
              kind,
              inView: inView(b),
              rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)],
              centered: kind !== "对话框" || vw <= 640 ? true : Math.abs(b.left + b.width / 2 - vw / 2) <= 2 && b.top > 0,
              bottom: kind === "对话框" && vw <= 640 && !el.classList.contains("xxd-palette") ? Math.abs(b.bottom - vh) <= 2 : true,
              focus: el.contains(active) || el === active,
              active: active ? active.tagName + "." + active.className : "",
            });
          }
          for (const el of pops) {
            const b = box(el);
            const kind = el.classList.contains("xxd-menu") || el.getAttribute("role") === "menu" ? "菜单" : "popover";
            out.push({ kind, inView: inView(b), rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], centered: true, bottom: true, focus: kind === "菜单" ? el.contains(active) : true });
          }
          for (const el of toasts) {
            const b = box(el);
            const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            out.push({ kind: "toast", inView: inView(b), rect: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], centered: true, bottom: true, focus: true, covered: !el.contains(hit) });
          }
          return out;
        });
        for (const o of r) {
          opened += 1;
          if (!o.inView) fail("浮层", `${label} ${o.kind}伸出视口 ${JSON.stringify(o.rect)}`);
          if (!o.centered) fail("浮层", `${label} ${o.kind}没有居中 ${JSON.stringify(o.rect)}`);
          if (!o.bottom) fail("浮层", `${label} 窄屏对话框没有贴底 ${JSON.stringify(o.rect)}`);
          if (!o.focus) fail("浮层", `${label} 打开${o.kind}后焦点没进去（在 ${o.active}）`);
          if (o.covered) fail("浮层", `${label} toast 被别的东西盖住`);
        }
        const modal = r.filter((o) => o.kind !== "toast");
        if (!modal.length) continue;
        // Esc 关掉；对话框类关掉后焦点回到按钮（嵌套的再按一次）
        for (let n = 0; n < 3; n += 1) {
          await tab.keyboard.press("Escape");
          await tab.waitForTimeout(160);
          if (!(await tab.evaluate(() => [...document.querySelectorAll("dialog[open], .xxd-sheet[data-open], .xxd-panel[data-open], .xxd-menu:popover-open")].some((e) => !e.closest("[inert]"))))) break;
        }
        const after = await tab.evaluate(() => ({
          still: !![...document.querySelectorAll("dialog[open], .xxd-sheet[data-open], .xxd-panel[data-open], .xxd-menu:popover-open")].some((e) => !e.closest("[inert]")),
          back: !!document.activeElement?.closest("[data-audit-opener]"),
        }));
        if (after.still) fail("浮层", `${label} Esc 关不掉`);
        else if (!after.back && modal.some((o) => o.kind !== "popover")) fail("浮层", `${label} 关掉后焦点没回到按钮`);
        // 万一还开着：清理干净再试下一个
        await tab.evaluate(() => {
          for (const d of document.querySelectorAll("dialog[open]")) d.close();
          for (const p of document.querySelectorAll(":popover-open")) p.hidePopover?.();
          for (const l of document.querySelectorAll(".xxd-sheet[data-open], .xxd-panel[data-open]")) if (!l.closest("[inert]")) window.Xxd?.closeLayer?.(l);
        });
      }
    }
    await ctx.close();
  }
  console.log(`浮层：${targets.length} 页 × 2 种宽度，打开并检查了 ${opened} 个浮层`);
}

/* ── 8. 真实浏览器冒烟 ── */
function smokePage() {
  // 和 @xxd/react 的 standalone.css 一样：先声明层顺序，再 Kumo（含 Tailwind preflight 和工具类），再 xxd
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>@layer properties, theme, base, xxd, components, utilities;</style>
<link rel="stylesheet" href="/xxd/kumo.css"><link rel="stylesheet" href="/xxd/xxd.css">
<script src="/xxd/xxd.js"></script><script src="/@pkg/xxd-extension/dist/extension.js"></script></head>
<body class="xxd-page">
  <button id="kumo" class="font-medium">Kumo 风格的按钮</button>
  <dialog class="xxd-dialog" id="dlg"><div class="xxd-dialog__body">居中？</div></dialog>
</body></html>`;
}

async function smokeAudit() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const tab = await ctx.newPage();
  const errors = [];
  tab.on("pageerror", (e) => errors.push(e.message));
  await tab.goto(`${origin}/__audit/smoke`, { waitUntil: "networkidle" });
  const r = await tab.evaluate(async () => {
    const out = {};
    out.工具类盖得住xxd = getComputedStyle(document.getElementById("kumo")).fontWeight;
    const d = document.getElementById("dlg");
    d.showModal();
    const b = d.getBoundingClientRect();
    out.对话框居中 = Math.abs(b.left + b.width / 2 - innerWidth / 2) <= 2 && b.top > 0;
    d.close();
    const host = document.createElement("div");
    host.dataset.display = "block";
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000";
    document.documentElement.append(host);
    await window.XxdExtension.mountXxdUI(host, { cssText: ":host{}", install: false });
    const s = getComputedStyle(host);
    out.host定位 = `${s.position} ${s.right} ${s.zIndex} ${s.display}`;
    return out;
  });
  const expect = { 工具类盖得住xxd: "500", 对话框居中: true, host定位: "fixed 16px 2147483000 block" };
  for (const [k, v] of Object.entries(expect)) if (r[k] !== v) fail("冒烟", `${k}：期望 ${JSON.stringify(v)}，实际 ${JSON.stringify(r[k])}`);
  for (const e of errors) fail("冒烟", `脚本错误 ${e}`);
  await ctx.close();
  console.log("冒烟：层叠层顺序、reset 下的对话框、注入宿主的定位");
}

/* ── 9. 读屏：键盘走关键流程，读无障碍树和播报区（scripts/sr.mjs） ── */
const srSection = () => srAudit({ browser, origin, fail, transcriptFile: join(root, "visual/sr-transcript.txt") });

/* ── 10. 对照（设计师评审 V1）：/tools/parity 上同一组件的 HTML 和 React 逐项比较，以 HTML 为准（scripts/parity.mjs） ── */
async function paritySection() {
  let pairs = 0;
  for (const look of PARITY_LOOKS) {
    for (const lang of ["", "/en"]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.addInitScript((s) => localStorage.setItem("xxd-site", JSON.stringify(s)), look);
      const tab = await ctx.newPage();
      await tab.goto(`${origin}${lang}/tools/parity/`, { waitUntil: "networkidle" });
      for (const d of await compareParity(tab)) fail("对照", `${look.theme}·${look.corners}·${look.density}·${look.finish}${lang} ${d}`);
      pairs += await tab.$$eval('[data-impl="html"]', (c) => c.length);
      await ctx.close();
    }
    for (const d of await compareOverlays(browser, origin, look)) fail("对照", `${look.theme}·${look.corners}·${look.density}·${look.finish} ${d}`);
  }
  console.log(`对照：${pairs} 对 × 逐项（${PARITY_LOOKS.length} 种外观 × 中英），另外打开 ${OVERLAYS.length} 种浮层比较`);
}

const sections = { axe: axeAudit, long: longAudit, shadow: hostileAudit, forced: forcedAudit, en: englishAudit, polish: polishAudit, overlay: overlayAudit, smoke: smokeAudit, sr: srSection, parity: paritySection };
for (const [name, run] of Object.entries(sections)) if (!only || only === name) await run();
await browser.close();
server.close();

// AUDIT_OUT=<文件>：把全部问题写进文件（终端只显示前 80 处）
if (process.env.AUDIT_OUT) (await import("node:fs")).writeFileSync(process.env.AUDIT_OUT, failures.join("\n") + "\n");
if (failures.length) {
  console.log(`\n✗ ${failures.length} 处问题：`);
  for (const f of failures.slice(0, 80)) console.log("  " + f);
  if (failures.length > 80) console.log(`  …还有 ${failures.length - 80} 处`);
  process.exit(1);
}
console.log("\n✓ 对抗门禁全部通过");
