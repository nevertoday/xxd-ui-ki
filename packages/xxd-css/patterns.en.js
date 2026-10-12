// patterns.json 的英文版（展示站 /en/ 用）。按 name 对应；规则同 registry.en.js。
export const patterns = {
  DropZone: {
    title: "Drop zone and drag veil",
    from: "Image sorter",
    summary: "When empty it is a dashed area: drag things in, pick files, or paste. Once there is content, dragging anywhere over the panel shows “Drop to add”.",
    markup: `<div id="drop-demo" style="position:relative;padding:16px;border:1px solid var(--line);background:var(--bg);min-height:220px">
  <div class="xxd-dropzone" id="drop-zone">
    <i data-xxd-icon="ImagePlus" data-size="24"></i>
    <p class="xxd-dropzone__title">Drag images here</p>
    <p class="xxd-help">Or <button class="xxd-link" type="button">choose image files</button>, or paste links with ⌘V</p>
  </div>
  <p class="xxd-help" id="drop-out" style="margin-top:12px"></p>
</div>
<script>
  Xxd.bindDrop(document.getElementById("drop-demo"), {
    zone: document.getElementById("drop-zone"),
    onFiles: (files) => (document.getElementById("drop-out").textContent = \`Got \${files.length} files\`),
    onText: (text) => (document.getElementById("drop-out").textContent = \`Got text: \${text.slice(0, 40)}\`),
  });
</script>`,
    anatomy: [
      "Dashed area: icon · one sentence · other ways in (pick files / paste)",
      "Veil: covers the whole panel with one sentence and disappears when you drag out",
    ],
    rules: ["Every way in says what it will bring before you click", "Doesn't take over when pasting into an input"],
    js: `const off = Xxd.bindDrop(panel, { zone, onFiles(files) {…}, onText(text) {…}, veil: "Drop to add to this set" })`,
  },
  Viewer: {
    title: "Image viewer",
    from: "Image sorter, member site",
    summary: "Open an image large, ← → to flip through, Esc returns to the same one; actions sit in a dark pill at the bottom.",
    markup: `<div class="xxd-cluster" id="viewer-demo">
  <button class="xxd-btn" data-i="0">Open image 1</button><button class="xxd-btn" data-i="2">Open image 3</button>
</div>
<script>
  const pics = ["#d65f32", "#3b74b8", "#5a8a3c", "#7b61b0"].map((c, i) => ({ src: \`data:image/svg+xml,\${encodeURIComponent(\`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='560'><rect width='800' height='560' fill='\${c}'/><text x='400' y='300' font-size='64' fill='white' text-anchor='middle' font-family='sans-serif'>\${i + 1}</text></svg>\`)}\`, alt: \`Image \${i + 1}\` }));
  document.getElementById("viewer-demo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]");
    if (b) Xxd.openViewer(pics, Number(b.dataset.i), { actions: [{ label: "Copy image", run: () => Xxd.toast("Image copied", { tone: "success" }) }, { label: "Download", run: () => Xxd.toast("Download started") }] });
  });
</script>`,
    rules: ["On close, focus returns to the thumbnail that opened it", "Action pill: dark and translucent, like X's own image controls"],
  },
  Sortable: {
    title: "Drag to sort",
    from: "Member site navigation, image sorter",
    summary: "Drag the handle to reorder; the other items slide to their new places (FLIP). Long-press on touch. Keyboard: Space on a handle picks it up, ↑ ↓ move, Space drops, Esc cancels.",
    markup: `<ul class="xxd-list xxd-group__body xxd-sortable" data-xxd-sortable style="width:100%;max-width:300px" id="sort-demo">
  <li class="xxd-list__item" data-sort-item data-id="write"><button class="xxd-sort-handle" aria-label="Drag to reorder: Write" aria-pressed="false"><i data-xxd-icon="GripVertical" data-size="16"></i></button>Write</li>
  <li class="xxd-list__item" data-sort-item data-id="prompts"><button class="xxd-sort-handle" aria-label="Drag to reorder: Prompts" aria-pressed="false"><i data-xxd-icon="GripVertical" data-size="16"></i></button>Prompts</li>
  <li class="xxd-list__item" data-sort-item data-id="history"><button class="xxd-sort-handle" aria-label="Drag to reorder: History" aria-pressed="false"><i data-xxd-icon="GripVertical" data-size="16"></i></button>History</li>
  <li class="xxd-list__item" data-sort-item data-id="settings"><button class="xxd-sort-handle" aria-label="Drag to reorder: Settings" aria-pressed="false"><i data-xxd-icon="GripVertical" data-size="16"></i></button>Settings</li>
</ul>
<p class="xxd-help" id="sort-out"></p>
<script>document.getElementById("sort-demo").addEventListener("xxd:change", (e) => (document.getElementById("sort-out").textContent = "New order: " + e.detail.order.join(" · ")));</script>`,
    rules: ["Animation moves transform only (FLIP); with reduced motion items jump straight into place", "Every reorder can be done without dragging (keyboard)"],
    js: `list.addEventListener("xxd:change", (e) => e.detail.order)
await Xxd.flip(container, () => reorderDom())  // the general “slide into the new place”`,
  },
  History: {
    title: "History by day",
    from: "Long-form publisher, image sorter",
    summary: "One row per entry under “Today / Yesterday / Sep 12” headings: stacked thumbnails, title, method · time; Delete appears on hover (click twice to confirm).",
    markup: `<div class="xxd-history" style="max-width:420px">
  <section><h3 class="xxd-history__day">Today</h3>
    <ul class="xxd-list xxd-group__body" data-interactive>
      <li class="xxd-list__item"><span class="xxd-thumbs"><span style="background:#d65f32"></span><span style="background:#3b74b8"></span><span style="background:#5a8a3c"></span></span><div class="xxd-list__main"><div class="xxd-list__title">24 images</div><div class="xxd-list__meta">Gradient · 14:02</div></div><button class="xxd-btn xxd-reveal" data-variant="ghost" data-size="xs" data-confirm-twice="Confirm delete">Delete</button><button class="xxd-btn" data-size="xs">Open</button></li>
      <li class="xxd-list__item"><span class="xxd-thumbs"><span style="background:#7b61b0"></span><span style="background:#c98a1a"></span></span><div class="xxd-list__main"><div class="xxd-list__title">8 images</div><div class="xxd-list__meta">As is · 09:40</div></div><button class="xxd-btn xxd-reveal" data-variant="ghost" data-size="xs" data-confirm-twice="Confirm delete">Delete</button><button class="xxd-btn" data-size="xs">Open</button></li>
    </ul></section>
  <section><h3 class="xxd-history__day">Yesterday</h3>
    <ul class="xxd-list xxd-group__body" data-interactive>
      <li class="xxd-list__item"><span class="xxd-thumbs"><span style="background:#2a8a7a"></span></span><div class="xxd-list__main"><div class="xxd-list__title">A long post about design systems</div><div class="xxd-list__meta">Posted to X · 21:15</div></div><button class="xxd-btn xxd-reveal" data-variant="ghost" data-size="xs" data-confirm-twice="Confirm delete">Delete</button><button class="xxd-btn" data-size="xs">Open</button></li>
    </ul></section>
  <button class="xxd-link" data-confirm-twice="Confirm clearing all history" style="color:var(--danger)">Clear all history</button>
</div>`,
    rules: ["At most 50 rows; doing the same set again only updates that row", "Delete takes two clicks (no dialog)"],
  },
  ConfirmTwice: {
    title: "Confirm twice",
    from: "Image sorter",
    summary: "For deletes that are hard to undo but not serious: the first click turns the button into “Confirm delete” (danger color), and only a second click within 3 seconds does it. No dialog.",
    markup: `<button class="xxd-btn" data-confirm-twice="Confirm delete" id="twice-demo">Delete this set</button>
<script>document.getElementById("twice-demo").addEventListener("xxd:confirm", () => Xxd.toast("Deleted", { tone: "success" }));</script>`,
    rules: ["Without a second click within 3 seconds it goes back to normal", "For truly irreversible, high-impact deletes, use “type the name to delete” (Dialog)"],
  },
  SignIn: {
    title: "Sign in",
    from: "All extensions",
    summary: "When signed out, the side panel shows only this screen: logo, name, one sentence, a new-account offer, Continue with Google, or email (two steps: email → password), and the terms.",
    markup: `<div class="xxd-auth" data-xxd-auth style="border:1px solid var(--line);background:var(--paper)">
  <span class="xxd-logo" data-size="lg"><span class="xxd-logo__mark"></span></span>
  <h2 class="xxd-auth__name">XXD · Long-form publisher</h2>
  <p class="xxd-auth__line">Writes Markdown into X Articles, with formatting and images.</p>
  <span class="xxd-auth__gift">New accounts get 7 days of full access</span>
  <form>
    <button class="xxd-btn" data-block type="button"><i data-xxd-icon="Globe" data-size="16"></i>Continue with Google</button>
    <div class="xxd-auth__or">or use email</div>
    <div data-step="email" data-active>
      <input class="xxd-input" type="email" placeholder="you@example.com" aria-label="Email" required>
      <button class="xxd-btn" data-variant="primary" data-block data-auth-next="password" hidden>Continue</button>
    </div>
    <div data-step="password">
      <p class="xxd-help">Sign in as <b data-auth-email></b></p>
      <input class="xxd-input" type="password" placeholder="Password" aria-label="Password">
      <div class="xxd-cluster"><button class="xxd-btn ui-dialog-cancel" data-auth-back="email">Back</button><button class="xxd-btn" data-variant="primary" style="flex:1">Continue</button></div>
      <button class="xxd-link" type="button" style="justify-self:start">Forgot password?</button>
    </div>
  </form>
  <p class="xxd-auth__terms">By continuing you agree to the <a class="xxd-link" href="#">Terms of Service</a> and <a class="xxd-link" href="#">Privacy Policy</a></p>
</div>`,
    rules: [
      "<html data-account> is set before the first frame (the sign-in page never flashes)",
      "“Continue” appears only once the email field has text",
      "When an expired session lands back here, say why in one sentence",
    ],
  },
  Membership: {
    title: "Membership and purchase",
    from: "Long-form publisher, image sorter",
    summary: "One plan line on the account card; “Become a member / Renew” opens the purchase panel in place: pick a plan · pick a payment method · QR code · “I've paid, check now”. Every outcome gets its own sentence.",
    markup: `<div style="display:grid;gap:12px;max-width:380px">
  <div class="xxd-group__body"><div class="xxd-account"><span class="xxd-avatar" data-member style="--avatar-size:36px">D</span><div class="xxd-account__main"><div class="xxd-account__name">Dong</div><div class="xxd-plan-line" data-tone="member" id="plan-line">Full access · 6 days left</div></div><button class="xxd-btn" data-size="sm" data-variant="primary" id="buy">Become a member</button></div></div>
  <div class="xxd-plans" role="radiogroup" aria-label="Plan">
    <label class="xxd-plan"><input type="radio" class="xxd-radio" name="plan" checked><span class="xxd-plan__name">Monthly<small>A renewal reminder every month</small></span><span class="xxd-plan__price">¥29</span></label>
    <label class="xxd-plan"><input type="radio" class="xxd-radio" name="plan"><span class="xxd-plan__name">Yearly<small>Works out to ¥19 a month</small></span><span class="xxd-plan__price">¥228</span></label>
  </div>
  <p class="xxd-help">Your remaining trial days are kept; renewals start from your current end date.</p>
  <div class="xxd-segmented" data-xxd-segmented data-block aria-label="Payment method"><button role="radio" aria-checked="true">WeChat Pay</button><button role="radio">Alipay</button><button role="radio">Card</button></div>
  <div class="xxd-qr"><svg class="xxd-qr__code" viewBox="0 0 21 21" aria-label="Payment QR code"><path fill="#111" d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0zM2 2v3h3V2zM16 2v3h3V2zM2 16v3h3v-3zM9 1h2v2H9zm0 4h3v2H9zm-1 4h2v2H8zm4 0h3v3h-3zm-4 4h3v2H8zm6 2h2v2h-2zm2-4h2v2h-2zm-4 6h2v2h-2zm6-2h3v3h-3z"/></svg>Scan with WeChat to pay · the code is valid for 2 hours<button class="xxd-link" type="button" id="paid">I've paid, check now</button></div>
</div>
<script>
  document.getElementById("paid").addEventListener("click", (e) => Xxd.runBusy(e.target, () => new Promise((r) => setTimeout(r, 900))).then(() => { Xxd.rollText(document.getElementById("plan-line"), "Member · until Nov 8, 2027"); Xxd.celebrate(document.getElementById("buy")); Xxd.toast("Membership is active", { tone: "success" }); }));
</script>`,
    rules: [
      "Never say “quota / allowance / trial”: say “Full access”, “N posts left today”, “Become a member”",
      "Limits speak up where the user acts — never in a pop-up",
      "Every outcome has its own sentence (paid, not paid yet, closed, network problem…); no silent failures",
      "When the plan line changes, the old text rolls up and out and the new text rolls in; with reduced motion it just swaps",
    ],
  },
  StatusLine: {
    title: "Status line",
    from: "Image sorter, long-form publisher",
    summary: "A line above the dock that stays empty unless there is something to say — one sentence, at most one action.",
    markup: `<div style="max-width:420px;border:1px solid var(--line);background:var(--paper)">
  <div class="xxd-statusline" id="status-demo" hidden></div>
  <footer class="xxd-dock" style="position:static"><div class="xxd-dock__status">24 images · from mp.weixin.qq.com</div><div class="xxd-dock__primary"><button class="xxd-btn" data-variant="primary" data-size="sm">Copy 24 links</button></div></footer>
</div>
<div class="xxd-cluster" style="margin-top:12px">
  <button class="xxd-btn" data-size="sm" onclick="Xxd.setStatus(document.getElementById('status-demo'), 'Reading colors 12 / 40', { action: { label: 'Stop' } })">In progress</button>
  <button class="xxd-btn" data-size="sm" onclick="Xxd.setStatus(document.getElementById('status-demo'), 'Today’s 5 color sorts are used up (as-is and reversed are unlimited)', { tone: 'warning', action: { label: 'Become a member' } })">Used up</button>
  <button class="xxd-btn" data-size="sm" onclick="Xxd.setStatus(document.getElementById('status-demo'), '')">Clear</button>
</div>`,
    rules: ["One sentence, at most one action; when there is nothing to say the whole line disappears", "No pop-ups, no system notifications"],
  },
  ProgressPill: {
    title: "Write progress pill",
    from: "Long-form publisher",
    summary: "While writing into someone else's page (the X editor), a thin dark pill: spinner · progress · number. It lives in Shadow DOM.",
    markup: `<div class="xxd-progress-pill"><span class="xxd-spinner" aria-hidden="true"></span>Writing<progress class="xxd-progress" value="62" max="100"></progress>62%</div>`,
    rules: ["Mount it in Shadow DOM with XxdExtension.mountXxdUI; never touch the host page", "When done it turns into a check, then fades out"],
  },
  Celebrate: {
    title: "Celebrate",
    from: "Long-form publisher",
    summary: "For moments like becoming a member or the first post: a circle draws and checks, the text rises line by line, confetti bursts from the check. With reduced motion it shows the final state directly.",
    markup: `<div class="xxd-celebrate" id="cele">
  <svg class="xxd-celebrate__ring" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="miter"><circle cx="12" cy="12" r="9.5" pathLength="1"/><path d="m7.5 12 3 3 6-6" pathLength="1"/></svg>
  <p class="xxd-text" data-variant="heading2">Membership is active</p>
  <p class="xxd-text" data-variant="caption">Valid until Nov 8, 2027</p>
  <button class="xxd-btn" data-variant="primary" onclick="Xxd.celebrate(this.closest('.xxd-celebrate').querySelector('svg'))">Start writing</button>
</div>`,
    rules: ["Only for moments that truly deserve it, and only once", "Only opacity / transform animate; no confetti with reduced motion"],
  },
  SettingsSearch: {
    title: "Settings search",
    from: "Long-form publisher",
    summary: "A search box pinned to the top of the settings page (⌘F jumps there, Esc clears): filters to matching rows and marks the text; each row carries a few words people might search for (dark / night / theme all find Theme).",
    markup: `<div style="max-width:440px">
  <div class="xxd-input-wrap" style="margin-bottom:16px"><i data-xxd-icon="Search" data-size="16"></i><input class="xxd-input" type="search" id="ss-input" placeholder="Search settings (⌘F)" aria-label="Search settings"><button class="xxd-input-clear" aria-label="Clear"><i data-xxd-icon="X" data-size="14"></i></button></div>
  <div class="xxd-settings" id="ss-box">
    <section class="xxd-group"><h2 class="xxd-group__title">Appearance</h2><div class="xxd-group__body">
      <div class="xxd-row" data-keywords="dark night mode theme"><div class="xxd-row__text"><div class="xxd-row__title">Theme</div><div class="xxd-row__desc">Light · Dark · System</div></div></div>
      <div class="xxd-row" data-keywords="rounded corners square radius"><div class="xxd-row__text"><div class="xxd-row__title">Rounded corners</div></div><div class="xxd-row__control"><input type="checkbox" role="switch" class="xxd-switch" aria-label="Rounded corners"></div></div>
    </div></section>
    <section class="xxd-group"><h2 class="xxd-group__title">Writing</h2><div class="xxd-group__body">
      <div class="xxd-row" data-keywords="punctuation quotes typography"><div class="xxd-row__text"><div class="xxd-row__title">Smart punctuation</div></div><div class="xxd-row__control"><input type="checkbox" role="switch" class="xxd-switch" checked aria-label="Smart punctuation"></div></div>
    </div></section>
  </div>
</div>
<script>Xxd.bindSettingsSearch(document.getElementById("ss-input"), document.getElementById("ss-box"), { hotkey: false });</script>`,
    rules: ["Rows and whole groups with no match are hidden", "Settings that live elsewhere also show up in results as shortcuts"],
  },
  AccountCard: {
    title: "Account card",
    from: "All extensions",
    summary: "Avatar (members get an accent ring) · name · plan line · one action.",
    markup: `<div class="xxd-group__body" style="max-width:380px"><div class="xxd-account"><span class="xxd-avatar" style="--avatar-size:36px">D</span><div class="xxd-account__main"><div class="xxd-account__name">Dong</div><div class="xxd-plan-line">Free · 3 posts left today</div></div><button class="xxd-btn" data-size="sm">Become a member</button></div>
<div class="xxd-account" style="border-top:1px solid var(--line)"><span class="xxd-avatar" data-member style="--avatar-size:36px">D</span><div class="xxd-account__main"><div class="xxd-account__name">Dong</div><div class="xxd-plan-line" data-tone="warning">Member · ends in 3 days</div></div><button class="xxd-btn" data-size="sm">Renew</button></div></div>`,
    rules: ["Numbers appear only when they help: members never see counts", "The last week uses the warning color"],
  },
  RollText: {
    title: "Rolling text",
    from: "Long-form publisher",
    summary: "When a plan line or a count changes: the old text rolls up and out, the new text rolls up and in, and a light sweeps across (only the roll is shown here).",
    markup: `<p class="xxd-plan-line" style="font-size:14px"><span id="roll-demo">Free · 3 posts left today</span></p>
<button class="xxd-btn" data-size="sm" onclick="const el=document.getElementById('roll-demo'); Xxd.rollText(el, el.textContent.includes('Free') ? 'Member · until Nov 8, 2027' : 'Free · 3 posts left today')">Swap</button>`,
    rules: ["With reduced motion the text just swaps"],
  },
};
