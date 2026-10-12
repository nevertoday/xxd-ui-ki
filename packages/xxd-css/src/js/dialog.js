// 对话框：原生 <dialog>。按钮层级见 DESIGN-PRINCIPLES §10：取消在前（辅助、内容宽度），主操作最后。
import { afterTransition, emit } from "./dom.js";
import { ICON } from "./icons-min.js";

const returnTo = new WeakMap();

export function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  returnTo.set(dialog, dialog.ownerDocument.activeElement);
  dialog.showModal();
  emit(dialog, "xxd:open");
}

export function closeDialog(dialog, value) {
  if (!dialog?.open) return;
  dialog.close(value);
}

function onClose(event) {
  const dialog = event.target;
  const prev = returnTo.get(dialog);
  returnTo.delete(dialog);
  if (prev && typeof prev.focus === "function" && prev.isConnected) prev.focus();
}

const DEFAULT_LABELS = { confirm: "确定", cancel: "取消", close: "关闭" };

/**
 * 确认对话框，返回 Promise<boolean>。
 *   await confirmDialog({ title: "删除这条记录？", message: "删除后不能恢复。", confirmLabel: "删除", tone: "danger" })
 * 破坏性操作（tone: "danger"）默认把焦点放在取消上。
 */
export function confirmDialog({
  title,
  message = "",
  confirmLabel = DEFAULT_LABELS.confirm,
  cancelLabel = DEFAULT_LABELS.cancel,
  closeLabel = DEFAULT_LABELS.close,
  tone,
  within = document.body,
} = {}) {
  const dialog = document.createElement("dialog");
  dialog.className = "xxd-dialog";
  dialog.setAttribute("aria-labelledby", "xxd-confirm-title");
  const form = document.createElement("form");
  form.method = "dialog";

  const head = document.createElement("div");
  head.className = "xxd-dialog__head";
  const h = document.createElement("h2");
  h.className = "xxd-dialog__title";
  h.id = "xxd-confirm-title";
  h.textContent = title ?? "";
  const close = document.createElement("button");
  close.className = "xxd-btn";
  close.dataset.variant = "ghost";
  close.dataset.iconOnly = "";
  close.dataset.size = "sm";
  close.value = "cancel";
  close.setAttribute("aria-label", closeLabel);
  close.innerHTML = ICON.close(16);
  head.append(h, close);

  const body = document.createElement("div");
  body.className = "xxd-dialog__body";
  if (message instanceof Node) body.append(message);
  else body.textContent = message;

  const actions = document.createElement("div");
  actions.className = "xxd-dialog__actions";
  const cancel = document.createElement("button");
  cancel.className = "xxd-btn ui-dialog-cancel";
  cancel.value = "cancel";
  cancel.textContent = cancelLabel;
  const ok = document.createElement("button");
  ok.className = "xxd-btn";
  ok.dataset.variant = tone === "danger" ? "danger" : "primary";
  ok.value = "confirm";
  ok.textContent = confirmLabel;
  actions.append(cancel, ok);

  form.append(head, body, actions);
  dialog.append(form);
  within.append(dialog);

  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue === "confirm");
        afterTransition(dialog, () => dialog.remove());
      },
      { once: true },
    );
    openDialog(dialog);
    (tone === "danger" ? cancel : ok).focus();
  });
}

/** 委托：[data-xxd-dialog-open="id"] 打开，[data-xxd-dialog-close] 关闭，[data-light-dismiss] 点遮罩关闭。 */
export function installDialogs(root, byId, closestFrom) {
  root.addEventListener("click", (event) => {
    const opener = closestFrom(event, "[data-xxd-dialog-open]");
    if (opener) {
      openDialog(byId(opener, opener.getAttribute("data-xxd-dialog-open")));
      return;
    }
    const closer = closestFrom(event, "[data-xxd-dialog-close]");
    if (closer) {
      closeDialog(closer.closest("dialog"), closer.getAttribute("data-xxd-dialog-close") || "cancel");
      return;
    }
    const dialog = event.target;
    if (dialog instanceof HTMLDialogElement && dialog.matches(".xxd-dialog[data-light-dismiss]")) {
      const r = dialog.getBoundingClientRect();
      const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      if (!inside) closeDialog(dialog, "cancel");
    }
  });
  root.addEventListener("close", (event) => {
    if (event.target instanceof HTMLDialogElement) onClose(event);
  }, true);
}

/**
 * 输入名字确认删除（不可撤销的操作）：
 *   await confirmDelete({ name: "长文发布", what: "这个插件的全部记录" })
 * 输入框里打对名字之前，删除按钮是禁用的。返回 true / false。
 */
export function confirmDelete({ name, what = "", title, confirmLabel = "删除", cancelLabel = "取消", hint = "输入「$1」确认", within = document.body } = {}) {
  const field = document.createElement("div");
  field.className = "xxd-field";
  const p = document.createElement("p");
  p.textContent = what ? `会永久删除${what}，不能恢复。` : "删除后不能恢复。";
  const label = document.createElement("label");
  label.className = "xxd-label";
  label.textContent = hint.replace("$1", name);
  const input = document.createElement("input");
  input.className = "xxd-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  label.htmlFor = input.id = `xxd-del-${Math.random().toString(36).slice(2, 8)}`;
  field.append(label, input);
  const body = document.createElement("div");
  body.append(p, field);
  const promise = confirmDialog({ title: title ?? `删除「${name}」？`, message: body, confirmLabel, cancelLabel, tone: "danger", within });
  const dialog = within.querySelector("dialog.xxd-dialog:last-of-type");
  const ok = dialog.querySelector('button[value="confirm"]');
  ok.disabled = true;
  input.addEventListener("input", () => (ok.disabled = input.value.trim() !== name));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim() !== name) e.preventDefault();
  });
  input.focus();
  return promise;
}
