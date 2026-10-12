// 对抗门禁（优化计划 O8）：截图回归看「长得对不对」，这里看「打得坏打不坏」。
//   1. axe：每一页 × 两种外观（亮直角墨色 / 暗圆角 X 蓝），WCAG 2.1 AA + best-practice，零违规。
//      原则页「不好」的示例（[data-kind="dont"]）是故意做错的，不扫。
//   2. 长内容：注册表里每个组件、每个小小东模式的示例放进 320px 宽的格子，文字换成长中文 / 长链接，任何元素都不许伸出格子。
//   3. 恶意宿主页：Shadow DOM 里的组件不受宿主页继承样式和同名变量影响；tooltip / toast 留在 Shadow 里。
//   4. 高对比模式（forced-colors）：开关、勾选、分段、tab 的选中态和未选中态看得出差别。
//   5. 英文版：/en/ 下每一页 <html lang="en">，看得见的字和 aria-label / placeholder / title / tooltip 里没有汉字
//      （标了 lang="zh…" 的地方除外：切换语言的按钮、中文提交记录、语言本名），中文页和英文页互相链到对方。
// 用法：pnpm --filter @xxd/site build && pnpm --filter @xxd/site audit [--only=axe|long|shadow|forced|en]
// 需要 Chromium：CHROME_EXE=<chrome-headless-shell 路径>（缺省用 Playwright 自带的）。
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

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
};
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (PAGES[p]) return res.writeHead(200, { "content-type": TYPES[".html"] }).end(PAGES[p]());
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
    if (statSync(f).isDirectory()) walk(f);
    else if (name === "index.html") pages.push(`/${relative(dist, d).split("\\").join("/")}/`.replace(/^\/\/$/, "/"));
  }
})(dist);

/* ── 1. axe ── */
async function axeAudit() {
  const modes = [
    { id: "亮·直角·墨色", s: { theme: "light", corners: "square", accent: "", density: "comfortable", finish: "flat" } },
    { id: "暗·圆角·X 蓝", s: { theme: "dark", corners: "rounded", accent: "#1d9bf0", density: "comfortable", finish: "material" } },
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
<body class="xxd-page" style="margin:0"><div id="app"></div><script src="/xxd/icons.js"></script><script src="/xxd/xxd.js"></script></body></html>`;
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

const sections = { axe: axeAudit, long: longAudit, shadow: hostileAudit, forced: forcedAudit, en: englishAudit };
for (const [name, run] of Object.entries(sections)) if (!only || only === name) await run();
await browser.close();
server.close();

if (failures.length) {
  console.log(`\n✗ ${failures.length} 处问题：`);
  for (const f of failures.slice(0, 80)) console.log("  " + f);
  if (failures.length > 80) console.log(`  …还有 ${failures.length - 80} 处`);
  process.exit(1);
}
console.log("\n✓ 对抗门禁全部通过");
