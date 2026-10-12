// 令牌门禁：对比度（DESIGN-PRINCIPLES §2）、圆角两态（§3）、生成器。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCENT_PRESETS, DARK_PAPER, LIGHT_PAPER, accentPalette, contrast, toRgb } from "../src/accent.js";
import { applySettings, resolveTheme } from "../src/theme.js";
import { parseBlocks, toShadow } from "../scripts/build.mjs";

const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const blocks = parseBlocks(css);
const base = blocks[":root"];
const dark = blocks[':root[data-theme="dark"]'];
const rounded = blocks[':root[data-corners="rounded"]'];
const rgb = (hex) => toRgb(hex);

test("正文与次要文字对比度 ≥ 4.5（亮/暗，paper 和 wash 上）", () => {
  for (const [name, mode] of [["light", base], ["dark", { ...base, ...dark }]]) {
    for (const surface of ["--paper", "--bg", "--wash"]) {
      for (const text of ["--ink", "--muted"]) {
        const ratio = contrast(rgb(mode[text]), rgb(mode[surface]));
        assert.ok(ratio >= 4.5, `${name}: ${text} on ${surface} = ${ratio.toFixed(2)}`);
      }
    }
  }
});

test("语义色在纸上 ≥ 4.5（亮/暗）", () => {
  for (const [name, mode] of [["light", base], ["dark", { ...base, ...dark }]]) {
    for (const color of ["--success", "--danger", "--warning"]) {
      const ratio = contrast(rgb(mode[color]), rgb(mode["--paper"]));
      assert.ok(ratio >= 4.5, `${name}: ${color} = ${ratio.toFixed(2)}`);
    }
  }
});

test("语义色做底：白字 ≥ 4.5，暗纸上做标记 ≥ 3", () => {
  for (const [name, mode, paper] of [["light", base, "#ffffff"], ["dark", { ...base, ...dark }, "#201f1a"]]) {
    for (const color of ["--success-strong", "--danger-strong", "--warning-strong"]) {
      assert.ok(contrast(rgb(mode[color]), [255, 255, 255]) >= 4.5, `${name}: white on ${color}`);
      if (name === "dark") assert.ok(contrast(rgb(mode[color]), rgb(paper)) >= 3, `${name}: ${color} mark`);
    }
  }
});

test("18 个主色 × 亮/暗：标记 ≥ 3，文字版 ≥ 4.5，颜色上的文字 ≥ 3", () => {
  assert.equal(ACCENT_PRESETS.length, 18);
  assert.equal(ACCENT_PRESETS[0].id, "", "第一个是墨色");
  for (const preset of ACCENT_PRESETS.slice(1)) {
    const p = accentPalette(preset.id);
    const checks = [
      [p["--action-custom"], LIGHT_PAPER, 3, "light mark"],
      [p["--action-text-custom"], LIGHT_PAPER, 4.5, "light text"],
      [p["--action-custom-dark"], DARK_PAPER, 3, "dark mark"],
      [p["--action-text-custom-dark"], DARK_PAPER, 4.5, "dark text"],
    ];
    for (const [hex, paper, min, label] of checks) {
      const ratio = contrast(rgb(hex), paper);
      assert.ok(ratio >= min - 0.01, `${preset.name} ${label}: ${ratio.toFixed(2)}`);
    }
    for (const [bg, on] of [["--action-custom", "--on-action-custom"], ["--action-custom-dark", "--on-action-custom-dark"]]) {
      const ratio = contrast(rgb(p[bg]), rgb(p[on]));
      assert.ok(ratio >= 3, `${preset.name} ${on}: ${ratio.toFixed(2)}`);
    }
  }
  assert.equal(accentPalette(""), null);
});

test("默认直角：五档矩形圆角都是 0；圆角模式 4/6/10/14/999；语义圆不跟开关", () => {
  for (const key of ["--r-xs", "--r-sm", "--r-md", "--r-lg", "--r-pill"]) assert.equal(base[key], "0px", key);
  assert.deepEqual(
    ["--r-xs", "--r-sm", "--r-md", "--r-lg", "--r-pill"].map((k) => rounded[k]),
    ["4px", "6px", "10px", "14px", "999px"],
  );
  assert.equal(base["--r-circle"], "50%");
  assert.ok(!("--r-circle" in rounded));
});

test("字重只有 400 / 500 / 600", () => {
  const weights = Object.entries(base).filter(([k]) => k.startsWith("--weight-")).map(([, v]) => v);
  assert.deepEqual(weights.sort(), ["400", "500", "600"]);
});

test("暗色是暖黑", () => {
  assert.equal(dark["--bg"], "#171612");
  assert.equal(dark["--paper"], "#201f1a");
});

test("Shadow 版本：:root → :host", () => {
  const shadow = toShadow(css);
  assert.ok(!/:root/.test(shadow.replace(/\/\*[\s\S]*?\*\//g, "")));
  assert.match(shadow, /:host\(\[data-theme="dark"\]\[data-accent\]\)/);
  assert.match(shadow, /:host\(\[data-corners="rounded"\]\)/);
});

function fakeElement() {
  const attrs = new Map();
  const style = new Map();
  return {
    attrs,
    style: { setProperty: (k, v) => style.set(k, v), removeProperty: (k) => style.delete(k), map: style },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => attrs.get(k) ?? null,
  };
}

test("applySettings：默认直角、墨色；lock 覆盖用户设置", () => {
  const el = fakeElement();
  applySettings({}, { element: el });
  assert.equal(el.getAttribute("data-corners"), "square");
  assert.equal(el.getAttribute("data-theme"), "light");
  assert.equal(el.getAttribute("data-mode"), "light");
  assert.equal(el.getAttribute("data-accent"), null);

  applySettings({ theme: "dark", corners: "rounded", accent: "#3b74b8", density: "compact" }, { element: el, lock: { corners: "square" } });
  assert.equal(el.getAttribute("data-theme"), "dark");
  assert.equal(el.getAttribute("data-corners"), "square");
  assert.equal(el.getAttribute("data-density"), "compact");
  assert.equal(el.getAttribute("data-accent"), "");
  assert.ok(el.style.map.get("--action-custom"));

  applySettings({ accent: "" }, { element: el });
  assert.equal(el.getAttribute("data-accent"), null);
  assert.equal(el.style.map.size, 0);
});

test("resolveTheme", () => {
  assert.equal(resolveTheme("dark"), "dark");
  assert.equal(resolveTheme(undefined), "light");
  assert.ok(["light", "dark"].includes(resolveTheme("system")));
});
