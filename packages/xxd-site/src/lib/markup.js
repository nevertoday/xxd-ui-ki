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
  default: { label: "默认", attrs: "" },
  hover: { label: "悬停", attrs: 'data-force="hover"' },
  focus: { label: "键盘聚焦", attrs: 'data-force="focus"' },
  active: { label: "按下", attrs: 'data-force="active hover"' },
  pressed: { label: "选中", attrs: 'aria-pressed="true"' },
  checked: { label: "选中", attrs: "checked" },
  disabled: { label: "禁用", attrs: "disabled" },
  busy: { label: "进行中", attrs: 'aria-busy="true"' },
  error: { label: "出错", attrs: 'aria-invalid="true"' },
  readonly: { label: "只读", attrs: "readonly" },
};
