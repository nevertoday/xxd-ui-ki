// 侧边栏样板：登录 → 主页（拖放）→ 记录（按天分组）→ 设置（搜索、账号与会员、外观）。
// 外观设置存在 chrome.storage.sync，镜像到 localStorage 给 boot.js 首帧用；登录状态同理（account-boot.js）。
// 这是样板：登录、支付都是假的，换成你自己的接口即可。
const { createAppearanceStore, applyI18n, uiLocale, t } = window.XxdExtension;
const ACCOUNT_KEY = "__SLUG__-account";
const store = createAppearanceStore({ key: "__SLUG__-ui", defaults: { density: "compact" } });
const local = globalThis.chrome?.storage?.local;
const $ = (id) => document.getElementById(id);
// 文案：有 chrome.i18n 用它，没有（在普通网页里预览）用简体
const tr = (key, fallback) => {
  const v = t(key);
  return v && v !== key ? v : fallback;
};

async function setAccount(state) {
  document.documentElement.dataset.account = state;
  try {
    localStorage.setItem(ACCOUNT_KEY, state);
  } catch {}
  await local?.set({ [ACCOUNT_KEY]: state });
}

function dayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return tr("today", "今天");
  if (d.toDateString() === y.toDateString()) return tr("yesterday", "昨天");
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const history = [];
function renderHistory() {
  const box = $("history");
  box.replaceChildren();
  $("history-empty").hidden = history.length > 0;
  const days = new Map();
  for (const h of history) (days.get(dayLabel(h.at)) ?? days.set(dayLabel(h.at), []).get(dayLabel(h.at))).push(h);
  for (const [day, list] of days) {
    const section = document.createElement("section");
    section.innerHTML = `<h3 class="xxd-history__day"></h3><ul class="xxd-list xxd-group__body" data-interactive></ul>`;
    section.querySelector("h3").textContent = day;
    for (const h of list) {
      const li = document.createElement("li");
      li.className = "xxd-list__item";
      li.innerHTML = `<div class="xxd-list__main"><div class="xxd-list__title"></div><div class="xxd-list__meta"></div></div><button class="xxd-btn xxd-reveal" data-variant="ghost" data-size="xs" data-confirm-twice="确认删除">删除</button>`;
      li.querySelector(".xxd-list__title").textContent = h.title;
      li.querySelector(".xxd-list__meta").textContent = new Date(h.at).toLocaleTimeString().slice(0, 5);
      li.querySelector("button").addEventListener("xxd:confirm", () => {
        history.splice(history.indexOf(h), 1);
        renderHistory();
      });
      section.querySelector("ul").append(li);
    }
    box.append(section);
  }
}

function renderPlan(member) {
  const line = $("plan-line");
  const text = member ? "会员 · 到 2027年11月8日" : "完整体验 · 还剩 7 天";
  if (line.textContent) Xxd.rollText(line, text);
  else line.textContent = text;
  line.dataset.tone = member ? "member" : "";
  $("avatar").toggleAttribute("data-member", member);
  $("upgrade").textContent = member ? "管理" : tr("upgrade", "开通会员");
}

async function main() {
  applyI18n(document);
  await store.load();
  const saved = await local?.get(ACCOUNT_KEY);
  if (saved?.[ACCOUNT_KEY]) await setAccount(saved[ACCOUNT_KEY]);

  Xxd.mountAppearance($("appearance"), { locale: uiLocale(), get: store.get, set: (patch) => store.set(patch) });
  Xxd.init(document);
  $("version").textContent = globalThis.chrome?.runtime?.getManifest?.().version ?? "0.1.0";

  // 登录（样板：任何邮箱都能进）
  $("signin-form").addEventListener("submit", (e) => {
    e.preventDefault();
    setAccount("signed-in");
  });
  $("signin-google").addEventListener("click", () => setAccount("signed-in"));
  $("signout").addEventListener("xxd:confirm", () => setAccount("signed-out"));

  // 主页：拖放 / 粘贴 / 选择文件
  const items = $("items");
  const add = (title) => {
    items.hidden = false;
    $("dropzone").hidden = true;
    const li = document.createElement("li");
    li.className = "xxd-list__item";
    li.textContent = title;
    items.append(li);
    history.unshift({ title, at: Date.now() });
    renderHistory();
    Xxd.setStatus($("status"), `${items.children.length} 项`);
  };
  Xxd.bindDrop(document.querySelector(".app-body"), {
    zone: $("dropzone"),
    veil: tr("dropVeil", "松手，放进来"),
    onFiles: (files) => files.forEach((f) => add(f.name)),
    onText: (text) => add(text.slice(0, 60)),
  });
  $("pick").addEventListener("click", () => {
    const input = Object.assign(document.createElement("input"), { type: "file", multiple: true });
    input.addEventListener("change", () => [...input.files].forEach((f) => add(f.name)));
    input.click();
  });
  renderHistory();

  // 设置：搜索、会员（样板：「我已支付」直接开通）
  Xxd.bindSettingsSearch($("settings-search"), $("settings"));
  renderPlan(false);
  $("upgrade").addEventListener("click", () => ($("purchase").hidden = !$("purchase").hidden));
  $("pay").addEventListener("click", () => Xxd.toast(tr("payOpened", "已在新标签页打开支付页")));
  $("paid").addEventListener("click", (e) =>
    Xxd.runBusy(e.currentTarget, () => new Promise((r) => setTimeout(r, 800))).then(() => {
      $("purchase").hidden = true;
      renderPlan(true);
      Xxd.celebrate($("avatar"));
      Xxd.toast(tr("memberDone", "会员已开通"), { tone: "success" });
    }),
  );

  $("primary").addEventListener("click", () => Xxd.toast(tr("doneToast", "完成了"), { tone: "success" }));
}

main();
