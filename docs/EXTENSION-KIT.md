# Chrome 插件套件

`@xxd/extension` 让每个小小东插件用同一套外观：亮/暗、直角/圆角、主色、三语，以及同样的组件。
插件不能加载远程代码（MV3），所以组件文件**拷进**每个插件的 `vendor/xxd/`，每个插件锁定自己用的版本。

## 新建一个插件

```bash
cd xxd-ui-ki
pnpm xxd new ~/js/插件-今日待办 --name 今日待办 --name-en "Today" --slug today
```

得到一个可以直接「加载已解压的扩展程序」的 MV3 插件：

- `sidepanel.html`：tab 在最上面（没有顶栏）、内容、底部 dock；侧边栏默认紧凑密度
- `options.html`：设置页（搜索 ⌘F + 外观组）
- `content.js`：往网页里放 UI 的示例（Shadow DOM）
- `_locales/zh_CN · zh_TW · en`
- `vendor/xxd/`：`tokens.css` `xxd.css` `xxd.shadow.css` `xxd.js` `boot.js` `icons.js` `extension.js` `VERSION` `LICENSE`

上架前补上 `manifest.json` 里的 `icons`（16/32/48/128）。名字用四个朴素的字说清它做什么。

## 更新组件

```bash
pnpm xxd sync ~/js/插件-今日待办 ~/js/xPoster      # 拷最新构建，写 VERSION
pnpm xxd status ~/js/插件-今日待办 ~/js/xPoster    # 谁落后了
```

`vendor/xxd/` 不要手改。`xxd-chrome-publish` / `cx-chrome-zip` 打包时会按引用带上用到的文件，`vendor/xxd/LICENSE` 让许可检查通过。

### 老项目：`xxd.config.json`

放在项目根目录（插件或网站都行）：

| 字段 | 作用 |
| --- | --- |
| `vendorDir` | 组件拷到哪；插件默认 `vendor/xxd`，网站写 `false` 不拷 |
| `tokensTargets` | 把 `tokens.css` 原样写到这些路径（老路径被测试、网站引用，不想改时）。xPoster：`["src/xxd-theme.css", "website/xxd-theme.css"]` |
| `layeredTokensRegions` | 把 layered 令牌写进这些 CSS 文件开头的标记区域：项目已有的变量永远优先，只多出新令牌（会员站） |
| `layeredTokensExclude` | 额外跳过的令牌名（`sync` 已经会自动跳过「项目用了但没声明」的名字） |
| `iconNodesTargets` | 把图标数据写到这些路径（会员站 `src/lib/xxd-icon-nodes.js`） |

## 页面里怎么接

```html
<head>
  <!-- 首帧前应用外观（读 localStorage 镜像）；data-key 每个插件一个 -->
  <script src="vendor/xxd/boot.js" data-key="today-ui" data-default-density="compact"></script>
  <link rel="stylesheet" href="vendor/xxd/xxd.css">
  <script src="vendor/xxd/icons.js"></script>
  <script src="vendor/xxd/xxd.js"></script>        <!-- window.Xxd，自动 install(document) -->
  <script src="vendor/xxd/extension.js"></script>  <!-- window.XxdExtension -->
</head>
<body class="xxd-page">
```

只想换令牌、界面暂时不动：只引 `vendor/xxd/tokens.css` 和 `boot.js`（图片排序的试点就是这样）。

## 外观设置

真正的来源是 `chrome.storage.sync`，localStorage 镜像只为首帧不闪；侧边栏、设置页、popup 之间实时同步。

```js
const { createAppearanceStore, uiLocale } = window.XxdExtension;
const store = createAppearanceStore({ key: "today-ui" });
await store.load();
Xxd.mountAppearance(document.getElementById("settings"), {
  locale: uiLocale(),            // zh-CN | zh-Hant | en
  get: store.get,
  set: (patch) => store.set(patch),
  showDensity: false,
  lockCorners: false,            // 产品要锁直角时 true
});
```

## 往网页里放 UI

一律放进 Shadow DOM，样式互不污染；外观属性写到 host 上，不碰宿主页面的 `<html>`。

```js
const store = createAppearanceStore({ key: "today-ui", apply: false });
await store.load();
const host = document.createElement("div");
document.documentElement.append(host);
const ui = await XxdExtension.mountXxdUI(host, {
  cssHref: chrome.runtime.getURL("vendor/xxd/xxd.shadow.css"),
  settings: store.get(),
});
ui.root.innerHTML = `<button class="xxd-btn" data-variant="primary" data-size="sm">导出 MD</button>`;
store.subscribe((s) => ui.update(s));
```

`manifest.json` 里把 `vendor/xxd/xxd.shadow.css` 加进 `web_accessible_resources`。`xxd.js` 作为 content script 加载时不会自动接管宿主页面。

## 三语

```html
<span data-i18n="tabSettings">设置</span>
<input data-i18n-attr="placeholder:searchPlaceholder">
```

`XxdExtension.applyI18n(document)` 用 `chrome.i18n` 替换；找不到翻译时保留 HTML 里原来的文字。
