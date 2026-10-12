// SVG 字符串渲染：给原生 JS 项目（插件、会员站）用。
import { ICON_ALIASES, ICON_ATTRIBUTES, ICON_NODES } from "./nodes.js";

export { ICON_ALIASES, ICON_ATTRIBUTES, ICON_NODES };

export const ICON_NAMES = Object.freeze(Object.keys(ICON_NODES));

const escapeAttr = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** 解析名字（含别名）；找不到返回 null。 */
export function resolveIcon(name) {
  const key = ICON_NODES[name] ? name : ICON_ALIASES[name];
  return key ? ICON_NODES[key] : null;
}

function nodeToString([tag, attrs]) {
  const pairs = Object.entries(attrs).map(([key, value]) => `${key}="${escapeAttr(value)}"`);
  return `<${tag} ${pairs.join(" ")}/>`;
}

/**
 * 返回 `<svg class="ui-icon">…</svg>`。
 * @param {string} name 图标名（如 "Check"、"ChevronDown"，或别名）
 * @param {{ size?: number, className?: string, label?: string }} [options]
 *   label 有值时图标可被读屏读出（role="img"），否则 aria-hidden。
 */
export function iconSVG(name, { size = 16, className = "", label = "" } = {}) {
  const nodes = resolveIcon(name);
  if (!nodes) throw new Error(`@xxd/icons: unknown icon "${name}"`);
  const attrs = Object.entries(ICON_ATTRIBUTES).map(([key, value]) => `${key}="${value}"`).join(" ");
  const a11y = label ? `role="img" aria-label="${escapeAttr(label)}"` : `aria-hidden="true" focusable="false"`;
  const cls = ["ui-icon", className].filter(Boolean).join(" ");
  return `<svg class="${escapeAttr(cls)}" width="${size}" height="${size}" viewBox="0 0 24 24" ${attrs} ${a11y}>${nodes.map(nodeToString).join("")}</svg>`;
}

/** 把 `<i data-xxd-icon="Check" data-size="16">` 换成 SVG。返回替换数量。 */
export function hydrateIcons(root = globalThis.document) {
  if (!root?.querySelectorAll) return 0;
  let count = 0;
  for (const el of root.querySelectorAll("[data-xxd-icon]")) {
    const name = el.getAttribute("data-xxd-icon");
    if (!resolveIcon(name)) continue;
    const size = Number(el.getAttribute("data-size")) || 16;
    const label = el.getAttribute("aria-label") || "";
    el.outerHTML = iconSVG(name, { size, className: el.className || "", label });
    count += 1;
  }
  return count;
}
