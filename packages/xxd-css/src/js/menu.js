// 菜单与 popover：Popover API（顶层、点外面自动关闭）+ 定位 + 键盘。
//   <button data-xxd-menu="m1">更多</button>
//   <div class="xxd-menu" id="m1" role="menu" popover>
//     <button class="xxd-menu__item" role="menuitem">重命名</button>
//   </div>
//   <button data-xxd-popover="p1">说明</button> <div class="xxd-popover" id="p1" popover>…</div>
import { place } from "./floating.js";

const ITEM = '[role="menuitem"]:not([disabled]):not([aria-disabled="true"]), [role="menuitemcheckbox"]:not([disabled]), [role="menuitemradio"]:not([disabled])';
const openers = new WeakMap();

function isOpen(el) {
  try {
    return el.matches(":popover-open");
  } catch {
    return el.hasAttribute("data-open");
  }
}

export function showFloating(trigger, floating, { placement, focusFirst = false } = {}) {
  if (!floating) return;
  openers.set(floating, trigger);
  if (typeof floating.showPopover === "function") {
    if (!isOpen(floating)) floating.showPopover();
  } else {
    floating.setAttribute("data-open", "");
  }
  trigger?.setAttribute("aria-expanded", "true");
  place(trigger, floating, { placement: placement || floating.dataset.placement || "bottom-start" });
  if (focusFirst) floating.querySelector(ITEM)?.focus();
}

export function hideFloating(floating, { restoreFocus = false } = {}) {
  if (!floating) return;
  if (typeof floating.hidePopover === "function") {
    if (isOpen(floating)) floating.hidePopover();
  } else {
    floating.removeAttribute("data-open");
  }
  const trigger = openers.get(floating);
  trigger?.setAttribute("aria-expanded", "false");
  if (restoreFocus) trigger?.focus();
}

function moveFocus(menu, step) {
  const items = [...menu.querySelectorAll(ITEM)];
  if (!items.length) return;
  const root = menu.getRootNode();
  const index = items.indexOf(root.activeElement);
  const next = step === "first" ? 0 : step === "last" ? items.length - 1 : (index + step + items.length) % items.length;
  items[next].focus();
}

export function installMenus(root, byId, closestFrom) {
  root.addEventListener("click", (event) => {
    const trigger = closestFrom(event, "[data-xxd-menu], [data-xxd-popover]");
    if (trigger) {
      const id = trigger.getAttribute("data-xxd-menu") || trigger.getAttribute("data-xxd-popover");
      const floating = byId(trigger, id);
      if (!floating) return;
      // 点同一个按钮：Popover 的 light dismiss 已经在 pointerdown 时关掉了，这里不要再打开。
      if (floating.dataset.justClosed) return;
      if (isOpen(floating)) hideFloating(floating);
      else showFloating(trigger, floating, { focusFirst: event.detail === 0 && trigger.hasAttribute("data-xxd-menu") });
      return;
    }
    const item = closestFrom(event, '.xxd-menu [role^="menuitem"]');
    if (item && !item.disabled && item.getAttribute("aria-disabled") !== "true" && !item.closest("[data-keep-open]")) {
      const menu = item.closest(".xxd-menu");
      if (item.getAttribute("role") === "menuitemcheckbox") {
        item.setAttribute("aria-checked", String(item.getAttribute("aria-checked") !== "true"));
      }
      hideFloating(menu, { restoreFocus: true });
    }
  });

  root.addEventListener("pointerdown", (event) => {
    const trigger = closestFrom(event, "[data-xxd-menu], [data-xxd-popover]");
    if (!trigger) return;
    const floating = byId(trigger, trigger.getAttribute("data-xxd-menu") || trigger.getAttribute("data-xxd-popover"));
    if (floating && isOpen(floating)) {
      floating.dataset.justClosed = "1";
      setTimeout(() => delete floating.dataset.justClosed, 0);
    }
  });

  root.addEventListener("keydown", (event) => {
    const trigger = closestFrom(event, "[data-xxd-menu]");
    if (trigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const menu = byId(trigger, trigger.getAttribute("data-xxd-menu"));
      showFloating(trigger, menu);
      moveFocus(menu, event.key === "ArrowDown" ? "first" : "last");
      return;
    }
    const menu = closestFrom(event, ".xxd-menu");
    if (!menu) return;
    const keys = { ArrowDown: 1, ArrowUp: -1, Home: "first", End: "last" };
    if (event.key in keys) {
      event.preventDefault();
      moveFocus(menu, keys[event.key]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      hideFloating(menu, { restoreFocus: true });
    } else if (event.key === "Tab") {
      hideFloating(menu);
    }
  });

  // Popover 自己关闭时（点外面、Esc）同步 aria-expanded
  root.addEventListener(
    "toggle",
    (event) => {
      const el = event.target;
      if (event.newState === "closed" && el?.classList && (el.classList.contains("xxd-menu") || el.classList.contains("xxd-popover"))) {
        openers.get(el)?.setAttribute("aria-expanded", "false");
      }
    },
    true,
  );

  const reposition = () => {
    for (const el of root.querySelectorAll(".xxd-menu, .xxd-popover")) {
      if (isOpen(el) && openers.get(el)) place(openers.get(el), el, { placement: el.dataset.placement || "bottom-start" });
    }
  };
  globalThis.addEventListener?.("resize", reposition);
  globalThis.addEventListener?.("scroll", reposition, true);
}
