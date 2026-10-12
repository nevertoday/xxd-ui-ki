// 主色：一个颜色定整个界面的调子。移植自 xPoster src/accent-color.js（同一套算法与 18 个预设）。
// - 空值 = 墨色（默认），什么都不写。
// - 太浅的颜色在亮纸上压暗一点、太深的在暗纸上提亮一点，直到 3:1，保证按钮和标记看得见。
// - 「标记」（开关、tab 下划线、选中、焦点）用原色，只保证在纸上 3:1。
// - 「实心底」（主按钮、实心徽标、勾选框）上面要放字：另算一个 fill，把原色压暗一点直到白字 4.5:1
//   （18 个预设最多压暗 22%）；压暗后在暗纸上不足 3:1 才改用近黑字。hover 色同样保证 4.5:1。
// - 另有一个更深的「文字版」（链接、小标签），在纸上达到 4.5:1。
// tokens.css 根据这些变量推出其余一切：hover/选中淡层、焦点、灰色和线条里的一点色调。

/** 第一个是默认墨色；其余是一圈色相里的安静颜色（暖 → 绿 → 蓝 → 紫 → 粉 → 灰），外加 X 蓝。name 是 i18n key。 */
export const ACCENT_PRESETS = Object.freeze(
  [
    { id: "", name: "Ink", zh: "墨色" },
    { id: "#d65f32", name: "Warm orange", zh: "暖橙" },
    { id: "#e07a5f", name: "Coral", zh: "珊瑚" },
    { id: "#c98a1a", name: "Amber", zh: "琥珀" },
    { id: "#9c7a4a", name: "Camel", zh: "驼色" },
    { id: "#7d8b3a", name: "Olive", zh: "橄榄" },
    { id: "#5a8a3c", name: "Moss", zh: "苔绿" },
    { id: "#3f9a6b", name: "Jade", zh: "玉绿" },
    { id: "#2a8a7a", name: "Teal", zh: "青绿" },
    { id: "#2f8fa8", name: "Peacock blue", zh: "孔雀蓝" },
    { id: "#1d9bf0", name: "X blue", zh: "X 蓝" },
    { id: "#3b74b8", name: "Lake blue", zh: "湖蓝" },
    { id: "#4f5fb8", name: "Indigo", zh: "靛蓝" },
    { id: "#7b61b0", name: "Wisteria", zh: "紫藤" },
    { id: "#a05aa6", name: "Grape", zh: "葡萄紫" },
    { id: "#cf5d8a", name: "Sakura pink", zh: "樱粉" },
    { id: "#c4495a", name: "Rouge", zh: "胭脂" },
    { id: "#5f7380", name: "Misty slate", zh: "雾灰蓝" },
  ].map((preset) => Object.freeze(preset)),
);

export const LIGHT_PAPER = [255, 255, 255];
export const DARK_PAPER = [32, 31, 26];

export function normalizeAccent(value) {
  const hex = String(value || "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/.test(hex)) return `#${hex.slice(1).split("").map((c) => c + c).join("")}`;
  return "";
}

export function toRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

const clampRgb = (rgb) => rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))));
const toHex = (rgb) => `#${clampRgb(rgb).map((v) => v.toString(16).padStart(2, "0")).join("")}`;

export function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const mix = (rgb, toward, t) => rgb.map((v, i) => v + (toward[i] - v) * t);

/** 向黑/白一步步靠近，直到在这张纸上达到需要的对比度。 */
export function ensureContrast(rgb, paper, toward, min = 3) {
  let next = rgb;
  for (let t = 0.04; t <= 0.9 && contrast(next, paper) < min; t += 0.04) next = mix(rgb, toward, t);
  return clampRgb(next);
}

const WHITE = [255, 255, 255];
const NEAR_BLACK = [17, 17, 17];

/** 实心底：白字 ≥ 4.5（压暗原色），同时在这张纸上仍是 ≥ 3 的标记；做不到就用近黑字。 */
export function accentFill(mark, paper) {
  if (contrast(mark, WHITE) >= 4.5) return { fill: mark, on: WHITE };
  for (let t = 0.02; t <= 0.4; t += 0.02) {
    const next = clampRgb(mix(mark, [0, 0, 0], t));
    if (contrast(next, WHITE) >= 4.5 && contrast(next, paper) >= 3) return { fill: next, on: WHITE };
  }
  return { fill: mark, on: NEAR_BLACK };
}

/** hover：先试着往纸色淡 10%，字仍 ≥ 4.5 就用；否则往反方向加深 10%。 */
export function accentFillHover(fill, on, paper) {
  const lighter = clampRgb(mix(fill, paper, 0.1));
  if (contrast(lighter, on) >= 4.5) return lighter;
  return clampRgb(mix(fill, on === WHITE ? [0, 0, 0] : WHITE, 0.1));
}

export const ACCENT_KEYS = Object.freeze([
  "action-custom",
  "action-rgb-custom",
  "on-action-custom",
  "action-text-custom",
  "action-fill-custom",
  "action-fill-hover-custom",
  "action-custom-dark",
  "action-rgb-custom-dark",
  "on-action-custom-dark",
  "action-text-custom-dark",
  "action-fill-custom-dark",
  "action-fill-hover-custom-dark",
]);

/** 一个主色的全部变量；墨色返回 null。prefix 用于作用域（如注入第三方页面时用 "xxd-"）。 */
export function accentPalette(value, prefix = "") {
  const hex = normalizeAccent(value);
  if (!hex) return null;
  const base = toRgb(hex);
  const light = ensureContrast(base, LIGHT_PAPER, [0, 0, 0]);
  const dark = ensureContrast(base, DARK_PAPER, [255, 255, 255]);
  // 文字版要在纸上和「选中底」（tokens.css 的 --selected-bg：亮 13%、暗 18% 主色）上都 ≥ 4.5
  const lightText = ensureContrast(base, clampRgb(mix(LIGHT_PAPER, light, 0.13)), [0, 0, 0], 4.5);
  const darkText = ensureContrast(base, clampRgb(mix(DARK_PAPER, dark, 0.18)), [255, 255, 255], 4.5);
  const lightFill = accentFill(light, LIGHT_PAPER);
  const darkFill = accentFill(dark, DARK_PAPER);
  const name = (key) => `--${prefix}${key}`;
  return {
    [name("action-custom")]: toHex(light),
    [name("action-rgb-custom")]: light.join(", "),
    [name("on-action-custom")]: toHex(lightFill.on),
    [name("action-text-custom")]: toHex(lightText),
    [name("action-fill-custom")]: toHex(lightFill.fill),
    [name("action-fill-hover-custom")]: toHex(accentFillHover(lightFill.fill, lightFill.on, LIGHT_PAPER)),
    [name("action-custom-dark")]: toHex(dark),
    [name("action-rgb-custom-dark")]: dark.join(", "),
    [name("on-action-custom-dark")]: toHex(darkFill.on),
    [name("action-text-custom-dark")]: toHex(darkText),
    [name("action-fill-custom-dark")]: toHex(darkFill.fill),
    [name("action-fill-hover-custom-dark")]: toHex(accentFillHover(darkFill.fill, darkFill.on, DARK_PAPER)),
  };
}

/** 写到元素上（页面里是 <html>，Shadow DOM 里是 host）。返回生效的 hex，墨色返回 ""。 */
export function applyAccent(element, value, { attr = "data-accent", prefix = "" } = {}) {
  if (!element?.style) return "";
  const vars = accentPalette(value, prefix);
  if (!vars) {
    element.removeAttribute(attr);
    ACCENT_KEYS.forEach((key) => element.style.removeProperty(`--${prefix}${key}`));
    return "";
  }
  Object.entries(vars).forEach(([key, v]) => element.style.setProperty(key, v));
  element.setAttribute(attr, "");
  return normalizeAccent(value);
}
