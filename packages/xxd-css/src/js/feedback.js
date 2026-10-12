// Tooltip、Toast、复制。
import { place } from "./floating.js";
import { nextId } from "./dom.js";
import { ICON } from "./icons-min.js";

/* ── Tooltip：[data-tooltip="说明"]，可选 data-tooltip-placement="bottom" ── */
let tip = null;
let tipTimer = 0;
let tipAnchor = null;

function ensureTip(doc) {
  if (tip && tip.isConnected) return tip;
  tip = doc.createElement("div");
  tip.className = "xxd-tooltip";
  tip.id = nextId("xxd-tip");
  tip.setAttribute("role", "tooltip");
  doc.body.append(tip);
  return tip;
}

export function showTooltip(anchor) {
  const text = anchor.getAttribute("data-tooltip");
  if (!text) return;
  const el = ensureTip(anchor.ownerDocument);
  el.textContent = text;
  tipAnchor = anchor;
  anchor.setAttribute("aria-describedby", el.id);
  place(anchor, el, { placement: anchor.getAttribute("data-tooltip-placement") || "top", offset: 6 });
  el.setAttribute("data-open", "");
}

export function hideTooltip() {
  clearTimeout(tipTimer);
  if (!tip) return;
  tip.removeAttribute("data-open");
  if (tipAnchor) tipAnchor.removeAttribute("aria-describedby");
  tipAnchor = null;
}

export function installTooltips(root, closestFrom) {
  root.addEventListener("pointerover", (event) => {
    const anchor = closestFrom(event, "[data-tooltip]");
    if (!anchor || anchor === tipAnchor) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => showTooltip(anchor), tip?.hasAttribute("data-open") ? 0 : 400);
  });
  root.addEventListener("pointerout", (event) => {
    const anchor = closestFrom(event, "[data-tooltip]");
    if (anchor && !anchor.contains(event.relatedTarget)) hideTooltip();
  });
  root.addEventListener("focusin", (event) => {
    const anchor = closestFrom(event, "[data-tooltip]");
    if (anchor) showTooltip(anchor);
  });
  root.addEventListener("focusout", hideTooltip);
  root.addEventListener("pointerdown", hideTooltip);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideTooltip();
  });
  globalThis.addEventListener?.("scroll", hideTooltip, true);
}

/* ── Toast：就地出现 ── */
const regions = new WeakMap();

function regionFor(within) {
  const doc = within?.ownerDocument || document;
  const host = within && within !== doc.body ? within : doc.body;
  let region = regions.get(host);
  if (region?.isConnected) return region;
  region = doc.createElement("div");
  region.className = "xxd-toast-region";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  if (host !== doc.body) {
    region.setAttribute("data-scoped", "");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
  }
  host.append(region);
  regions.set(host, region);
  return region;
}

/**
 * toast("已保存")；toast("写入失败", { tone: "danger", within: panelEl, action: { label: "重试", onClick } })
 * within：在哪个容器里出现（右侧面板里的操作，toast 就出现在面板里）。
 */
export function toast(message, { tone = "neutral", within, duration = 2600, action } = {}) {
  const region = regionFor(within);
  const el = region.ownerDocument.createElement("div");
  el.className = "xxd-toast";
  el.dataset.tone = tone;
  const icon = { success: ICON.success, danger: ICON.danger, warning: ICON.warning }[tone];
  if (icon) el.insertAdjacentHTML("beforeend", icon(16));
  const text = region.ownerDocument.createElement("span");
  text.textContent = message;
  el.append(text);
  if (action?.label) {
    const btn = region.ownerDocument.createElement("button");
    btn.className = "xxd-btn xxd-toast__action";
    btn.dataset.variant = "ghost";
    btn.dataset.size = "sm";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      action.onClick?.();
      dismiss();
    });
    el.append(btn);
  }
  region.append(el);
  let timer = duration > 0 ? setTimeout(dismiss, duration) : 0;
  el.addEventListener("pointerenter", () => clearTimeout(timer));
  el.addEventListener("pointerleave", () => {
    if (duration > 0) timer = setTimeout(dismiss, 1200);
  });
  function dismiss() {
    clearTimeout(timer);
    if (!el.isConnected) return;
    el.setAttribute("data-leaving", "");
    setTimeout(() => el.remove(), 140);
  }
  return { element: el, dismiss };
}

/* ── 复制：[data-copy="文本"] 或 [data-copy-target="#selector"]；完成后图标变勾一会儿 ── */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function installCopy(root, closestFrom) {
  root.addEventListener("click", async (event) => {
    const btn = closestFrom(event, "[data-copy], [data-copy-target]");
    if (!btn) return;
    const targetSel = btn.getAttribute("data-copy-target");
    const text = targetSel ? btn.getRootNode().querySelector(targetSel)?.textContent ?? "" : btn.getAttribute("data-copy");
    const ok = await copyText(text);
    if (!ok) return toast(btn.getAttribute("data-copy-failed") || "复制失败", { tone: "danger" });
    const icon = btn.querySelector(".ui-icon");
    const original = icon?.outerHTML;
    if (icon) icon.outerHTML = ICON.check(Number(icon.getAttribute("width")) || 16);
    btn.setAttribute("data-done", "");
    if (btn.hasAttribute("data-copy-toast")) toast(btn.getAttribute("data-copy-toast") || "已复制", { tone: "success" });
    setTimeout(() => {
      btn.removeAttribute("data-done");
      const now = btn.querySelector(".ui-icon");
      if (now && original) now.outerHTML = original;
    }, 1200);
  });
}
