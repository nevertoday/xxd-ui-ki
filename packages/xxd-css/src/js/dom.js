// 小工具：事件目标（穿透 Shadow DOM）、按 id 找元素、可聚焦元素。
export const targetOf = (event) => (event.composedPath ? event.composedPath()[0] : event.target);

export function closestFrom(event, selector) {
  const t = targetOf(event);
  return t && t.closest ? t.closest(selector) : null;
}

export function byId(from, id) {
  if (!id) return null;
  const root = from?.getRootNode ? from.getRootNode() : document;
  return (root.getElementById && root.getElementById(id)) || document.getElementById(id);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusables(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest("[hidden]") && el.getClientRects().length);
}

export function emit(el, name, detail) {
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
}

let uid = 0;
export const nextId = (prefix = "xxd") => `${prefix}-${++uid}`;

export function reducedMotion() {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

/** 等 CSS 过渡结束再执行（减少动效或没有过渡时立即执行）。 */
export function afterTransition(el, fn, fallback = 260) {
  if (reducedMotion()) return fn();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener("transitionend", finish);
    fn();
  };
  el.addEventListener("transitionend", finish);
  setTimeout(finish, fallback);
}

/** 浮层挂在哪：锚点在 Shadow 里就是那个 ShadowRoot，否则是 body。 */
export function layerRoot(node) {
  const doc = node.ownerDocument || document;
  const root = node.getRootNode?.();
  return root && root !== doc && root.nodeType === 11 ? root : doc.body;
}
