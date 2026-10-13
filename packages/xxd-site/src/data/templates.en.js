// templates.js 的英文版（/en/templates/*）。结构、类名、尺寸和中文版一一对应，只换文字。
const I = (n, s = 16) => `<i data-xxd-icon="${n}" data-size="${s}"></i>`;
const thumbs = (...c) => `<span class="xxd-thumbs">${c.map((x) => `<span style="background:${x}"></span>`).join("")}</span>`;

const sidepanel = `
<div class="xxd-sheet-host" data-density-preview="compact" style="display:flex;flex-direction:column;height:100%;--control-h:32px;--control-h-sm:26px;--control-h-xs:20px;--icon-button:32px">
  <nav class="xxd-tabs" data-xxd-tabs style="flex:none;padding:0 14px" aria-label="Main navigation">
    <button role="tab" id="sp-t1" aria-controls="sp-p1" aria-selected="true">Sort</button>
    <button role="tab" id="sp-t2" aria-controls="sp-p2">History</button>
    <button role="tab" id="sp-t3" aria-controls="sp-p3">Settings</button>
  </nav>
  <main style="flex:1;min-height:0;overflow:auto">
    <section id="sp-p1" style="padding:14px;display:grid;gap:12px">
      <div class="xxd-dropzone">${I("ImagePlus", 24)}<p class="xxd-dropzone__title">Drag images here</p><p class="xxd-help">Or <button class="xxd-link" type="button">choose image files</button></p></div>
      <div class="xxd-group__body"><ul class="xxd-list" data-interactive>
        <li class="xxd-list__item">${I("Globe")}<div class="xxd-list__main"><div class="xxd-list__title">Get images from this page</div><div class="xxd-list__meta">31 on mp.weixin.qq.com</div></div></li>
        <li class="xxd-list__item">${I("Columns3")}<div class="xxd-list__main"><div class="xxd-list__title">Get images from all tabs</div><div class="xxd-list__meta">6 pages in this window</div></div></li>
        <li class="xxd-list__item">${I("Link")}<div class="xxd-list__main"><div class="xxd-list__title">Open a URL</div></div></li>
      </ul></div>
    </section>
    <section id="sp-p2" style="padding:14px" class="xxd-history">
      <section><h3 class="xxd-history__day">Today</h3><ul class="xxd-list xxd-group__body" data-interactive>
        <li class="xxd-list__item">${thumbs("#d65f32", "#3b74b8", "#5a8a3c")}<div class="xxd-list__main"><div class="xxd-list__title">24 images</div><div class="xxd-list__meta">Gradient · 14:02</div></div><button class="xxd-btn xxd-reveal" data-variant="ghost" data-size="xs" data-confirm-twice="Confirm delete">Delete</button></li>
      </ul></section>
    </section>
    <section id="sp-p3" style="padding:14px" class="xxd-settings">
      <div class="xxd-group__body"><div class="xxd-account"><span class="xxd-avatar" data-member style="--avatar-size:32px">D</span><div class="xxd-account__main"><div class="xxd-account__name">Dong</div><div class="xxd-plan-line" data-tone="member">Member · until Nov 8, 2027</div></div><button class="xxd-btn" data-size="sm">Manage</button></div></div>
      <section class="xxd-group"><h2 class="xxd-group__title">Sorting</h2><div class="xxd-group__body">
        <div class="xxd-row"><div class="xxd-row__text"><div class="xxd-row__title">New sets start with</div></div><div class="xxd-row__control"><label class="xxd-select" data-variant="bare"><select aria-label="New sets start with"><option>Gradient</option><option>As is</option></select></label></div></div>
        <div class="xxd-row"><div class="xxd-row__text"><div class="xxd-row__title">Keep image links only</div><div class="xxd-row__desc">Drop links without an image extension</div></div><div class="xxd-row__control"><input type="checkbox" role="switch" class="xxd-switch" checked aria-label="Keep image links only"></div></div>
      </div></section>
    </section>
  </main>
  <div class="xxd-statusline">Reading colors 12 / 40<button class="xxd-link" type="button">Stop</button></div>
  <footer class="xxd-dock" style="position:static">
    <div class="xxd-dock__status">24 images · from mp.weixin.qq.com</div>
    <div class="xxd-dock__tools"><button class="xxd-btn" data-size="sm">Add images</button><button class="xxd-btn" data-variant="ghost" data-icon-only data-size="sm" aria-label="Export">${I("Ellipsis")}</button></div>
    <div class="xxd-dock__primary"><button class="xxd-btn" data-variant="primary" data-size="sm">Copy 24 links</button></div>
  </footer>
</div>`;

const signIn = `
<div style="height:100%;display:grid;place-items:center">
<div class="xxd-auth" data-xxd-auth>
  <span class="xxd-logo" data-size="lg"><span class="xxd-logo__mark"></span></span>
  <h2 class="xxd-auth__name">XXD · Image sorter</h2>
  <p class="xxd-auth__line">Sorts image links by color.</p>
  <span class="xxd-auth__gift">New accounts get 7 days of full access</span>
  <form>
    <button class="xxd-btn" data-block type="button">${I("Globe")}Continue with Google</button>
    <div class="xxd-auth__or">or use email</div>
    <div data-step="email" data-active><input class="xxd-input" type="email" placeholder="you@example.com" aria-label="Email" required><button class="xxd-btn" data-variant="primary" data-block data-auth-next="password" hidden>Continue</button></div>
    <div data-step="password"><p class="xxd-help">Sign in as <b data-auth-email></b></p><input class="xxd-input" type="password" placeholder="Password" aria-label="Password"><div class="xxd-cluster"><button class="xxd-btn ui-dialog-cancel" data-auth-back="email">Back</button><button class="xxd-btn" data-variant="primary" style="flex:1">Continue</button></div></div>
  </form>
  <p class="xxd-auth__terms">By continuing you agree to the <a class="xxd-link" href="#">Terms of Service</a> and <a class="xxd-link" href="#">Privacy Policy</a></p>
</div></div>`;

const settings = `
<div style="padding:32px 16px 64px" class="xxd-read">
  <h1 class="xxd-text" data-variant="heading1" style="margin-bottom:16px">Settings</h1>
  <div class="xxd-input-wrap" style="margin-bottom:20px">${I("Search")}<input class="xxd-input" type="search" placeholder="Search settings (⌘F)" aria-label="Search settings"><button class="xxd-input-clear" aria-label="Clear">${I("X", 14)}</button></div>
  <div class="xxd-settings">
    <section class="xxd-group"><h2 class="xxd-group__title">Account</h2><div class="xxd-group__body"><div class="xxd-account"><span class="xxd-avatar" style="--avatar-size:36px">D</span><div class="xxd-account__main"><div class="xxd-account__name">Dong</div><div class="xxd-plan-line">Free · 3 posts left today</div></div><button class="xxd-btn" data-size="sm" data-variant="primary">Become a member</button></div></div></section>
    <section class="xxd-group"><h2 class="xxd-group__title">Writing</h2><div class="xxd-group__body">
      <div class="xxd-row" data-keywords="title heading"><div class="xxd-row__text"><div class="xxd-row__title">Write the title</div><div class="xxd-row__desc">Use the first # heading as the post title</div></div><div class="xxd-row__control"><input type="checkbox" role="switch" class="xxd-switch" checked aria-label="Write the title"></div></div>
      <div class="xxd-row" data-keywords="punctuation quotes"><div class="xxd-row__text"><div class="xxd-row__title">Smart punctuation</div></div><div class="xxd-row__control"><input type="checkbox" role="switch" class="xxd-switch" checked aria-label="Smart punctuation"></div></div>
      <a class="xxd-row" href="#"><div class="xxd-row__text"><div class="xxd-row__title">Local image folder</div><div class="xxd-row__desc">Not connected</div></div></a>
    </div></section>
    <section class="xxd-group"><h2 class="xxd-group__title">AI service</h2><div class="xxd-group__body">
      <div class="xxd-row" data-stack><div class="xxd-row__text"><div class="xxd-row__title">API key</div><div class="xxd-row__desc">Stored on this computer only</div></div><div class="xxd-input-group xxd-secret" data-xxd-secret><input type="password" value="sk_live_4f8a2c91d7e3b6a0" readonly aria-label="API key"><button class="xxd-btn" data-variant="ghost" data-icon-only data-size="sm" data-secret-toggle aria-label="Show">${I("Eye")}</button><button class="xxd-btn" data-variant="ghost" data-icon-only data-size="sm" data-secret-copy aria-label="Copy">${I("Copy")}</button></div></div>
    </div></section>
    <div id="tpl-appearance"></div>
    <section class="xxd-group"><h2 class="xxd-group__title">About</h2><div class="xxd-group__body">
      <div class="xxd-row"><div class="xxd-row__text"><div class="xxd-row__title">Version</div></div><div class="xxd-row__control xxd-text" data-variant="mono-secondary">1.8.2</div></div>
      <a class="xxd-row" href="#"><div class="xxd-row__text"><div class="xxd-row__title">Privacy Policy</div></div></a>
    </div></section>
  </div>
</div>
<script>
  Xxd.mountAppearance(document.getElementById("tpl-appearance"), { locale: "en", languages: [{ value: "zh-CN", label: "简体中文" }, { value: "zh-Hant", label: "繁體中文" }, { value: "en", label: "English" }], language: "en" });
  Xxd.init(document);
  Xxd.bindSettingsSearch(document.querySelector('.xxd-input-wrap input'), document.querySelector('.xxd-settings'), { hotkey: false });
</script>`;

const detailPanel = `
<div style="height:100%;position:relative;overflow:hidden">
  <div class="xxd-grid" style="--grid-min:160px;padding:16px">${["#d65f32", "#3b74b8", "#5a8a3c", "#7b61b0", "#c98a1a", "#2a8a7a"].map((c, i) => `<a class="xxd-card" href="#"><div class="xxd-card__media" style="--ratio:3/4;background:${c}"><div class="xxd-card__marks"><span class="xxd-dot" style="background:#ff3f6d"></span></div></div><div class="xxd-card__body"><p class="xxd-card__title">Editorial poster 00${i + 1}</p><span class="xxd-card__meta">xxd-panel-00${i + 1}</span></div></a>`).join("")}</div>
  <aside class="xxd-panel" data-open style="position:absolute" aria-label="Prompt details">
    <div class="xxd-panel__head"><h2 class="xxd-panel__title">Editorial poster 001</h2><button class="xxd-btn" data-variant="ghost" data-icon-only aria-label="Copy prompt" data-tooltip="Copy prompt">${I("Copy")}</button><button class="xxd-btn" data-variant="ghost" data-icon-only aria-label="Close">${I("X")}</button></div>
    <div class="xxd-panel__body"><div class="xxd-card__media" style="--ratio:4/3;background:#d65f32;border-radius:var(--r-md)"></div>
      <div class="xxd-prose" style="margin-top:16px"><h3>Prompt</h3><p>Restrained editorial brutalism: a paper background, crisp black lines, clean sans-serif type, dense but readable text.</p></div>
      <div class="xxd-cluster" style="margin-top:12px"><button class="xxd-chip" aria-pressed="true">Poster</button><button class="xxd-chip">Editorial</button></div>
    </div>
    <footer class="xxd-dock" style="position:static"><div class="xxd-dock__status">Used 2,410 times</div><div class="xxd-dock__tools"><button class="xxd-btn" data-variant="ghost" data-icon-only data-size="sm" aria-label="Previous">${I("ChevronLeft")}</button><button class="xxd-btn" data-variant="ghost" data-icon-only data-size="sm" aria-label="Next">${I("ChevronRight")}</button></div><div class="xxd-dock__primary"><button class="xxd-btn" data-variant="primary" data-size="sm">Generate in this style</button></div></footer>
  </aside>
</div>`;

const article = `
<div class="xxd-layout" data-cols="2-1" style="padding:32px 24px;max-width:1080px;margin:0 auto;--layout-gap:48px">
  <article class="xxd-prose">
    <ol class="xxd-breadcrumbs"><li><a href="#">Articles</a></li><li aria-current="page">Design systems</li></ol>
    <h1 id="a1">A design system for one</h1>
    <p>Twenty-odd extensions and one member site, one look: black, white and gray, square corners by default, emphasis in ink.</p>
    <h2 id="a2">Why square corners</h2>
    <p>Square corners let the content speak first. <a href="#">The member site's hard rule</a>: no rounded dialogs, cards, buttons or inputs.</p>
    <blockquote>Motion is for revealing hierarchy and giving feedback, not decoration.</blockquote>
    <h2 id="a3">Tokens</h2>
    <p>Every color, radius and shadow comes from <code>tokens.css</code>.</p>
    <pre><code>--r-sm: 0px; /* square by default */</code></pre>
    <h3 id="a4">Accent</h3>
    <ul><li>18 presets</li><li>Lightened or darkened automatically to keep contrast</li></ul>
  </article>
  <aside style="position:sticky;top:24px;align-self:start"><p class="xxd-toc__title">On this page</p><ul class="xxd-toc" data-spy><li><a href="#a1" aria-current="true">A design system for one</a></li><li><a href="#a2">Why square corners</a></li><li><a href="#a3">Tokens</a></li><li data-depth="3"><a href="#a4">Accent</a></li></ul></aside>
</div>`;

const resourceList = `
<div style="padding:0 24px 32px;max-width:1080px;margin:0 auto">
  <header class="xxd-page-header">
    <ol class="xxd-breadcrumbs"><li><a href="#">XXD</a></li><li aria-current="page">Extensions</li></ol>
    <div class="xxd-page-header__row"><h1 class="xxd-page-header__title">Extensions</h1><div class="xxd-page-header__actions"><button class="xxd-btn">Import</button><button class="xxd-btn" data-variant="primary">${I("Plus")}New extension</button></div></div>
    <p class="xxd-page-header__desc">Every extension on XXD UI: whether its version is current and when it was last published.</p>
  </header>
  <div class="xxd-cluster" style="margin-bottom:12px"><div class="xxd-input-wrap" style="width:260px">${I("Search")}<input class="xxd-input" data-size="sm" type="search" placeholder="Search extensions" aria-label="Search extensions"></div><button class="xxd-chip" aria-pressed="true">All</button><button class="xxd-chip">Behind</button><button class="xxd-chip">To publish</button></div>
  <div class="xxd-table-wrap"><table class="xxd-table" data-interactive>
    <thead><tr><th class="xxd-table__check"><input type="checkbox" class="xxd-check" data-select-all aria-label="Select all"></th><th aria-sort="ascending"><button class="xxd-th-sort">Extension</button></th><th>UI Kit</th><th aria-sort="none" data-align="end"><button class="xxd-th-sort">Users</button></th><th>Status</th><th class="xxd-table__actions"><span class="xxd-sr-only">Actions</span></th></tr></thead>
    <tbody>
      ${[["Long-form publisher", "Current", "2,410", "success", "Live"], ["Link sorter", "2 behind", "830", "warning", "To publish"], ["Bulk image saver", "Not adopted", "5,102", "", "Live"], ["Today", "Current", "312", "action", "In review"]].map(([n, v, u, t, s]) => `<tr><td class="xxd-table__check"><input type="checkbox" class="xxd-check" data-select-row aria-label="Select ${n}"></td><td><span class="xxd-logo" data-size="sm"><span class="xxd-logo__mark"></span>${n}</span></td><td>${v}</td><td data-align="end">${u}</td><td><span class="xxd-badge" data-appearance="dot" ${t ? `data-tone="${t}"` : ""}>${s}</span></td><td class="xxd-table__actions"><button class="xxd-btn xxd-reveal" data-variant="ghost" data-size="xs">Sync</button></td></tr>`).join("")}
    </tbody>
  </table></div>
  <div class="xxd-pagination-bar" style="margin-top:12px"><span class="xxd-pagination__info"></span><nav class="xxd-pagination" data-xxd-pagination data-page="1" data-total="24" data-per-page="4" aria-label="Pagination"></nav></div>
</div>`;

const deleteConfirm = `
<div style="height:100%;display:grid;place-items:center;gap:12px;align-content:center">
  <p class="xxd-text" data-variant="secondary">Irreversible, high-impact deletes: type the name to delete.</p>
  <button class="xxd-btn" data-variant="danger-outline" onclick="Xxd.confirmDelete({ name: 'Long-form publisher', what: 'all records and settings of this extension' }).then((ok) => ok && Xxd.toast('Deleted', { tone: 'success' }))">Delete extension…</button>
  <p class="xxd-text" data-variant="caption">For less serious ones, use “Confirm twice” (pattern).</p>
</div>`;

export const templates = [
  { slug: "extension-sidepanel", title: "Extension side panel", summary: "Compact density: tabs at the very top (no top bar), drop zone and ways to get images, history, settings, status line, bottom dock.", markup: sidepanel, width: 380, height: 720, where: "Chrome side panel" },
  { slug: "extension-sign-in", title: "Extension sign-in", summary: "When signed out, the side panel shows only this screen.", markup: signIn, width: 380, height: 640, where: "Chrome side panel" },
  { slug: "settings", title: "Settings page", summary: "Search pinned to the top (filters + marks text), account, writing, AI key, appearance group, about.", markup: settings, height: 980, flow: true },
  { slug: "detail-panel", title: "Member site details panel", summary: "Masonry + a details panel on the right: title bar, image, prompt, tags, bottom dock (previous / next / next step).", markup: detailPanel, height: 680 },
  { slug: "article", title: "Article page", summary: "Reading typography + a table of contents on the right (highlights while scrolling).", markup: article, height: 760, flow: true },
  { slug: "resource-list", title: "Resource list", summary: "Page header, filters, a table (select all / sort / hover actions), pagination.", markup: resourceList, height: 620, flow: true },
  { slug: "delete-confirm", title: "Delete confirmation", summary: "A dialog that asks you to type the name before deleting.", markup: deleteConfirm, height: 260 },
];
