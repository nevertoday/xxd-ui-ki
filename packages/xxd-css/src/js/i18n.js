// 行为 JS 自己生成的文字（读屏标签、提示、默认按钮文字）：简体 / 繁体 / 英文。
// 缺省跟 <html lang>（插件里由 i18n 写好）；Xxd.setLocale("en") 可以固定。
// 每个函数的参数、元素上的 data-* 文案仍然优先。

const STRINGS = {
  "zh-CN": {
    confirm: "确定",
    cancel: "取消",
    close: "关闭",
    delete: "删除",
    deleteTitle: "删除「{name}」？",
    deleteWhat: "会永久删除{what}，不能恢复。",
    deleteIrreversible: "删除后不能恢复。",
    typeToConfirm: "输入「{name}」确认",
    confirmTwice: "确认",
    prevPage: "上一页",
    nextPage: "下一页",
    pagination: "分页",
    copied: "已复制",
    copyFailed: "复制失败",
    showLevels: "显示 {n} 级",
    dropVeil: "松手，放进来",
    imageViewer: "图片查看器",
    prevImage: "上一张",
    nextImage: "下一张",
    remove: "删除",
    createOption: "创建「{value}」",
    commandPlaceholder: "输入命令或搜索…",
    commandEmpty: "没有匹配的命令",
    recent: "最近使用",
    loading: "正在加载…",
    selectPlaceholder: "请选择",
    selectedMany: "{list} 等 {n} 项",
    listSep: "、",
    hide: "隐藏",
    show: "显示",
    notifications: "通知（Alt+T 跳到这里）",
  },
  "zh-Hant": {
    confirm: "確定",
    cancel: "取消",
    close: "關閉",
    delete: "刪除",
    deleteTitle: "刪除「{name}」？",
    deleteWhat: "會永久刪除{what}，無法復原。",
    deleteIrreversible: "刪除後無法復原。",
    typeToConfirm: "輸入「{name}」確認",
    confirmTwice: "確認",
    prevPage: "上一頁",
    nextPage: "下一頁",
    pagination: "分頁",
    copied: "已複製",
    copyFailed: "複製失敗",
    showLevels: "顯示 {n} 層",
    dropVeil: "放開，放進來",
    imageViewer: "圖片檢視器",
    prevImage: "上一張",
    nextImage: "下一張",
    remove: "刪除",
    createOption: "建立「{value}」",
    commandPlaceholder: "輸入指令或搜尋…",
    commandEmpty: "沒有符合的指令",
    recent: "最近使用",
    loading: "正在載入…",
    selectPlaceholder: "請選擇",
    selectedMany: "{list} 等 {n} 項",
    listSep: "、",
    hide: "隱藏",
    show: "顯示",
    notifications: "通知（Alt+T 跳到這裡）",
  },
  en: {
    confirm: "OK",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    deleteTitle: "Delete “{name}”?",
    deleteWhat: "This permanently deletes {what}. It can’t be undone.",
    deleteIrreversible: "This can’t be undone.",
    typeToConfirm: "Type “{name}” to confirm",
    confirmTwice: "Confirm",
    prevPage: "Previous page",
    nextPage: "Next page",
    pagination: "Pagination",
    copied: "Copied",
    copyFailed: "Couldn’t copy",
    showLevels: "Show {n} more",
    dropVeil: "Drop to add",
    imageViewer: "Image viewer",
    prevImage: "Previous image",
    nextImage: "Next image",
    remove: "Remove",
    createOption: "Create “{value}”",
    commandPlaceholder: "Type a command or search…",
    commandEmpty: "No matching commands",
    recent: "Recent",
    loading: "Loading…",
    selectPlaceholder: "Select…",
    selectedMany: "{list} and {n} more",
    listSep: ", ",
    hide: "Hide",
    show: "Show",
    notifications: "Notifications (Alt+T to jump here)",
  },
};

let fixed = null;

/** 把语言代码归到三种之一：zh-TW / zh-HK / zh-Hant → 繁体，其他 zh → 简体，其余 → 英文；空 → 简体。 */
export function resolveLocale(input) {
  const v = String(input ?? "").toLowerCase();
  if (/^zh[-_](tw|hk|mo|hant)/.test(v)) return "zh-Hant";
  if (v.startsWith("zh")) return "zh-CN";
  return v ? "en" : "zh-CN";
}

/** 固定语言（传空值恢复成跟 <html lang>）。 */
export function setLocale(locale) {
  fixed = locale ? resolveLocale(locale) : null;
  return getLocale();
}

export function getLocale(node) {
  if (fixed) return fixed;
  const lang = node?.closest?.("[lang]")?.getAttribute("lang") ?? globalThis.document?.documentElement?.lang;
  return resolveLocale(lang);
}

/** t("deleteTitle", { name }) —— 占位符 {name}；值原样放进去（不会被当成替换模式）。 */
export function t(key, vars, node) {
  const table = STRINGS[getLocale(node)];
  const s = table[key] ?? STRINGS["zh-CN"][key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}

/** 老接口里的「$1」模板（如 confirmDelete 的 hint）：用函数替换，名字里的 $& / $1 原样保留。 */
export const fill$1 = (template, value) => template.replace("$1", () => value);

export const LOCALES = Object.freeze(Object.keys(STRINGS));
