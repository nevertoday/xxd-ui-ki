// 小小东模式的行为（优化计划 O4）。
import { emit, reducedMotion } from "./dom.js";
import { openDialog } from "./dialog.js";
import { bindSearch, markMatches, clearMarks } from "./inputs.js";

/* ── 拖放 / 粘贴：Xxd.bindDrop(panel, { onFiles, onText, veil: "松手，放进来" }) ──
 * 拖到 panel 任何地方出现遮罩；松手交给 onFiles(files) / onText(text)；在 panel 里粘贴也一样。返回解绑函数。 */
export function bindDrop(target, { onFiles, onText, veil = "松手，放进来", zone } = {}) {
  const doc = target.ownerDocument;
  let depth = 0;
  let veilEl = target.querySelector(":scope > .xxd-dropveil");
  if (!veilEl) {
    veilEl = doc.createElement("div");
    veilEl.className = "xxd-dropveil";
    veilEl.setAttribute("aria-hidden", "true");
    target.append(veilEl);
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
  }
  veilEl.textContent = veil;
  const show = (on) => {
    veilEl.toggleAttribute("data-open", on);
    zone?.toggleAttribute("data-over", on);
  };
  const hasPayload = (e) => [...(e.dataTransfer?.types ?? [])].some((t) => t === "Files" || t === "text/plain" || t === "text/uri-list");
  const enter = (e) => {
    if (!hasPayload(e)) return;
    e.preventDefault();
    depth += 1;
    show(true);
  };
  const over = (e) => {
    if (hasPayload(e)) e.preventDefault();
  };
  const leave = () => {
    depth = Math.max(0, depth - 1);
    if (!depth) show(false);
  };
  const deliver = (dt) => {
    const files = [...(dt?.files ?? [])];
    if (files.length) onFiles?.(files);
    else {
      const text = dt?.getData("text/uri-list") || dt?.getData("text/plain");
      if (text) onText?.(text);
    }
  };
  const drop = (e) => {
    e.preventDefault();
    depth = 0;
    show(false);
    deliver(e.dataTransfer);
  };
  const paste = (e) => {
    if (e.target.closest?.("input, textarea, [contenteditable]")) return;
    deliver(e.clipboardData);
  };
  target.addEventListener("dragenter", enter);
  target.addEventListener("dragover", over);
  target.addEventListener("dragleave", leave);
  target.addEventListener("drop", drop);
  doc.addEventListener("paste", paste);
  return () => {
    target.removeEventListener("dragenter", enter);
    target.removeEventListener("dragover", over);
    target.removeEventListener("dragleave", leave);
    target.removeEventListener("drop", drop);
    doc.removeEventListener("paste", paste);
    veilEl.remove();
  };
}

/* ── 图片查看器：Xxd.openViewer([{ src, alt }], start, { actions: [{ label, icon, run(item, i) }] }) ──
 * ← → 翻，Esc 回到同一张（焦点回到打开它的缩略图），点背景关。 */
const ARROW = (d) => `<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="miter" aria-hidden="true"><path d="${d}"/></svg>`;

export function openViewer(items, start = 0, { actions = [], within = document.body, labels = {} } = {}) {
  const L = { prev: "上一张", next: "下一张", close: "关闭", ...labels };
  const doc = within.ownerDocument;
  const dialog = doc.createElement("dialog");
  dialog.className = "xxd-viewer";
  dialog.setAttribute("aria-label", "图片查看器");
  dialog.innerHTML = `<div class="xxd-viewer__bar"><span data-count></span><span style="flex:1"></span><button class="xxd-btn" data-variant="ghost" data-icon-only data-size="sm" data-close aria-label="${L.close}">${ARROW("m6 6 12 12M18 6 6 18")}</button></div>
    <div class="xxd-viewer__stage"><button class="xxd-viewer__nav" data-dir="prev" aria-label="${L.prev}">${ARROW("m15 6-6 6 6 6")}</button><img alt=""><button class="xxd-viewer__nav" data-dir="next" aria-label="${L.next}">${ARROW("m9 6 6 6-6 6")}</button></div>
    <div class="xxd-pill" data-actions></div>`;
  const img = dialog.querySelector("img");
  const count = dialog.querySelector("[data-count]");
  const pill = dialog.querySelector("[data-actions]");
  let i = Math.min(Math.max(0, start), items.length - 1);
  for (const a of actions) {
    const b = doc.createElement("button");
    b.type = "button";
    b.innerHTML = `${a.icon ?? ""}${a.label}`;
    b.addEventListener("click", () => a.run?.(items[i], i));
    pill.append(b);
  }
  if (!actions.length) pill.remove();
  const show = (n) => {
    i = (n + items.length) % items.length;
    const item = items[i];
    const fresh = img.cloneNode();
    fresh.src = item.src;
    fresh.alt = item.alt ?? "";
    img.replaceWith(fresh);
    dialog._img = fresh;
    count.textContent = `${i + 1} / ${items.length}`;
    emit(dialog, "xxd:change", { index: i });
  };
  dialog.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return dialog.close();
    const nav = e.target.closest(".xxd-viewer__nav");
    if (nav) return show(i + (nav.dataset.dir === "next" ? 1 : -1));
    if (e.target.classList.contains("xxd-viewer__stage")) dialog.close();
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(i + 1);
    else if (e.key === "ArrowLeft") show(i - 1);
  });
  dialog.addEventListener("close", () => {
    emit(within, "xxd:viewer-close", { index: i });
    setTimeout(() => dialog.remove(), 0);
  });
  within.append(dialog);
  show(i);
  openDialog(dialog);
  dialog.querySelector('[data-dir="next"]').focus();
  return { dialog, show, get index() { return i; } };
}

/* ── FLIP：把一组元素从旧位置滑到新位置。await Xxd.flip(container, () => 重新排序 DOM) ── */
export function flip(container, mutate, { duration = 420, easing = "cubic-bezier(0.16, 1, 0.3, 1)", selector = ":scope > *" } = {}) {
  const before = new Map([...container.querySelectorAll(selector)].map((el) => [el, el.getBoundingClientRect()]));
  mutate();
  if (reducedMotion()) return Promise.resolve();
  const anims = [];
  for (const el of container.querySelectorAll(selector)) {
    const a = before.get(el);
    if (!a) continue;
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (!dx && !dy) continue;
    if (typeof el.animate === "function") anims.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing }).finished);
  }
  return Promise.all(anims).then(() => undefined);
}

/* ── 拖拽排序：<ul class="xxd-sortable" data-xxd-sortable><li data-sort-item data-id="a"><span class="xxd-sort-handle">…</span>…</li></ul>
 * 鼠标拖把手；触屏长按；键盘：把手上按空格「拿起」，↑ ↓ 移动，空格放下，Esc 取消。派发 xxd:change { order } ── */
function order(list) {
  return [...list.querySelectorAll(":scope > [data-sort-item]")].map((el) => el.dataset.id ?? el.textContent.trim());
}

export function installSortable(root, closestFrom) {
  let drag = null;
  root.addEventListener("pointerdown", (event) => {
    const handle = closestFrom(event, "[data-xxd-sortable] .xxd-sort-handle");
    if (!handle) return;
    const item = handle.closest("[data-sort-item]");
    const list = item.parentElement;
    const start = () => {
      drag = { item, list, y: event.clientY, startOrder: order(list) };
      item.setAttribute("data-dragging", "");
      handle.setPointerCapture?.(event.pointerId);
    };
    if (event.pointerType === "touch") {
      const timer = setTimeout(start, 350);
      handle.addEventListener("pointerup", () => clearTimeout(timer), { once: true });
    } else {
      event.preventDefault();
      start();
    }
  });
  root.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const { item, list } = drag;
    item.style.transform = `translateY(${event.clientY - drag.y}px)`;
    const siblings = [...list.querySelectorAll(":scope > [data-sort-item]")].filter((el) => el !== item);
    const target = siblings.find((el) => {
      const r = el.getBoundingClientRect();
      return event.clientY > r.top && event.clientY < r.bottom;
    });
    if (!target) return;
    const r = target.getBoundingClientRect();
    const after = event.clientY > r.top + r.height / 2;
    const ref = after ? target.nextElementSibling : target;
    if (ref === item || ref === item.nextElementSibling) return;
    const before = item.getBoundingClientRect().top;
    flip(list, () => list.insertBefore(item, ref), { duration: 200, selector: ":scope > [data-sort-item]:not([data-dragging])" });
    drag.y += item.getBoundingClientRect().top - before;
    item.style.transform = `translateY(${event.clientY - drag.y}px)`;
  });
  const end = () => {
    if (!drag) return;
    const { item, list, startOrder } = drag;
    drag = null;
    item.removeAttribute("data-dragging");
    item.style.transform = "";
    const now = order(list);
    if (now.join("\u0000") !== startOrder.join("\u0000")) emit(list, "xxd:change", { order: now });
  };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);

  root.addEventListener("keydown", (event) => {
    const handle = closestFrom(event, "[data-xxd-sortable] .xxd-sort-handle");
    if (!handle) return;
    const item = handle.closest("[data-sort-item]");
    const list = item.parentElement;
    const grabbed = item.hasAttribute("data-grabbed");
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (grabbed) {
        item.removeAttribute("data-grabbed");
        handle.setAttribute("aria-pressed", "false");
        emit(list, "xxd:change", { order: order(list) });
      } else {
        item.setAttribute("data-grabbed", "");
        handle.setAttribute("aria-pressed", "true");
        item.dataset.startIndex = String([...list.children].indexOf(item));
      }
    } else if (grabbed && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      const ref = event.key === "ArrowUp" ? item.previousElementSibling : item.nextElementSibling?.nextElementSibling ?? null;
      if (event.key === "ArrowUp" && !ref) return;
      if (event.key === "ArrowDown" && !item.nextElementSibling) return;
      flip(list, () => list.insertBefore(item, ref), { duration: 160, selector: ":scope > [data-sort-item]" });
      handle.focus();
    } else if (grabbed && event.key === "Escape") {
      event.preventDefault();
      const i = Number(item.dataset.startIndex);
      list.insertBefore(item, list.children[i >= [...list.children].indexOf(item) ? i + 1 : i] ?? null);
      item.removeAttribute("data-grabbed");
      handle.setAttribute("aria-pressed", "false");
      handle.focus();
    }
  });
}

/* ── 两次确认：<button class="xxd-btn" data-confirm-twice="确认删除">删除</button> → 第二次点派发 xxd:confirm ── */
export function installConfirmTwice(root, closestFrom) {
  root.addEventListener("click", (event) => {
    const btn = closestFrom(event, "[data-confirm-twice]");
    if (!btn) return;
    if (btn.hasAttribute("data-confirming")) {
      clearTimeout(btn._confirmTimer);
      btn.removeAttribute("data-confirming");
      btn.textContent = btn._label;
      emit(btn, "xxd:confirm");
      return;
    }
    event.preventDefault();
    btn._label = btn.textContent;
    btn.textContent = btn.dataset.confirmTwice || "确认";
    btn.setAttribute("data-confirming", "");
    btn._confirmTimer = setTimeout(() => {
      btn.removeAttribute("data-confirming");
      btn.textContent = btn._label;
    }, 3000);
  });
}

/* ── 登录两步：<div class="xxd-auth" data-xxd-auth> 里 [data-step="email"] / [data-step="password"]；[data-auth-next] / [data-auth-back] ── */
export function installAuth(root, closestFrom) {
  const go = (auth, step) => {
    for (const s of auth.querySelectorAll("[data-step]")) s.toggleAttribute("data-active", s.dataset.step === step);
    auth.querySelector(`[data-step="${step}"] input`)?.focus();
    emit(auth, "xxd:change", { step });
  };
  root.addEventListener("click", (event) => {
    const next = closestFrom(event, "[data-xxd-auth] [data-auth-next]");
    if (next) {
      event.preventDefault();
      const auth = next.closest("[data-xxd-auth]");
      const email = auth.querySelector('[data-step="email"] input[type="email"]');
      if (email && !email.checkValidity()) {
        email.setAttribute("aria-invalid", "true");
        return;
      }
      email?.removeAttribute("aria-invalid");
      auth.querySelectorAll("[data-auth-email]").forEach((el) => (el.textContent = email?.value ?? ""));
      return go(auth, next.dataset.authNext);
    }
    const back = closestFrom(event, "[data-xxd-auth] [data-auth-back]");
    if (back) {
      event.preventDefault();
      go(back.closest("[data-xxd-auth]"), back.dataset.authBack);
    }
  });
  // 邮箱里有字了，「继续」才出现
  root.addEventListener("input", (event) => {
    const input = closestFrom(event, '[data-xxd-auth] [data-step="email"] input[type="email"]');
    if (!input) return;
    const next = input.closest("[data-step]").querySelector("[data-auth-next]");
    if (next) next.hidden = !input.value.trim();
  });
}

/* ── 状态行：Xxd.setStatus(el, "正在读取颜色 12 / 40", { tone, action: { label, onClick } })；空字符串就藏起来 ── */
export function setStatus(el, text, { tone, action } = {}) {
  el.replaceChildren();
  el.hidden = !text;
  if (!text) return el;
  if (tone) el.dataset.tone = tone;
  else delete el.dataset.tone;
  el.setAttribute("role", "status");
  const span = el.ownerDocument.createElement("span");
  span.textContent = text;
  el.append(span);
  if (action?.label) {
    const b = el.ownerDocument.createElement("button");
    b.className = "xxd-link";
    b.type = "button";
    b.textContent = action.label;
    b.addEventListener("click", () => action.onClick?.());
    el.append(b);
  }
  return el;
}

/* ── 字的滚动替换：Xxd.rollText(el, "会员 · 到 2027年11月8日") —— 旧的上滚出、新的上滚进 ── */
export function rollText(el, text) {
  if (el.textContent === text) return;
  el.classList.add("xxd-roll");
  if (reducedMotion()) {
    el.textContent = text;
    return;
  }
  const doc = el.ownerDocument;
  const out = doc.createElement("span");
  out.textContent = el.textContent;
  out.setAttribute("data-out", "");
  out.setAttribute("aria-hidden", "true");
  const inn = doc.createElement("span");
  inn.textContent = text;
  inn.setAttribute("data-in", "");
  el.replaceChildren(out, inn);
  setTimeout(() => {
    if (out.isConnected) out.remove();
  }, 260);
}

/* ── 庆祝：Xxd.celebrate(anchor, { colors }) —— 彩纸从 anchor 散开（减少动效时什么都不放） ── */
export function celebrate(anchor, { colors = ["#c98a1a", "var(--success)", "var(--action)", "var(--ink)"], count = 24 } = {}) {
  if (reducedMotion()) return;
  const r = anchor.getBoundingClientRect();
  const doc = anchor.ownerDocument;
  for (let n = 0; n < count; n += 1) {
    const bit = doc.createElement("span");
    bit.className = "xxd-confetti";
    const angle = (Math.PI * 2 * n) / count + Math.random() * 0.4;
    const dist = 60 + Math.random() * 80;
    bit.style.left = `${r.left + r.width / 2}px`;
    bit.style.top = `${r.top + r.height / 2}px`;
    bit.style.background = colors[n % colors.length];
    bit.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * dist + 40}px`);
    bit.style.setProperty("--rot", `${Math.random() * 360}deg`);
    doc.body.append(bit);
    setTimeout(() => bit.remove(), 950);
  }
  anchor.closest(".xxd-celebrate")?.setAttribute("data-play", "");
}

/* ── 设置搜索：Xxd.bindSettingsSearch(input, container) —— 过滤到匹配的行（标题、说明、data-keywords），整组没匹配就藏起来，标出字 ── */
export function filterSettings(container, query) {
  const q = String(query || "").trim().toLowerCase();
  clearMarks(container);
  let hits = 0;
  for (const row of container.querySelectorAll(".xxd-row")) {
    const text = `${row.textContent} ${row.dataset.keywords ?? ""}`.toLowerCase();
    const on = !q || text.includes(q);
    row.toggleAttribute("data-search-hidden", !on);
    if (on) hits += 1;
  }
  for (const group of container.querySelectorAll(".xxd-group")) {
    group.toggleAttribute("data-search-hidden", Boolean(q) && !group.querySelector(".xxd-row:not([data-search-hidden])"));
  }
  if (q) markMatches(container, q);
  emit(container, "xxd:filter", { query: q, hits });
  return hits;
}

/** 设置页搜索：⌘F 跳到搜索框，输入就过滤设置行。返回解绑函数。 */
export function bindSettingsSearch(input, container, options = {}) {
  return bindSearch(input, { ...options, onQuery: (q) => filterSettings(container, q) });
}
