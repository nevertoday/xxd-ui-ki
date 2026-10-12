// @xxd/css 行为层：每个组件一个小模块，没有依赖。没有 JS 时组件也能看、基础功能能用。
//   ESM： import { install, toast, confirmDialog } from "@xxd/css";
//   经典脚本：<script src="vendor/xxd/xxd.js"></script> → window.Xxd，DOM 就绪后自动 install(document)
//   Shadow DOM：Xxd.install(shadowRoot)
import { byId, closestFrom } from "./dom.js";
import { installDialogs } from "./dialog.js";
import { installMenus } from "./menu.js";
import { initChoices, installChoices } from "./choice.js";
import { installCopy, installTooltips } from "./feedback.js";
import { installLayers } from "./layers.js";
import { initComboboxes, installComboboxes, installTagInputs } from "./inputs.js";

export { openDialog, closeDialog, confirmDialog } from "./dialog.js";
export { showFloating, hideFloating } from "./menu.js";
export { place } from "./floating.js";
export { selectTab, selectRadio, moveInk } from "./choice.js";
export { toast, copyText, showTooltip, hideTooltip } from "./feedback.js";
export { openSheet, closeSheet, openPanel, closePanel, openLayer, closeLayer } from "./layers.js";
export { bindSearch, markMatches, clearMarks, addTag, tagValues, openCommandPalette, bindCommandPalette } from "./inputs.js";
export { mountAppearance, APPEARANCE_LABELS } from "./appearance.js";
export { ICON } from "./icons-min.js";

const installed = new WeakSet();

/** 在 root（document 或 ShadowRoot）上装好事件委托，并初始化已有的 tabs / 分段 / combobox。可重复调用。 */
export function install(root = document) {
  if (!installed.has(root)) {
    installed.add(root);
    installDialogs(root, byId, closestFrom);
    installMenus(root, byId, closestFrom);
    installChoices(root, closestFrom);
    installTooltips(root, closestFrom);
    installCopy(root, closestFrom);
    installLayers(root, byId, closestFrom);
    installTagInputs(root, closestFrom);
    installComboboxes(root, closestFrom);
  }
  init(root);
  return root;
}

/** 新插入的内容里有 tabs / 分段 / combobox 时调用（事件委托不需要重新绑）。 */
export function init(root = document) {
  initChoices(root);
  initComboboxes(root);
  globalThis.XxdIcons?.hydrateIcons?.(root);
}
