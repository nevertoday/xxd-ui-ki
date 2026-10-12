// 往网页里放一个按钮：放进 Shadow DOM，不碰宿主页面的样式。
(async () => {
  const { mountXxdUI, createAppearanceStore } = window.XxdExtension;
  const store = createAppearanceStore({ key: "__SLUG__-ui", apply: false });
  await store.load();
  const host = document.createElement("div");
  host.dataset.display = "block";
  host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000";
  document.documentElement.append(host);
  const ui = await mountXxdUI(host, { cssHref: chrome.runtime.getURL("vendor/xxd/xxd.shadow.css"), settings: store.get() });
  ui.root.innerHTML = `<button class="xxd-btn" data-variant="primary" data-size="sm">__APP_NAME__</button>`;
  store.subscribe((s) => ui.update(s));
})();
