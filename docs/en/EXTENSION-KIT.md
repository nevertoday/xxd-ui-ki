# Chrome extension kit

`@xxd/extension` gives every XXD extension the same appearance — light / dark, square / rounded, accent, three languages — and the same components.
Extensions can't load remote code (MV3), so the component files are **copied** into each extension's `vendor/xxd/`, and each extension pins the version it uses.

> This is the English version of `docs/EXTENSION-KIT.md`. Extension names in the commands are only examples.

## Create an extension

```bash
cd xxd-ui-kit
pnpm xxd new ~/js/today-extension --name "Today" --slug today
```

You get an MV3 extension you can load right away with “Load unpacked”:

- `sidepanel.html`: tabs at the very top (no top bar), content, a bottom dock; the side panel defaults to compact density
- `options.html`: the settings page (search with ⌘F + the appearance group)
- `content.js`: an example of putting UI into a web page (Shadow DOM)
- `_locales/zh_CN · zh_TW · en`
- `vendor/xxd/`: `tokens.css` `xxd.css` `xxd.shadow.css` `xxd.js` `boot.js` `icons.js` `extension.js` `VERSION` `LICENSE`

Before publishing, add `icons` (16/32/48/128) to `manifest.json`. Give it a plain name that says what it does.

## Update the components

```bash
pnpm xxd sync ~/js/today-extension ~/js/xPoster      # copy the latest build, write VERSION
pnpm xxd status ~/js/today-extension ~/js/xPoster    # who is behind
```

Never edit `vendor/xxd/` by hand. When `xxd-chrome-publish` / `cx-chrome-zip` package an extension they include the files that are referenced, and `vendor/xxd/LICENSE` (MIT) satisfies the license check.

### Existing projects: `xxd.config.json`

Put it at the project root (an extension or a website):

| Field | What it does |
| --- | --- |
| `vendorDir` | Where to copy the components; `vendor/xxd` for extensions by default, `false` for websites (no copy) |
| `tokensTargets` | Write `tokens.css` as-is to these paths (for old paths that tests or websites reference). xPoster: `["src/xxd-theme.css", "website/xxd-theme.css"]` |
| `layeredTokensRegions` | Write layered tokens into a marked region at the top of these CSS files: the project's own variables always win, only new tokens are added (member site) |
| `layeredTokensExclude` | Extra token names to skip (`sync` already skips names the project uses but never declares) |
| `iconNodesTargets` | Write icon data to these paths (member site: `src/lib/xxd-icon-nodes.js`) |
| `adopt` | `pnpm xxd adopt <dir>`: `{ file, aliases }`. Removes `:root` declarations in `file` whose light and dark values both equal the token (the token provides them now); `aliases` turns old names into `var(--token)`. Compare before and after with `scripts/verify/css-vars-diff.cjs`; it should show zero changes |

## Wiring up a page

```html
<head>
  <!-- Apply the appearance before the first frame (reads the localStorage mirror); one data-key per extension -->
  <script src="vendor/xxd/boot.js" data-key="today-ui" data-default-density="compact"></script>
  <link rel="stylesheet" href="vendor/xxd/xxd.css">
  <script src="vendor/xxd/icons.js"></script>
  <script src="vendor/xxd/xxd.js"></script>        <!-- window.Xxd, runs install(document) automatically -->
  <script src="vendor/xxd/extension.js"></script>  <!-- window.XxdExtension -->
</head>
<body class="xxd-page">
```

To swap in the tokens without touching the UI yet, include only `vendor/xxd/tokens.css` and `boot.js` (the image sorter pilot does this).

## Appearance settings

The source of truth is `chrome.storage.sync`; the localStorage mirror only keeps the first frame from flashing. The side panel, settings page and popup stay in sync live.

```js
const { createAppearanceStore, uiLocale } = window.XxdExtension;
const store = createAppearanceStore({ key: "today-ui" });
await store.load();
Xxd.mountAppearance(document.getElementById("settings"), {
  locale: uiLocale(),            // zh-CN | zh-Hant | en
  get: store.get,
  set: (patch) => store.set(patch),
  showDensity: false,
  lockCorners: false,            // true when the product locks square corners
});
```

## Putting UI into a web page

Always inside Shadow DOM, so styles never leak either way; appearance attributes go on the host, never on the host page's `<html>`.

```js
const store = createAppearanceStore({ key: "today-ui", apply: false });
await store.load();
const host = document.createElement("div");
document.documentElement.append(host);
const ui = await XxdExtension.mountXxdUI(host, {
  cssHref: chrome.runtime.getURL("vendor/xxd/xxd.shadow.css"),
  settings: store.get(),
});
ui.root.innerHTML = `<button class="xxd-btn" data-variant="primary" data-size="sm">Export MD</button>`;
store.subscribe((s) => ui.update(s));
```

Add `vendor/xxd/xxd.shadow.css` to `web_accessible_resources` in `manifest.json`. When `xxd.js` loads as a content script it does not take over the host page.

`xxd.shadow.css` holds off the host page on its own (O8; `pnpm --filter @xxd/site audit` runs a hostile host page as a gate):

- Inherited styles from the host page (`text-transform`, `letter-spacing`, `text-align`, line height, font, cursor…) are reset on the top-level elements inside the shadow root;
- Tokens are declared again inside the shadow root: even if the host page writes `div { --ink: … }` and it hits the host, our colors and radii don't change;
- `data-theme` / `data-corners` / `data-finish` work when written on the host;
- Tooltips, toasts, the “Copied” bubble and confetti all mount inside the anchor's shadow root (`Xxd.toast(msg, { within: ui.root })` accepts a ShadowRoot directly).

## Language of the behavior JS

Text the native components generate (previous page, close, copy failed, the image viewer…) follows `<html lang>` in three languages; the extension's `i18n.js` already sets `lang`. To pin it, call `Xxd.setLocale("en")`. Options and `data-*` text still win.

## Three languages

```html
<span data-i18n="tabSettings">Settings</span>
<input data-i18n-attr="placeholder:searchPlaceholder">
```

`XxdExtension.applyI18n(document)` replaces them via `chrome.i18n`; when a translation is missing, the original text in the HTML stays.
