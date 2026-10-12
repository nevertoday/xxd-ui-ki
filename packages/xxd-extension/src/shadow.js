// 往第三方网页（X、公众号编辑器……）注入 UI：一律放进 Shadow DOM，样式互不污染。
// 令牌用 :host 版本（xxd.shadow.css），外观属性同步到 host 上。
import { applySettings } from "@xxd/tokens";

const sheetCache = new Map();

async function loadSheet(href) {
  if (sheetCache.has(href)) return sheetCache.get(href);
  const promise = fetch(href)
    .then((r) => r.text())
    .then((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      return sheet;
    });
  sheetCache.set(href, promise);
  return promise;
}

/**
 * const ui = await mountXxdUI(hostElement, { cssHref: chrome.runtime.getURL("vendor/xxd/xxd.shadow.css"), settings });
 * ui.root.innerHTML = `<button class="xxd-btn" data-variant="primary">导出 MD</button>`;
 * ui.update(newSettings);  ui.destroy();
 * cssText 可以代替 cssHref（测试或内联时用）。
 */
export async function mountXxdUI(host, { cssHref, cssText, settings = {}, mode = "open", install = true } = {}) {
  const root = host.shadowRoot || host.attachShadow({ mode });
  const sheets = [];
  if (cssText) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);
    sheets.push(sheet);
  } else if (cssHref) {
    sheets.push(await loadSheet(cssHref));
  }
  root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
  // 宿主页面的字号、行高不该影响我们
  host.style.setProperty("all", "initial");
  host.style.setProperty("display", host.dataset.display || "contents");
  const update = (next) => applySettings(next, { element: host });
  update(settings);
  if (install && globalThis.Xxd?.install) globalThis.Xxd.install(root);
  return {
    host,
    root,
    update,
    destroy() {
      root.replaceChildren();
      host.remove();
    },
  };
}
