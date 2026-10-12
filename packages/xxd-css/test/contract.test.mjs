// CSS 合同（DESIGN-PRINCIPLES §3 §5 §6 §8）：能机器检查的审美规则都在这里。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "../src/css");
const files = Object.fromEntries(readdirSync(dir).map((f) => [f, readFileSync(join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")]));

/** 粗粒度规则解析：[{ file, selector, decls: [[prop, value]] }] */
function rules() {
  const out = [];
  for (const [file, css] of Object.entries(files)) {
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const selector = m[1].trim().replace(/\s+/g, " ");
      const decls = [...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim().replace(/\s+/g, " ")]);
      out.push({ file, selector, decls });
    }
  }
  return out;
}
const all = rules();

describe("圆角只走令牌", () => {
  it("border-radius 只能是 var(--r-*)、0、inherit 或基于 --r-* 的 calc", () => {
    const bad = [];
    for (const r of all)
      for (const [p, v] of r.decls)
        if (/radius/.test(p) && !/^(0|inherit|var\(--r-[a-z]+\)|calc\(var\(--r-[a-z]+\) - \d+px\))$/.test(v)) bad.push(`${r.file} ${r.selector} ${p}: ${v}`);
    expect(bad).toEqual([]);
  });

  it("语义圆（单选、状态点、头像、色块、spinner）用 --r-circle；开关用 --r-pill", () => {
    const radius = (sel) => all.filter((r) => r.selector === sel).flatMap((r) => r.decls).find(([p]) => p === "border-radius")?.[1];
    expect(radius(".xxd-radio")).toBe("var(--r-circle)");
    expect(radius(".xxd-switch")).toBe("var(--r-pill)");
    expect(radius(".xxd-switch::before")).toBe("var(--r-pill)");
    expect(radius(".xxd-check")).toBe("var(--r-xs)");
  });
});

describe("阴影只给浮层", () => {
  const FLOATING = /xxd-(dialog|sheet|menu|popover|tooltip|toast|panel|listbox|surface-float)\b/;
  it("非浮层只允许 0 模糊的描边环（box-shadow: 0 0 0 Npx / inset）", () => {
    const bad = [];
    for (const r of all)
      for (const [p, v] of r.decls) {
        if (p !== "box-shadow" || v === "none") continue;
        if (FLOATING.test(r.selector)) continue;
        const rings = v.split(/,(?![^(]*\))/).every((part) => /^\s*(inset\s+)?0 0 0 [\d.]+px\b/.test(part.trim()) || /^inset 0 0 0 /.test(part.trim()));
        if (!rings) bad.push(`${r.file} ${r.selector}: ${v}`);
      }
    expect(bad).toEqual([]);
  });
});

describe("字重只有 400 / 500 / 600", () => {
  it("font-weight 与 font 简写里的字重", () => {
    const bad = [];
    for (const r of all)
      for (const [p, v] of r.decls) {
        if (p === "font-weight" && !/^(var\(--weight-(regular|medium|strong)\)|400|500|600|inherit)$/.test(v)) bad.push(`${r.selector} ${v}`);
        if (p === "font" && /^\d{3}\b/.test(v) && !/^(400|500|600)\b/.test(v)) bad.push(`${r.selector} ${v}`);
      }
    expect(bad).toEqual([]);
  });
});

describe("动效只动 opacity / transform（颜色过渡用于状态变化）", () => {
  const ALLOWED = new Set(["opacity", "transform", "color", "background-color", "border-color", "visibility", "overlay", "display", "box-shadow"]);
  it("transition 的属性", () => {
    const bad = [];
    for (const r of all)
      for (const [p, v] of r.decls) {
        if (p !== "transition") continue;
        for (const part of v.split(/,(?![^(]*\))/)) {
          const prop = part.trim().split(" ")[0];
          if (!ALLOWED.has(prop)) bad.push(`${r.selector}: ${prop}`);
        }
      }
    expect(bad).toEqual([]);
  });

  it("@keyframes 里只有 transform / opacity", () => {
    const css = Object.values(files).join("\n");
    const bad = [];
    for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\}\s*)\}/g)) {
      for (const d of m[2].matchAll(/([\w-]+)\s*:/g)) if (!["transform", "opacity"].includes(d[1])) bad.push(`${m[1]}: ${d[1]}`);
    }
    expect(bad).toEqual([]);
  });

  it("没有弹跳缓动", () => {
    const css = Object.values(files).join("\n");
    expect(css).not.toMatch(/cubic-bezier\([^)]*,\s*1\.[1-9]/);
    expect(css).not.toMatch(/ease-bounce|spring/);
  });
});

describe("颜色来自令牌", () => {
  // 允许：白字放在实心语义色上、图片上的深色半透明控件、星标黄（会员站角标）、混色用的黑白。
  const ALLOW = new Set(["#ffffff", "#000000", "#f5b301"]);
  it("组件里没有其他写死的颜色", () => {
    const bad = [];
    for (const [file, css] of Object.entries(files)) {
      const body = css.replace(/url\("data:[^"]+"\)/g, "");
      for (const m of body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) if (!ALLOW.has(m[0].toLowerCase())) bad.push(`${file}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("对话框按钮层级", () => {
  it("ui-dialog-cancel 内容宽度、安静：不 flex-grow，不用实心主色", () => {
    const cancel = all.filter((r) => r.selector.includes("ui-dialog-cancel") && !r.selector.includes(":not(.ui-dialog-cancel)"));
    const decls = Object.fromEntries(cancel.flatMap((r) => r.decls));
    expect(decls.flex).toBe("none");
    expect(decls.width).toBe("auto");
    expect(cancel.some((r) => r.decls.some(([p, v]) => p === "background" && /--action|--danger/.test(v)))).toBe(false);
  });
});

describe("每个组件都在入口里", () => {
  it("index.css 引入了 css/ 下的每个文件", () => {
    const index = readFileSync(join(import.meta.dirname, "../src/index.css"), "utf8");
    for (const f of Object.keys(files)) expect(index).toContain(`./css/${f}`);
  });
});
