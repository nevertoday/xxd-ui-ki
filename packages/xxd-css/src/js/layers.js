// Sheet（从 dock 升起）与右侧详情面板。都支持 Esc 关闭、点遮罩关闭、关闭后焦点回到打开它的按钮。
import { emit, focusables } from "./dom.js";

const returnTo = new WeakMap();
const stack = [];

function scrimFor(layer) {
  if (layer.classList.contains("xxd-sheet")) return layer.closest(".xxd-sheet-host")?.querySelector(":scope > .xxd-scrim");
  let scrim = layer.previousElementSibling;
  if (!scrim || !scrim.classList.contains("xxd-panel-scrim")) {
    scrim = layer.ownerDocument.createElement("div");
    scrim.className = "xxd-panel-scrim";
    layer.before(scrim);
  }
  return scrim;
}

export function openLayer(layer) {
  if (!layer || layer.hasAttribute("data-open")) return;
  returnTo.set(layer, layer.getRootNode().activeElement);
  layer.setAttribute("data-open", "");
  layer.setAttribute("aria-hidden", "false");
  scrimFor(layer)?.setAttribute("data-open", "");
  layer.closest(".xxd-sheet-host")?.setAttribute("data-sheet-open", "");
  stack.push(layer);
  (focusables(layer)[0] || layer).focus({ preventScroll: true });
  emit(layer, "xxd:open");
}

export function closeLayer(layer) {
  if (!layer || !layer.hasAttribute("data-open")) return;
  layer.removeAttribute("data-open");
  layer.setAttribute("aria-hidden", "true");
  scrimFor(layer)?.removeAttribute("data-open");
  layer.closest(".xxd-sheet-host")?.removeAttribute("data-sheet-open");
  const i = stack.lastIndexOf(layer);
  if (i >= 0) stack.splice(i, 1);
  const prev = returnTo.get(layer);
  if (prev?.isConnected) prev.focus({ preventScroll: true });
  emit(layer, "xxd:close");
}

export const openSheet = openLayer;
export const closeSheet = closeLayer;
export const openPanel = openLayer;
export const closePanel = closeLayer;

export function installLayers(root, byId, closestFrom) {
  root.addEventListener("click", (event) => {
    const opener = closestFrom(event, "[data-xxd-sheet-open], [data-xxd-panel-open]");
    if (opener) {
      const layer = byId(opener, opener.getAttribute("data-xxd-sheet-open") || opener.getAttribute("data-xxd-panel-open"));
      if (layer?.hasAttribute("data-open")) closeLayer(layer);
      else openLayer(layer);
      return;
    }
    const closer = closestFrom(event, "[data-xxd-sheet-close], [data-xxd-panel-close]");
    if (closer) return closeLayer(closer.closest(".xxd-sheet, .xxd-panel"));
    const scrim = closestFrom(event, ".xxd-scrim[data-open], .xxd-panel-scrim[data-open]");
    if (scrim) {
      const layer = scrim.classList.contains("xxd-panel-scrim")
        ? scrim.nextElementSibling
        : scrim.closest(".xxd-sheet-host")?.querySelector(".xxd-sheet[data-open]");
      closeLayer(layer);
    }
  });
  // 焦点陷阱（I15）：sheet / 面板打开时，Tab 在里面循环
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !stack.length) return;
    const top = stack[stack.length - 1];
    const items = focusables(top);
    if (!items.length) return;
    const active = top.getRootNode().activeElement;
    const first = items[0];
    const last = items[items.length - 1];
    if (!top.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !stack.length) return;
    if (event.defaultPrevented) return;
    const top = stack[stack.length - 1];
    if (top.contains(event.target) || top.getRootNode().activeElement === event.target || event.target === document.body) {
      event.preventDefault();
      closeLayer(top);
    }
  });
}
