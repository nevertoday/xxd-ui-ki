// xxd doctor：检查一个插件或网站。三类问题：
//   接入  vendor/xxd 有没有、是不是最新、页面引用的文件在不在、manifest 和 _locales 对不对得上
//   拼写  图标名、xxd- 类名有没有拼错（拼错了界面上什么都不显示，也不报错）
//   规则  DESIGN-PRINCIPLES 里能机器检查的：写死的颜色、阴影、字重、圆角、动效、衬线 / 网络字体
// 某一行确实要例外：在那一行写 xxd-ignore（CSS 注释或 HTML 注释都行）；整条规则不查：xxd.config.json 写 { "doctor": { "ignore": ["color"] } }。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { iconName, iconSuggestions, knownClasses } from "./find.mjs";
import { suggest } from "./term.mjs";

const SKIP_DIRS = /^(node_modules|\.git|dist|build|out|coverage|vendor|\.wrangler|\.astro|\.next|\.cache|test-results|playwright-report)$/;

export const RULES = {
  setup: "接入",
  missing: "文件不在",
  manifest: "manifest",
  locale: "多语言",
  icon: "图标名",
  class: "类名",
  color: "写死的颜色",
  shadow: "阴影",
  weight: "字重",
  radius: "圆角",
  motion: "动效",
  font: "字体",
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") && name !== ".") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.test(name)) walk(p, out);
    } else if (/\.(html?|css|m?js|jsx|tsx?|astro|vue|svelte)$/.test(name) && !/\.min\.(js|css)$|\.[a-f0-9]{8,}\.(js|css)$/.test(name) && st.size < 2_000_000) out.push(p);
  }
  return out;
}

const lineStarts = (text) => {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === "\n") starts.push(i + 1);
  return starts;
};
const lineOf = (starts, index) => {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
};
// 注释和 xxd 生成的令牌区换成空格（保留换行，行号不变）
const blank = (s) => s.replace(/[^\n]/g, " ");
const stripCss = (css) => css.replace(/\/\* xxd:tokens:start[\s\S]*?xxd:tokens:end \*\//g, blank).replace(/\/\*[\s\S]*?\*\//g, blank);

const OVERLAY = /popover|menu|dropdown|dialog|modal|toast|tooltip|overlay|sheet|drawer|popup|lightbox|palette|command/i;

/** 检查一段 CSS（也用于 <style> 和 .astro / .vue 里的样式）。返回 [{ rule, line, message }]。 */
export function checkCss(css) {
  const out = [];
  const text = stripCss(css);
  const starts = lineStarts(text);
  const stack = [];
  let buf = "";
  let bufStart = 0;
  const decl = (raw, at) => {
    const i = raw.indexOf(":");
    if (i < 0) return;
    const prop = raw.slice(0, i).trim().toLowerCase();
    const value = raw.slice(i + 1).replace(/!important/g, "").trim();
    if (!prop || prop.startsWith("--") || !/^[a-z-]+$/.test(prop)) return;
    const sel = ([...stack].reverse().find((s) => !s.startsWith("@")) || "").replace(/\s+/g, " ");
    const atRule = stack.find((s) => s.startsWith("@font-face"));
    const line = lineOf(starts, at + (raw.length - raw.trimStart().length));
    const add = (rule, message) => out.push({ rule, line, message });
    if (atRule) return;
    // 颜色：去掉 var(--x, 后备值) 里的后备值再看
    // rgba(var(--ink-rgb), .5) 这类用的也是令牌
    const bare = value.replace(/var\(\s*--[\w-]+\s*,[^()]*(\([^()]*\)[^()]*)*\)/g, "").replace(/url\([^)]*\)/g, "").replace(/\b(?:rgba?|hsla?)\(\s*var\([^)]*\)[^)]*\)/g, "");
    const color = bare.match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|lch)\(/i);
    if (color && !/^(?:mask|-webkit-mask|filter|box-shadow|text-shadow)/.test(prop)) add("color", `${prop}: ${value.slice(0, 48)} —— 颜色用令牌（var(--ink)、--muted、--line、--action…）`);
    // 阴影：整个值是一个令牌（var(--focus-ring)）、焦点环（:focus）、只有扩散没有模糊的描边，都不算
    if (prop === "box-shadow" && !/^(none|0|inherit|initial|unset)$/.test(value) && !/^var\(--[\w-]+\)$/.test(value) && !/var\(--shadow-/.test(value) && !/:focus/.test(sel)) {
      const ring = /^(inset\s+)?0(px)?\s+0(px)?\s+0(px)?\s/.test(value);
      if (!ring && !OVERLAY.test(sel)) add("shadow", `${sel.slice(0, 40)} 有阴影 —— 卡片、行、按钮不加阴影；浮层用 var(--shadow-popover / dialog / sheet)`);
      else if (!ring) add("shadow", `${sel.slice(0, 40)} 的阴影写死了 —— 用 var(--shadow-popover / dialog / sheet)，暗色下会自动变深`);
    }
    if (prop === "font-weight" && /^(700|800|900|bold|bolder|100|200|300|lighter)$/.test(value)) add("weight", `font-weight: ${value} —— 字重只有 400 / 500 / 600（var(--weight-medium) 等）`);
    if (/^border(-[a-z]+)*-radius$/.test(prop) && !/var\(--r-/.test(value) && !/^(0|0px|inherit|initial|unset)$/.test(value)) {
      const circle = /50%|999+px/.test(value);
      add("radius", `${prop}: ${value} —— ${circle ? "圆用 var(--r-circle)，胶囊用 var(--r-pill)" : "圆角只用 var(--r-xs / sm / md / lg / pill)"}`);
    }
    if (/^transition(-property)?$/.test(prop) && /\b(all|width|height|max-height|min-height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*|inset)\b/.test(value)) add("motion", `${prop}: ${value.slice(0, 40)} —— 动效只动 opacity / transform`);
    if (prop === "font-family" && !/var\(--font-/.test(value) && (/(^|[\s,"'])serif\b/.test(value.replace(/sans-serif/g, "")) || /宋体|simsun|songti|georgia|times|garamond|mincho/i.test(value))) add("font", `font-family: ${value.slice(0, 40)} —— 只用系统无衬线（var(--font-body)）`);
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") {
      const sel = buf.trim();
      if (sel.startsWith("@font-face")) out.push({ rule: "font", line: lineOf(starts, bufStart + (buf.length - buf.trimStart().length)), message: "@font-face —— 不加载网络字体，只用系统无衬线" });
      stack.push(sel);
      buf = "";
      bufStart = i + 1;
    } else if (ch === "}") {
      if (buf.trim()) decl(buf, bufStart);
      stack.pop();
      buf = "";
      bufStart = i + 1;
    } else if (ch === ";") {
      const s = buf.trim();
      if (/^@import\b/.test(s) && /fonts\.(googleapis|gstatic)|typekit|fonts\.bunny/.test(s)) out.push({ rule: "font", line: lineOf(starts, bufStart), message: "网络字体 —— 只用系统无衬线" });
      else if (stack.length) decl(buf, bufStart);
      buf = "";
      bufStart = i + 1;
    } else buf += ch;
  }
  return out;
}

/** 检查 HTML / JS 里的图标名和 xxd- 类名。 */
export function checkMarkup(text, { classes = knownClasses() } = {}) {
  const out = [];
  const starts = lineStarts(text);
  for (const re of [/data-xxd-icon\s*=\s*["']([A-Za-z0-9]+)["']/g, /iconSVG\(\s*["']([A-Za-z0-9]+)["']/g, /<Icon\b[^>]*\bname\s*=\s*["']([A-Za-z0-9]+)["']/g]) {
    for (const m of text.matchAll(re)) {
      if (iconName(m[1])) continue;
      const near = iconSuggestions(m[1]);
      out.push({ rule: "icon", level: "error", line: lineOf(starts, m.index), message: `没有叫 ${m[1]} 的图标${near.length ? `，是不是 ${near.join(" / ")}` : ""}（按关键词查：icon 命令）` });
    }
  }
  const seen = new Set();
  const checkTokens = (str, index) => {
    for (const tok of str.split(/[\s,'"`]+/)) {
      if (!/^xxd-[a-z0-9_-]+$/.test(tok) || classes.has(tok) || seen.has(tok)) continue;
      seen.add(tok);
      // 比较时去掉共同的 xxd- 前缀，否则什么都「像」
      const near = suggest(tok.slice(4), [...classes].map((x) => x.slice(4)), 2).map((x) => `xxd-${x}`);
      out.push({ rule: "class", line: lineOf(starts, index), message: `类名 ${tok} 在 @xxd/css 里不存在${near.length ? `，是不是 ${near.join(" / ")}` : ""}` });
    }
  };
  for (const m of text.matchAll(/\bclass(?:Name)?\s*=\s*(["'`])([^"'`]*)\1/g)) checkTokens(m[2].replace(/\$\{[^}]*\}/g, " ").replace(/\S*\$\{\S*/g, " "), m.index);
  for (const m of text.matchAll(/classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g)) checkTokens(m[1], m.index);
  return out;
}

const ignoredLine = (text, line) => /xxd-ignore/.test(text.split("\n")[line - 1] || "");

function checkManifest(dir, { skipVendor = false } = {}) {
  const out = [];
  const file = join(dir, "manifest.json");
  let m;
  try {
    m = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    return [{ rule: "manifest", level: "error", file, message: `manifest.json 不是合法的 JSON：${err.message}` }];
  }
  const add = (rule, level, message) => out.push({ rule, level, file, message });
  if (m.manifest_version !== 3) add("manifest", "warn", `manifest_version 是 ${m.manifest_version} —— Chrome 只收 MV3`);
  if (!m.icons || !Object.keys(m.icons).length) add("manifest", "warn", "还没有 icons —— 上架前补上 16 / 32 / 48 / 128");
  const refs = [];
  const push = (v, what) => v && refs.push([v, what]);
  for (const v of Object.values(m.icons || {})) push(v, "icons");
  const di = m.action?.default_icon;
  for (const v of typeof di === "string" ? [di] : Object.values(di || {})) push(v, "action.default_icon");
  push(m.background?.service_worker, "background.service_worker");
  push(m.side_panel?.default_path, "side_panel.default_path");
  push(m.options_page || m.options_ui?.page, "options");
  push(m.action?.default_popup, "action.default_popup");
  for (const cs of m.content_scripts || []) for (const f of [...(cs.js || []), ...(cs.css || [])]) push(f, "content_scripts");
  for (const w of m.web_accessible_resources || []) for (const f of w.resources || []) if (!/[*]/.test(f)) push(f, "web_accessible_resources");
  for (const [rel, what] of refs) if (!existsSync(join(dir, rel)) && !(skipVendor && /(^|\/)vendor\/xxd\//.test(rel))) add("missing", "error", `${what} 指向的 ${rel} 不存在`);
  // 多语言
  const locales = existsSync(join(dir, "_locales")) ? readdirSync(join(dir, "_locales")).filter((l) => existsSync(join(dir, "_locales", l, "messages.json"))) : [];
  if (m.default_locale && !locales.includes(m.default_locale)) add("locale", "error", `default_locale 是 ${m.default_locale}，但 _locales/${m.default_locale}/messages.json 不存在`);
  if (!m.default_locale && locales.length) add("locale", "error", "有 _locales 但 manifest 没写 default_locale —— Chrome 会拒绝加载");
  const messages = {};
  for (const l of locales) {
    try {
      messages[l] = JSON.parse(readFileSync(join(dir, "_locales", l, "messages.json"), "utf8"));
    } catch (err) {
      add("locale", "error", `_locales/${l}/messages.json 不是合法的 JSON：${err.message}`);
    }
  }
  const used = [...JSON.stringify(m).matchAll(/__MSG_(\w+)__/g)].map((x) => x[1]);
  for (const key of new Set(used)) for (const l of Object.keys(messages)) if (!messages[l][key]) add("locale", l === m.default_locale ? "error" : "warn", `manifest 用了 __MSG_${key}__，_locales/${l} 里没有`);
  const base = messages[m.default_locale];
  if (base) {
    for (const l of Object.keys(messages)) {
      if (l === m.default_locale) continue;
      const missing = Object.keys(base).filter((k) => !messages[l][k]);
      if (missing.length) add("locale", "warn", `_locales/${l} 比 ${m.default_locale} 少 ${missing.length} 条：${missing.slice(0, 5).join(" ")}${missing.length > 5 ? " …" : ""}`);
    }
  }
  return out;
}

/**
 * 检查一个项目。返回 { dir, kind, findings: [{ rule, level, file, line, message }] }。
 * now：当前 xxd-ui-kit 的版本（{ commit }），用来判断 vendor 是否落后。
 */
export function doctor(target, { now, bin = "xxd-ui" } = {}) {
  const dir = resolve(target);
  if (!existsSync(dir)) throw new Error(`${dir} 不存在`);
  const isExtension = existsSync(join(dir, "manifest.json"));
  const configFile = join(dir, "xxd.config.json");
  let config = {};
  if (existsSync(configFile)) {
    try {
      config = JSON.parse(readFileSync(configFile, "utf8"));
    } catch (err) {
      return { dir, kind: "unknown", findings: [{ rule: "setup", level: "error", file: configFile, message: `xxd.config.json 不是合法的 JSON：${err.message}` }] };
    }
  }
  const kind = isExtension ? "extension" : existsSync(configFile) ? "site" : "unknown";
  const findings = [];
  const vendorRel = config.vendorDir ?? (isExtension ? "vendor/xxd" : false);
  // 还没接入时只报一次，不再逐个报 vendor/xxd 里的文件不在
  let vendorMissing = false;
  if (vendorRel) {
    const version = join(dir, vendorRel, "VERSION");
    vendorMissing = !existsSync(version);
    if (vendorMissing) findings.push({ rule: "setup", level: "error", file: join(dir, vendorRel), message: `还没接入：${vendorRel}/VERSION 不存在 —— 运行 ${bin} sync` });
    else if (now) {
      const commit = readFileSync(version, "utf8").match(/commit (\S+)/)?.[1];
      if (commit && commit !== now.commit) findings.push({ rule: "setup", level: "warn", file: version, message: `组件是 ${commit}，最新是 ${now.commit} —— 运行 ${bin} sync` });
    }
  }
  if (isExtension) findings.push(...checkManifest(dir, { skipVendor: vendorMissing }));
  const classes = knownClasses();
  for (const file of walk(dir)) {
    const text = readFileSync(file, "utf8");
    const add = (list) => {
      for (const f of list) if (!(f.line && ignoredLine(text, f.line))) findings.push({ level: "warn", ...f, file });
    };
    if (file.endsWith(".css")) add(checkCss(text));
    else {
      // 页面里的 <style> 也查规则
      for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        const offset = lineOf(lineStarts(text), m.index) - 1;
        add(checkCss(m[1]).map((f) => ({ ...f, line: f.line + offset })));
      }
      add(checkMarkup(text, { classes }));
    }
    if (/\.html?$/.test(file)) {
      const starts = lineStarts(text);
      for (const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"'#?]*vendor\/xxd\/[^"'#?]+)["']/g)) {
        if (/^(https?:)?\/\//.test(m[1]) || vendorMissing) continue;
        // 网站常把静态文件放在 public/（Vite、Astro）：页面里的 vendor/xxd/… 从那里起算
        const rel = m[1].replace(/^\//, "");
        const candidates = [resolve(dirname(file), m[1]), join(dir, rel), join(dir, "public", rel.replace(/^(\.\.\/)+/, ""))];
        if (!candidates.some((p) => existsSync(p))) findings.push({ rule: "missing", level: "error", file, line: lineOf(starts, m.index), message: `引用的 ${m[1]} 不存在 —— 运行 ${bin} sync` });
      }
      const usesClasses = /class\s*=\s*["'][^"']*\bxxd-/.test(text);
      if (usesClasses && !/xxd(\.min|\.shadow)?\.css/.test(text) && !/<link[^>]+\.css/.test(text)) findings.push({ rule: "setup", level: "warn", file, message: "页面用了 xxd- 类名，但没有引 xxd.css" });
      if (/data-xxd-icon/.test(text) && !/icons(\.iife)?\.js/.test(text) && !/<script[^>]+type=["']module/.test(text)) findings.push({ rule: "setup", level: "warn", file, message: "用了 data-xxd-icon，但没有引 icons.js（图标不会出现）" });
      const boot = text.match(/<script[^>]*boot\.js[^>]*>/);
      if (boot && !/data-key=/.test(boot[0])) findings.push({ rule: "setup", level: "warn", file, line: lineOf(starts, boot.index), message: "boot.js 没写 data-key —— 外观设置会和别的插件混在一起" });
    }
  }
  const ignore = new Set(config.doctor?.ignore || []);
  return { dir, kind, findings: findings.filter((f) => !ignore.has(f.rule)).map((f) => ({ ...f, file: relative(dir, f.file) || "." })) };
}
