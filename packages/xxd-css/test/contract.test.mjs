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
        if (/radius/.test(p) && !/^(0|inherit|var\(--r-[a-z]+\)|calc\(var\(--r-[a-z]+\) - \d+px\)|var\(--outer-r\)|max\(0px, calc\(var\(--outer-r\) - var\(--pad\)\)\))$/.test(v)) bad.push(`${r.file} ${r.selector} ${p}: ${v}`);
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
  const FLOATING = /xxd-(dialog|sheet|menu|popover|tooltip|toast|panel|listbox|surface-float)\b|xxd-surface\[data-level="raised"\]|xxd-sidebar\[data-variant="floating"\]/;
  it("非浮层只允许 0 模糊的描边环（box-shadow: 0 0 0 Npx / inset）", () => {
    const bad = [];
    for (const r of all)
      for (const [p, v] of r.decls) {
        if (p !== "box-shadow" || v === "none") continue;
        if (FLOATING.test(r.selector)) continue;
        // 质感模式（D1）：实心按钮顶部 1px 内高光，是材质不是浮起
        if (r.selector.includes('data-finish="material"') && /^inset 0 1px 0 rgba\(255, 255, 255, 0\.\d+\)$/.test(v)) continue;
        // 允许的是「零模糊」的描边 / 分隔线（没有投影）：第三个长度（模糊）必须是 0
        const rings = v.split(/,(?![^(]*\))/).every((part) => {
          const lengths = part.replace(/(rgba?|color-mix|var)\([^)]*\)+/g, "").replace("inset", "").trim().split(/\s+/).filter((t) => /^-?[\d.]+(px)?$/.test(t));
          return lengths.length >= 2 && (lengths[2] === undefined || parseFloat(lengths[2]) === 0);
        });
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
        if (p !== "transition" || v === "none") continue;
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

describe("hover 进入立即、离开淡回（D2）", () => {
  it("每个带颜色过渡的组件根类都在 interaction.css 的 :hover 清零列表里", () => {
    const list = files["interaction.css"].match(/:is\(([\s\S]*?)\):hover\s*\{\s*transition-duration:\s*0s/)[1];
    const instant = new Set([...list.matchAll(/\.(xxd-[\w-]+)/g)].map((m) => m[1]));
    const colorTransitions = all
      .filter((r) => r.decls.some(([p, v]) => p === "transition" && /(background-color|border-color|(^|[\s,])color)\b/.test(v)))
      .map((r) => r.selector.match(/\.(xxd-[\w-]+)/)?.[1])
      .filter(Boolean);
    const missing = [...new Set(colorTransitions)].filter((k) => !instant.has(k) && !["xxd-scrim", "xxd-panel-scrim", "xxd-tooltip", "xxd-bubble"].includes(k));
    expect(missing).toEqual([]);
  });

  it("浮层（菜单 / popover / tooltip）出现时只缩放和淡入，原点跟着锚点", () => {
    expect(files["overlay.css"]).toMatch(/transform-origin: var\(--xxd-origin/);
    expect(files["overlay.css"]).toMatch(/\.xxd-menu:not\(:popover-open\)[\s\S]*?transform: scale\(0\.96\)/);
  });
});
