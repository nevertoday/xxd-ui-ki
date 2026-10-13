// @xxd/css 行为层：每个组件一个小模块，没有依赖。没有 JS 时组件也能看、基础功能能用。
//   ESM： import { install, toast, confirmDialog } from "@xxd/css";
//   经典脚本：<script src="vendor/xxd/xxd.js"></script> → window.Xxd，DOM 就绪后自动 install(document)
//   Shadow DOM：Xxd.install(shadowRoot)
import { byId, closestFrom } from "./dom.js";
import { installDialogs } from "./dialog.js";
import { installMenus } from "./menu.js";
import { initChoices, installChoices } from "./choice.js";
import { installCopy, installToasts, installTooltips } from "./feedback.js";
import { installLayers } from "./layers.js";
import { initComboboxes, installComboboxes, installTagInputs } from "./inputs.js";
import { initPickers, installPickers, installSecrets } from "./picker.js";
import { initStructure, installStructure } from "./structure.js";
import { initData, installData } from "./data.js";
import { installDrawerSwipe } from "./layers.js";
import { installAuth, installConfirmTwice, installSortable } from "./patterns.js";
import { initSparklines } from "./chart.js";

export { openDialog, closeDialog, confirmDialog, confirmDelete } from "./dialog.js";
export { toggleSidebar, collapseBreadcrumbs, spyToc, watchTabsOverflow } from "./structure.js";
export { renderPagination, pageList, syncSelectAll, syncRangePair, highlight, highlightText } from "./data.js";
export { showFloating, hideFloating, openSubmenu, closeSubmenu } from "./menu.js";
export { openPicker, closePicker, choose as choosePickerOption } from "./picker.js";
export { place } from "./floating.js";
export { selectTab, selectRadio, moveInk } from "./choice.js";
export { toast, copyText, showTooltip, hideTooltip, showBubble, runBusy } from "./feedback.js";
export { openSheet, closeSheet, openPanel, closePanel, openLayer, closeLayer } from "./layers.js";
export { bindSearch, markMatches, clearMarks, addTag, tagValues, openCommandPalette, bindCommandPalette } from "./inputs.js";
export { mountAppearance, APPEARANCE_LABELS } from "./appearance.js";
export { chartTokens, chartPalette, chartOptions, watchChartTheme, sparkline, initSparklines } from "./chart.js";
export { bindDrop, openViewer, flip, setStatus, rollText, celebrate, filterSettings, bindSettingsSearch } from "./patterns.js";
export { ICON } from "./icons-min.js";
export { setLocale, getLocale, resolveLocale, t } from "./i18n.js";
export { layerRoot, setDefaultLayerRoot, defaultLayerRoot } from "./dom.js";

const installed = new WeakSet();

/** 在 root（document 或 ShadowRoot）上装好事件委托，并初始化已有的 tabs / 分段 / combobox。可重复调用。 */
export function install(root = document) {
  if (!installed.has(root)) {
    installed.add(root);
    installDialogs(root, byId, closestFrom);
    installMenus(root, byId, closestFrom);
    installChoices(root, closestFrom);
    installTooltips(root, closestFrom);
    installToasts(root);
    installCopy(root, closestFrom);
    installLayers(root, byId, closestFrom);
    installTagInputs(root, closestFrom);
    installComboboxes(root, closestFrom);
    installPickers(root, closestFrom);
    installSecrets(root, closestFrom);
    installStructure(root, byId, closestFrom);
    installData(root, closestFrom);
    installDrawerSwipe(root, closestFrom);
    installSortable(root, closestFrom);
    installConfirmTwice(root, closestFrom);
    installAuth(root, closestFrom);
  }
  init(root);
  return root;
}

/** 新插入的内容里有 tabs / 分段 / combobox 时调用（事件委托不需要重新绑）。 */
export function init(root = document) {
  initChoices(root);
  initComboboxes(root);
  initPickers(root);
  initStructure(root);
  initData(root);
  initSparklines(root);
  globalThis.XxdIcons?.hydrateIcons?.(root);
}
