// 「外观」设置组：主题 · 圆角 · 主色 ·（密度）·（语言）。每个插件都要的那一组。
//   mountAppearance(container, { locale: "zh-CN", lockCorners: false, showDensity: false,
//                               languages: [{ value: "zh-CN", label: "简体中文" }, …], language, onLanguage })
// 读写默认走 window.XxdTheme（@xxd/tokens/dist/boot.js）；插件里可以传 get / set 接到 chrome.storage。
import { emit } from "./dom.js";

const PRESETS_FALLBACK = [{ id: "", name: "Ink", zh: "墨色" }];

export const APPEARANCE_LABELS = {
  "zh-CN": {
    group: "外观", theme: "主题", light: "亮", dark: "暗", system: "跟随系统",
    corners: "圆角", cornersDesc: "关闭时为直角", accent: "主色", accentDesc: "按钮、选中和焦点使用这个颜色",
    density: "密度", comfortable: "标准", compact: "紧凑", finish: "按钮质感", flat: "纯平", material: "质感", language: "语言", ink: "墨色",
  },
  "zh-Hant": {
    group: "外觀", theme: "主題", light: "亮", dark: "暗", system: "跟隨系統",
    corners: "圓角", cornersDesc: "關閉時為直角", accent: "主色", accentDesc: "按鈕、選中和焦點使用這個顏色",
    density: "密度", comfortable: "標準", compact: "緊湊", finish: "按鈕質感", flat: "純平", material: "質感", language: "語言", ink: "墨色",
  },
  en: {
    group: "Appearance", theme: "Theme", light: "Light", dark: "Dark", system: "System",
    corners: "Rounded corners", cornersDesc: "Off keeps every corner square", accent: "Accent", accentDesc: "Used for buttons, selection and focus",
    density: "Density", comfortable: "Comfortable", compact: "Compact", finish: "Button finish", flat: "Flat", material: "Material", language: "Language", ink: "Ink",
  },
};

function row(doc, title, desc, control) {
  const el = doc.createElement("div");
  el.className = "xxd-row";
  const text = doc.createElement("div");
  text.className = "xxd-row__text";
  const t = doc.createElement("div");
  t.className = "xxd-row__title";
  t.textContent = title;
  text.append(t);
  if (desc) {
    const d = doc.createElement("div");
    d.className = "xxd-row__desc";
    d.textContent = desc;
    text.append(d);
  }
  const c = doc.createElement("div");
  c.className = "xxd-row__control";
  c.append(control);
  el.append(text, c);
  return el;
}

function segmented(doc, name, options, value, label) {
  const g = doc.createElement("div");
  g.className = "xxd-segmented";
  g.setAttribute("data-xxd-segmented", "");
  g.setAttribute("role", "radiogroup");
  g.setAttribute("aria-label", label);
  g.dataset.name = name;
  for (const [v, text] of options) {
    const b = doc.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.dataset.value = v;
    b.textContent = text;
    b.setAttribute("aria-checked", String(v === value));
    b.tabIndex = v === value ? 0 : -1;
    g.append(b);
  }
  return g;
}

export function mountAppearance(container, options = {}) {
  const doc = container.ownerDocument;
  const theme = globalThis.XxdTheme;
  const {
    locale = "zh-CN",
    labels: customLabels,
    get = () => ({ ...(theme?.DEFAULT_SETTINGS ?? {}), ...(theme?.read() ?? {}) }),
    set = (patch) => theme?.set(patch),
    presets = theme?.ACCENT_PRESETS ?? PRESETS_FALLBACK,
    lockCorners = Boolean(theme?.lock?.corners),
    showDensity = false,
    showFinish = false,
    languages,
    language,
    onLanguage,
  } = options;
  const L = { ...(APPEARANCE_LABELS[locale] || APPEARANCE_LABELS["zh-CN"]), ...customLabels };
  const s = get();

  const group = doc.createElement("section");
  group.className = "xxd-group";
  group.dataset.xxdAppearance = "";
  const title = doc.createElement("h3");
  title.className = "xxd-group__title";
  title.textContent = L.group;
  const body = doc.createElement("div");
  body.className = "xxd-group__body";
  group.append(title, body);

  body.append(row(doc, L.theme, "", segmented(doc, "theme", [["light", L.light], ["dark", L.dark], ["system", L.system]], s.theme || "light", L.theme)));

  if (!lockCorners) {
    const sw = doc.createElement("input");
    sw.type = "checkbox";
    sw.className = "xxd-switch";
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-label", L.corners);
    sw.checked = s.corners === "rounded";
    sw.addEventListener("change", () => {
      set({ corners: sw.checked ? "rounded" : "square" });
      emit(group, "xxd:appearance", get());
    });
    body.append(row(doc, L.corners, L.cornersDesc, sw));
  }

  const swatches = doc.createElement("div");
  swatches.className = "xxd-swatches";
  swatches.setAttribute("role", "radiogroup");
  swatches.setAttribute("aria-label", L.accent);
  for (const p of presets) {
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "xxd-swatch";
    b.setAttribute("role", "radio");
    const name = p.id ? (locale === "en" ? p.name : p.zh || p.name) : L.ink;
    b.setAttribute("aria-label", name);
    b.dataset.tooltip = name;
    b.dataset.value = p.id;
    if (p.id) b.style.setProperty("--swatch", p.id);
    b.setAttribute("aria-checked", String((s.accent || "") === p.id));
    swatches.append(b);
  }
  swatches.addEventListener("click", (event) => {
    const b = event.target.closest(".xxd-swatch");
    if (!b) return;
    for (const x of swatches.children) x.setAttribute("aria-checked", String(x === b));
    set({ accent: b.dataset.value });
    emit(group, "xxd:appearance", get());
  });
  const accentRow = row(doc, L.accent, L.accentDesc, swatches);
  accentRow.setAttribute("data-stack", "");
  body.append(accentRow);

  if (showDensity) {
    body.append(row(doc, L.density, "", segmented(doc, "density", [["comfortable", L.comfortable], ["compact", L.compact]], s.density || "comfortable", L.density)));
  }

  if (showFinish) {
    body.append(row(doc, L.finish, "", segmented(doc, "finish", [["flat", L.flat], ["material", L.material]], s.finish || "flat", L.finish)));
  }

  if (languages?.length) {
    const wrap = doc.createElement("label");
    wrap.className = "xxd-select";
    wrap.dataset.variant = "bare";
    const sel = doc.createElement("select");
    sel.setAttribute("aria-label", L.language);
    for (const lang of languages) sel.append(new Option(lang.label, lang.value, false, lang.value === language));
    sel.addEventListener("change", () => onLanguage?.(sel.value));
    wrap.append(sel);
    body.append(row(doc, L.language, "", wrap));
  }

  group.addEventListener("xxd:change", (event) => {
    const name = event.target?.dataset?.name;
    if (!name) return;
    set({ [name]: event.detail.value });
    emit(group, "xxd:appearance", get());
  });

  /** 设置在别处被改（命令面板、另一个页面）时，同步控件状态。 */
  function sync() {
    const now = get();
    for (const g of group.querySelectorAll("[data-xxd-segmented][data-name]")) {
      const value = now[g.dataset.name];
      for (const b of g.children) {
        b.setAttribute("aria-checked", String(b.dataset.value === value));
        b.tabIndex = b.dataset.value === value ? 0 : -1;
      }
    }
    const sw = group.querySelector(".xxd-switch");
    if (sw) sw.checked = now.corners === "rounded";
    for (const b of swatches.children) b.setAttribute("aria-checked", String((now.accent || "") === b.dataset.value));
  }
  const onSettings = () => sync();
  globalThis.addEventListener?.("xxd:settings", onSettings);

  container.append(group);
  return {
    element: group,
    sync,
    destroy: () => {
      globalThis.removeEventListener?.("xxd:settings", onSettings);
      group.remove();
    },
  };
}
