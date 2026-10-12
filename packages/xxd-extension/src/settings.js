// 外观设置的存储：chrome.storage 是真正的来源，localStorage 镜像只为首帧不闪（boot.js 读它）。
// 多个页面（侧边栏、设置页、popup）通过 storage.onChanged 实时同步。
import { DEFAULT_SETTINGS, applySettings, readSettings, rememberSettings } from "@xxd/tokens";

const chromeStorage = (area) => globalThis.chrome?.storage?.[area] ?? null;

/**
 * const store = createAppearanceStore({ key: "picsort-ui" });
 * await store.load();           // 从 chrome.storage 读，写镜像并应用到 <html>
 * store.get();                  // 当前设置（同步）
 * await store.set({ accent: "#3b74b8" });
 * store.subscribe((s) => …);    // 本页或别的页面改了设置
 * apply: false —— 只读写不应用（content script 里，外观写到 Shadow host 上而不是宿主页面的 <html>）
 */
export function createAppearanceStore({ key = "xxd-ui", area = "sync", element, lock = {}, defaults = {}, apply = true } = {}) {
  const storage = chromeStorage(area);
  let current = { ...DEFAULT_SETTINGS, ...defaults, ...readSettings(key) };
  const listeners = new Set();

  const pick = (s) => ({ theme: s.theme, corners: s.corners, accent: s.accent, density: s.density });
  const commit = (next, { notify = true } = {}) => {
    current = { ...current, ...next };
    rememberSettings(pick(current), key);
    if (apply) applySettings(current, { element, lock });
    if (notify) listeners.forEach((fn) => fn(current));
    globalThis.dispatchEvent?.(new CustomEvent("xxd:settings", { detail: current }));
    return current;
  };

  const onChanged = (changes, changedArea) => {
    if (changedArea !== area || !changes[key]) return;
    commit(changes[key].newValue || {});
  };
  storage && globalThis.chrome?.storage?.onChanged?.addListener(onChanged);

  return {
    key,
    async load() {
      if (!storage) return commit({}, { notify: false });
      const stored = await storage.get(key);
      return commit(stored?.[key] || {}, { notify: false });
    },
    get: () => current,
    async set(patch) {
      const next = commit(patch);
      if (storage) await storage.set({ [key]: pick(next) });
      return next;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    destroy() {
      listeners.clear();
      storage && globalThis.chrome?.storage?.onChanged?.removeListener(onChanged);
    },
  };
}
