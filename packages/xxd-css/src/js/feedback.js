// Tooltip、Toast、复制。
import { place } from "./floating.js";
import { defaultLayerRoot, layerRoot, nextId } from "./dom.js";
import { ICON } from "./icons-min.js";
import { t } from "./i18n.js";

/* ── Tooltip：[data-tooltip="说明"]，可选 data-tooltip-placement="bottom" ── */
let tip = null;
let tipTimer = 0;
let tipAnchor = null;
let tipHiddenAt = 0;
// tooltip 组（I5）：刚关掉的 300ms 内移到别的按钮，立即出现、原地换字
const GROUP_WINDOW = 300;

// 每个根（document / 每个 ShadowRoot）一个 tooltip：放进锚点所在的 Shadow 里，才吃得到 Shadow 里的样式，
// aria-describedby 也才能指过去（id 引用不跨 Shadow 边界）。
const tips = new WeakMap();

function ensureTip(anchor) {
  const container = layerRoot(anchor);
  let el = tips.get(container);
  if (!el?.isConnected) {
    el = anchor.ownerDocument.createElement("div");
    el.className = "xxd-tooltip";
    el.id = nextId("xxd-tip");
    el.setAttribute("role", "tooltip");
    // 进顶层：对话框里的按钮、注入到别人网页里的界面，提示都不会被盖住
    if (typeof el.showPopover === "function") el.popover = "manual";
    container.append(el);
    tips.set(container, el);
  }
  if (tip && tip !== el) tip.removeAttribute("data-open");
  tip = el;
  return el;
}

export function showTooltip(anchor) {
  const text = anchor.getAttribute("data-tooltip");
  if (!text) return;
  const el = ensureTip(anchor);
  const instant = el.hasAttribute("data-open") || Date.now() - tipHiddenAt < GROUP_WINDOW;
  el.textContent = text;
  el.toggleAttribute("data-arrow", anchor.hasAttribute("data-tooltip-arrow"));
  tipAnchor = anchor;
  anchor.setAttribute("aria-describedby", el.id);
  toTop(el);
  place(anchor, el, { placement: anchor.getAttribute("data-tooltip-placement") || "top", offset: anchor.hasAttribute("data-tooltip-arrow") ? 9 : 6 });
  el.toggleAttribute("data-instant", instant);
  el.setAttribute("data-open", "");
}

export function hideTooltip() {
  clearTimeout(tipTimer);
  if (!tip) return;
  // 只有真的在屏幕上的才算「刚关掉」（已经被移出文档的不算）
  if (tip.hasAttribute("data-open") && tip.isConnected) tipHiddenAt = Date.now();
  tip.removeAttribute("data-open");
  if (tipAnchor) tipAnchor.removeAttribute("aria-describedby");
  tipAnchor = null;
  // 淡出之后再离开顶层
  const el = tip;
  setTimeout(() => !el.hasAttribute("data-open") && el.matches?.(":popover-open") && el.hidePopover(), 120);
}

/** 放到顶层的最上面（后打开的对话框会盖住先放进顶层的东西：每次重新放一次）。 */
function toTop(el) {
  if (!el.popover || typeof el.showPopover !== "function") return;
  // 焦点在里面（Alt+T 跳进来了）就不动它：重新放会把焦点弄丢
  if (el.matches(":popover-open") && el.contains(el.getRootNode().activeElement)) return;
  try {
    if (el.matches(":popover-open")) el.hidePopover();
    el.showPopover();
  } catch {
    // 不在文档里、或浏览器不支持：留在原处
  }
}

export function installTooltips(root, closestFrom) {
  root.addEventListener("pointerover", (event) => {
    const anchor = closestFrom(event, "[data-tooltip]");
    if (!anchor || anchor === tipAnchor) return;
    clearTimeout(tipTimer);
    const grouped = tip?.hasAttribute("data-open") || Date.now() - tipHiddenAt < GROUP_WINDOW;
    tipTimer = setTimeout(() => showTooltip(anchor), grouped ? 0 : 400);
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
    if (event.key !== "Escape" || !tip?.hasAttribute("data-open")) return;
    // 这一下 Esc 只关提示，不连带关掉它所在的对话框 / 面板（WCAG 1.4.13）
    event.preventDefault();
    event.stopPropagation();
    hideTooltip();
  });
  globalThis.addEventListener?.("scroll", hideTooltip, true);
}

/* ── Toast：就地出现 ── */
const regions = new WeakMap();

function regionFor(within) {
  within ??= defaultLayerRoot();
  const doc = within?.ownerDocument || document;
  const host = within && within !== doc.body ? within : doc.body;
  let region = regions.get(host);
  if (region?.isConnected) return region;
  region = doc.createElement("div");
  region.className = "xxd-toast-region";
  // 一个有名字的区域（读屏能跳到），里面新加的 toast 会被念出来
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", t("notifications", null, host.nodeType === 1 ? host : doc.documentElement));
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-relevant", "additions");
  // 键盘聚焦进来时也要展开叠放（不然聚焦到的那张是 aria-hidden）
  region.addEventListener("focusin", () => restack(region));
  region.addEventListener("focusout", () => queueMicrotask(() => restack(region)));
  region.addEventListener("pointerenter", () => restack(region));
  region.addEventListener("pointerleave", () => restack(region));
  // within 是 ShadowRoot：当作一整页（固定在视口角上），不是容器
  if (host !== doc.body && host.nodeType === 1) {
    region.setAttribute("data-scoped", "");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
  }
  // 整页的 toast 区（body 或 ShadowRoot 里）进顶层；容器里的（面板里就地出现）不用
  if (!region.hasAttribute("data-scoped") && typeof region.showPopover === "function") region.popover = "manual";
  host.append(region);
  regions.set(host, region);
  return region;
}

/** 叠放：最新的在最前，后面两张往上缩一点；超过 3 张的藏起来（hover 展开时都出来）。 */
function restack(region) {
  if (!region.hasAttribute("data-stack")) return;
  const list = [...region.querySelectorAll(":scope > .xxd-toast:not([data-leaving])")];
  const open = region.contains(region.getRootNode().activeElement) || region.matches(":hover");
  list.forEach((t, n) => {
    const i = list.length - 1 - n;
    t.style.setProperty("--i", String(i));
    t.toggleAttribute("data-hidden-in-stack", i >= 3);
    t.setAttribute("aria-hidden", String(i > 0 && !open));
  });
}

const timers = new WeakMap();

/**
 * toast("已保存")；toast("写入失败", { tone: "danger", within: panelEl, action: { label: "重试", onClick } })
 * within：在哪个容器里出现（右侧面板里的操作，toast 就出现在面板里）。
 * 堆叠（I6）：多张叠成一摞，hover 展开；同一句话再来时不加新的，只轻轻动一下并重新计时；横向滑动关闭。
 * stack: false 时一张张排开（旧行为）。
 */
export function toast(message, { tone = "neutral", within, duration, action, stack = true } = {}) {
  // 带操作（撤销、重试）的要留够时间去点：缺省 10 秒（键盘用户还要按 Alt+T 跳过来）；只是告知的 2.6 秒
  duration ??= action?.label ? 10000 : 2600;
  const region = regionFor(within);
  region.toggleAttribute("data-stack", stack);
  const key = `${tone}\u0000${message}`;
  const existing = [...region.querySelectorAll(":scope > .xxd-toast:not([data-leaving])")].find((t) => t.dataset.key === key);
  if (existing) {
    existing.removeAttribute("data-bump");
    void existing.offsetWidth;
    existing.setAttribute("data-bump", "");
    region.append(existing);
    restack(region);
    timers.get(existing)?.restart();
    return { element: existing, dismiss: () => timers.get(existing)?.dismiss() };
  }
  const el = region.ownerDocument.createElement("div");
  el.className = "xxd-toast";
  el.dataset.tone = tone;
  el.dataset.key = key;
  const icon = { success: ICON.success, danger: ICON.danger, warning: ICON.warning, info: ICON.info }[tone];
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
  toTop(region);
  restack(region);

  let timer = 0;
  const restart = (ms = duration) => {
    clearTimeout(timer);
    if (ms > 0) timer = setTimeout(dismiss, ms);
  };
  restart();
  // 鼠标放上去、或键盘聚焦到 toast 里的按钮时暂停计时（WCAG 2.2.1）
  el.addEventListener("pointerenter", () => clearTimeout(timer));
  el.addEventListener("pointerleave", () => restart(1200));
  el.addEventListener("focusin", () => clearTimeout(timer));
  el.addEventListener("focusout", (event) => {
    if (!el.contains(event.relatedTarget)) restart(1200);
  });

  // 横向滑动关闭
  let startX = null;
  el.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    startX = event.clientX;
    el.setPointerCapture?.(event.pointerId);
  });
  el.addEventListener("pointermove", (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) < 4) return;
    el.setAttribute("data-swiping", "");
    el.style.setProperty("--swipe-x", `${dx}px`);
    el.style.setProperty("--swipe-p", String(Math.abs(dx) / 160));
  });
  const end = (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 80) return dismiss();
    el.removeAttribute("data-swiping");
    el.style.removeProperty("--swipe-x");
    el.style.removeProperty("--swipe-p");
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  function dismiss() {
    clearTimeout(timer);
    if (!el.isConnected || el.hasAttribute("data-leaving")) return;
    // 焦点在这张 toast 里：交还给按 Alt+T 之前的位置
    if (el.contains(el.getRootNode().activeElement)) (lastFocus.get(region)?.isConnected ? lastFocus.get(region) : null)?.focus({ preventScroll: true });
    el.setAttribute("data-leaving", "");
    restack(region);
    setTimeout(() => {
      el.remove();
      restack(region);
      if (!region.querySelector(".xxd-toast") && region.matches?.(":popover-open")) region.hidePopover();
    }, 140);
  }
  timers.set(el, { restart, dismiss });
  return { element: el, dismiss };
}

/* ── 键盘够得着 toast：Alt+T 跳到最新一张（有按钮就到按钮上，计时随之暂停），Esc 关掉它、焦点回到原处 ── */
const lastFocus = new WeakMap();

function latestToast(root) {
  const scope = root.querySelectorAll ? root : document;
  const all = [...scope.querySelectorAll(".xxd-toast-region > .xxd-toast:not([data-leaving])")];
  return all[all.length - 1] || null;
}

export function installToasts(root) {
  root.addEventListener("keydown", (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && (event.code === "KeyT" || event.key === "t" || event.key === "T")) {
      const el = latestToast(root);
      if (!el) return;
      event.preventDefault();
      const region = el.parentElement;
      lastFocus.set(region, el.getRootNode().activeElement);
      const target = el.querySelector("button") || el;
      if (target === el) el.tabIndex = -1;
      target.focus();
      return;
    }
    if (event.key === "Escape") {
      const el = event.target?.closest?.(".xxd-toast");
      if (!el) return;
      event.preventDefault();
      event.stopPropagation();
      timers.get(el)?.dismiss();
    }
  });
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
    if (!ok) return toast(btn.getAttribute("data-copy-failed") || t("copyFailed", null, btn), { tone: "danger" });
    const icon = btn.querySelector(".ui-icon");
    const original = icon?.outerHTML;
    if (icon) icon.outerHTML = ICON.check(Number(icon.getAttribute("width")) || 16);
    btn.setAttribute("data-done", "");
    showBubble(btn, btn.getAttribute("data-copy-done") || t("copied", null, btn));
    if (btn.hasAttribute("data-copy-toast")) toast(btn.getAttribute("data-copy-toast") || t("copied", null, btn), { tone: "success" });
    setTimeout(() => {
      btn.removeAttribute("data-done");
      const now = btn.querySelector(".ui-icon");
      if (now && original) now.outerHTML = original;
    }, 1200);
  });
}

/* ── 小气泡（复制成功等）：在元素上方淡入 1.2s（I7） ── */
let bubble = null;
let bubbleTimer = 0;
export function showBubble(anchor, text, { duration = 1200 } = {}) {
  const doc = anchor.ownerDocument;
  if (!bubble || !bubble.isConnected) {
    bubble = doc.createElement("div");
    bubble.className = "xxd-bubble";
    bubble.setAttribute("role", "status");
    bubble.setAttribute("aria-live", "polite");
  }
  if (bubble.parentNode !== layerRoot(anchor)) layerRoot(anchor).append(bubble);
  clearTimeout(bubbleTimer);
  bubble.textContent = text;
  place(anchor, bubble, { placement: "top", offset: 6 });
  bubble.setAttribute("data-open", "");
  bubbleTimer = setTimeout(() => bubble.removeAttribute("data-open"), duration);
  return bubble;
}

/* ── 进行中的按钮（I9）：await Xxd.runBusy(btn, () => save()) —— 宽度不跳，成功后第一个图标变勾 1s ── */
export async function runBusy(button, task, { doneFor = 1000 } = {}) {
  if (button.getAttribute("aria-busy") === "true") return undefined;
  button.setAttribute("aria-busy", "true");
  try {
    const result = await task();
    button.removeAttribute("aria-busy");
    const icon = button.querySelector(":scope > .ui-icon");
    if (icon) {
      const original = icon.outerHTML;
      icon.outerHTML = ICON.check(Number(icon.getAttribute("width")) || 16);
      button.setAttribute("data-done", "");
      setTimeout(() => {
        button.removeAttribute("data-done");
        const now = button.querySelector(":scope > .ui-icon");
        if (now) now.outerHTML = original;
      }, doneFor);
    }
    return result;
  } catch (error) {
    button.removeAttribute("aria-busy");
    throw error;
  }
}
