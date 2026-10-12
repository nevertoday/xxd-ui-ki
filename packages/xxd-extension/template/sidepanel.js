// 侧边栏：外观设置存在 chrome.storage.sync，镜像到 localStorage 给 boot.js 首帧用。
const { createAppearanceStore, applyI18n, uiLocale, t } = window.XxdExtension;

const store = createAppearanceStore({ key: "__SLUG__-ui", defaults: { density: "compact" } });

async function main() {
  applyI18n(document);
  await store.load();
  Xxd.mountAppearance(document.getElementById("settings"), {
    locale: uiLocale(),
    get: store.get,
    set: (patch) => store.set(patch),
  });
  Xxd.init(document);
  document.getElementById("primary").addEventListener("click", () => {
    Xxd.toast(t("doneToast") || "完成了", { tone: "success" });
  });
}

main();
