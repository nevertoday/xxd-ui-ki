// 小工具：给示例的第一个元素加属性（状态矩阵用）、从 React 演示文件里抽出某个函数的源码（像 Kumo 的 extract-demo-snippet）。
export function withAttr(markup, attrs) {
  return markup.replace(/^(\s*<[a-zA-Z][\w-]*)/, `$1 ${attrs}`);
}

/**
 * 嵌进展示站页面里的活示例：示例自己的 <main> / <aside> 是给真实整页用的，
 * 放进站点的 <main> 里会变成「两个 main」「main 套在 landmark 里」——换成 div（代码视图里仍是原文）。
 */
export function embed(markup) {
  return markup.replace(/<(\/?)(main|aside)\b/g, (_, slash, tag) => (slash ? "</div" : `<div data-landmark="${tag}"`));
}

let uid = 0;
export const nextId = (p = "d") => `${p}${++uid}`;

export function extractFunction(source, name) {
  const start = source.indexOf(`export function ${name}(`);
  if (start === -1) return "";
  const rest = source.slice(start);
  const next = rest.slice(1).search(/\nexport (function|const) /);
  const body = next === -1 ? rest : rest.slice(0, next + 1);
  return body.trim();
}

/** 状态矩阵的状态：每个都是「怎么改示例元素」 */
export const STATES = {
  default: { label: "默认", en: "Default", attrs: "" },
  hover: { label: "悬停", en: "Hover", attrs: 'data-force="hover"' },
  focus: { label: "键盘聚焦", en: "Keyboard focus", attrs: 'data-force="focus"' },
  active: { label: "按下", en: "Pressed", attrs: 'data-force="active hover"' },
  pressed: { label: "选中", en: "Selected", attrs: 'aria-pressed="true"' },
  checked: { label: "选中", en: "Checked", attrs: "checked" },
  disabled: { label: "禁用", en: "Disabled", attrs: "disabled" },
  busy: { label: "进行中", en: "Busy", attrs: 'aria-busy="true"' },
  error: { label: "出错", en: "Error", attrs: 'aria-invalid="true"' },
  readonly: { label: "只读", en: "Read-only", attrs: "readonly" },
};

/**
 * 注册表里的说明是纯文字。显示时先转义，再把代码名包成行内代码：令牌（--muted）、类名（.xxd-row）、
 * 属性（aria-pressed="true"、data-copy、role=switch）、标签（<select>）、调用（Xxd.toast(...)）。
 * 这样它们看得出是代码，也不会在「--」「-」后面断行。
 */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const CODE = /(--[a-z0-9][\w-]*|(?:\b[a-z]+)?\.xxd-[\w-]+|\b(?:aria|data)-[a-z][\w-]*(?:=(?:&quot;|")[^"&]*(?:&quot;|"))?|\brole=(?:"[^"]*"|[a-z]+)|&lt;\/?[a-z][a-z0-9-]*(?:\s[^&]*?)?&gt;|\bXxd(?:Extension)?\.\w+(?:\([^)]*\))?)/g;
export function richText(s) {
  // 短的代码名整体不断开；长的（整段标签）照常可以换行，免得在手机上撑出屏幕
  return esc(s).replace(CODE, (m) => `<code class="xxd-code-inline${m.length <= 24 ? " site-token" : ""}">${m}</code>`);
}
