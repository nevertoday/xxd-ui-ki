// 行为测试（happy-dom）。
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as Xxd from "../src/js/index.js";

beforeAll(() => Xxd.install(document));
afterEach(() => {
  document.body.innerHTML = "";
});

const html = (s) => {
  document.body.insertAdjacentHTML("beforeend", s);
  Xxd.init(document);
};
const key = (el, k) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("confirmDialog", () => {
  it("取消在前、主操作在后；点主操作 resolve(true)", async () => {
    if (!HTMLDialogElement.prototype.showModal) HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    const p = Xxd.confirmDialog({ title: "删除这条记录？", message: "删除后不能恢复。", confirmLabel: "删除", tone: "danger" });
    const dialog = document.querySelector("dialog.xxd-dialog");
    const buttons = [...dialog.querySelectorAll(".xxd-dialog__actions button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["取消", "删除"]);
    expect(buttons[0].classList.contains("ui-dialog-cancel")).toBe(true);
    expect(buttons[1].dataset.variant).toBe("danger");
    dialog.close("confirm");
    await expect(p).resolves.toBe(true);
  });

  it("关闭 = 取消", async () => {
    const p = Xxd.confirmDialog({ title: "继续？" });
    document.querySelector("dialog").close("cancel");
    await expect(p).resolves.toBe(false);
  });
});

describe("tabs", () => {
  it("点击和方向键切换，面板跟着显示，派发 xxd:change", () => {
    html(`<div class="xxd-tabs" data-xxd-tabs>
      <button role="tab" id="t1" aria-controls="p1" data-value="write" aria-selected="true">写作</button>
      <button role="tab" id="t2" aria-controls="p2" data-value="history">记录</button>
    </div><div id="p1">A</div><div id="p2">B</div>`);
    const list = document.querySelector("[data-xxd-tabs]");
    const [t1, t2] = list.querySelectorAll('[role="tab"]');
    expect(document.getElementById("p2").hidden).toBe(true);
    expect(list.querySelector(".xxd-tabs__ink")).toBeTruthy();
    const onChange = vi.fn();
    list.addEventListener("xxd:change", (e) => onChange(e.detail.value));
    t2.click();
    expect(t2.getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("p1").hidden).toBe(true);
    expect(onChange).toHaveBeenCalledWith("history");
    key(t2, "ArrowRight");
    expect(t1.getAttribute("aria-selected")).toBe("true");
    expect(t1.tabIndex).toBe(0);
    expect(t2.tabIndex).toBe(-1);
  });
});

describe("分段控件", () => {
  it("选中项 aria-checked，方向键移动", () => {
    html(`<div class="xxd-segmented" data-xxd-segmented><button role="radio" data-value="light">亮</button><button role="radio" data-value="dark">暗</button></div>`);
    const [a, b] = document.querySelectorAll('[role="radio"]');
    expect(a.getAttribute("aria-checked")).toBe("true");
    b.click();
    expect(b.getAttribute("aria-checked")).toBe("true");
    expect(a.getAttribute("aria-checked")).toBe("false");
    key(b, "ArrowLeft");
    expect(a.getAttribute("aria-checked")).toBe("true");
  });
});

describe("toast", () => {
  it("within 时出现在容器里（就地反馈），并带 aria-live", () => {
    html(`<aside id="panel"></aside>`);
    const panel = document.getElementById("panel");
    Xxd.toast("已保存", { tone: "success", within: panel, duration: 0 });
    const region = panel.querySelector(".xxd-toast-region");
    expect(region?.hasAttribute("data-scoped")).toBe(true);
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toContain("已保存");
  });
});

describe("sheet", () => {
  it("打开时 dock 主操作隐藏标记、Esc 关闭、焦点回到按钮", () => {
    html(`<div class="xxd-sheet-host">
      <div class="xxd-scrim"></div>
      <section class="xxd-sheet" id="s1"><button id="inside">x</button></section>
      <footer class="xxd-dock"><button id="opener" data-xxd-sheet-open="s1">封面</button></footer>
    </div>`);
    const opener = document.getElementById("opener");
    opener.focus();
    opener.click();
    const sheet = document.getElementById("s1");
    expect(sheet.hasAttribute("data-open")).toBe(true);
    expect(document.querySelector(".xxd-sheet-host").hasAttribute("data-sheet-open")).toBe(true);
    key(document.getElementById("inside"), "Escape");
    expect(sheet.hasAttribute("data-open")).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});

describe("标签输入", () => {
  it("回车添加、去重、退格删除最后一个", () => {
    html(`<div class="xxd-taginput" data-xxd-taginput><input></div>`);
    const box = document.querySelector(".xxd-taginput");
    const input = box.querySelector("input");
    input.value = "海报";
    key(input, "Enter");
    input.value = "海报";
    key(input, "Enter");
    input.value = "封面";
    key(input, ",");
    expect(Xxd.tagValues(box)).toEqual(["海报", "封面"]);
    key(input, "Backspace");
    expect(Xxd.tagValues(box)).toEqual(["海报"]);
  });
});

describe("combobox", () => {
  it("输入过滤，方向键 + 回车选择", () => {
    html(`<div data-xxd-combobox><input class="xxd-input"><ul class="xxd-listbox">
      <li class="xxd-option" data-value="x">X 蓝</li><li class="xxd-option" data-value="lake">湖蓝</li><li class="xxd-option" data-value="moss">苔绿</li>
    </ul></div>`);
    const wrap = document.querySelector("[data-xxd-combobox]");
    const input = wrap.querySelector("input");
    expect(input.getAttribute("role")).toBe("combobox");
    input.value = "蓝";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const visible = [...wrap.querySelectorAll(".xxd-option")].filter((o) => !o.hidden).map((o) => o.dataset.value);
    expect(visible).toEqual(["x", "lake"]);
    key(input, "ArrowDown");
    key(input, "ArrowDown");
    key(input, "Enter");
    expect(wrap.dataset.value).toBe("lake");
    expect(input.value).toBe("湖蓝");
  });
});

describe("搜索高亮", () => {
  it("markMatches 包裹匹配文字，clearMarks 还原", () => {
    html(`<div id="r"><p>暗色主题</p><p>主题与圆角</p></div>`);
    const r = document.getElementById("r");
    expect(Xxd.markMatches(r, "主题")).toBe(2);
    expect(r.querySelectorAll("mark.xxd-hit").length).toBe(2);
    Xxd.clearMarks(r);
    expect(r.querySelectorAll("mark").length).toBe(0);
    expect(r.textContent).toBe("暗色主题主题与圆角");
  });
});

describe("外观设置组", () => {
  it("渲染主题 / 圆角 / 主色；改动通过 set 写出；lockCorners 时没有圆角行", () => {
    let state = { theme: "light", corners: "square", accent: "" };
    const set = vi.fn((patch) => (state = { ...state, ...patch }));
    const presets = [{ id: "", name: "Ink", zh: "墨色" }, { id: "#3b74b8", name: "Lake blue", zh: "湖蓝" }];
    const host = document.createElement("div");
    document.body.append(host);
    Xxd.mountAppearance(host, { get: () => state, set, presets });
    Xxd.init(host);
    const sw = host.querySelector(".xxd-switch");
    sw.checked = true;
    sw.dispatchEvent(new Event("change", { bubbles: true }));
    expect(set).toHaveBeenCalledWith({ corners: "rounded" });
    host.querySelector('.xxd-swatch[data-value="#3b74b8"]').click();
    expect(state.accent).toBe("#3b74b8");
    host.querySelector('[data-name="theme"] [data-value="dark"]').click();
    expect(state.theme).toBe("dark");

    const locked = document.createElement("div");
    Xxd.mountAppearance(locked, { get: () => state, set, presets, lockCorners: true, locale: "en" });
    expect(locked.querySelector(".xxd-switch")).toBeNull();
    expect(locked.querySelector(".xxd-group__title").textContent).toBe("Appearance");
  });
});

describe("复制", () => {
  it("[data-copy] 写入剪贴板并短暂显示完成", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    html(`<button data-copy="hello">${Xxd.ICON.copy(16)}</button>`);
    document.querySelector("[data-copy]").click();
    await new Promise((r) => setTimeout(r, 0));
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(document.querySelector("[data-copy]").hasAttribute("data-done")).toBe(true);
  });
});

describe("O1 交互基础层", () => {
  it("sheet 打开时 Tab 在里面循环（焦点陷阱）", () => {
    html(`<div class="xxd-sheet-host"><div class="xxd-scrim"></div>
      <section class="xxd-sheet" id="s9"><button id="a">a</button><button id="b">b</button></section>
      <footer><button id="open9" data-xxd-sheet-open="s9">open</button></footer></div>`);
    for (const el of document.querySelectorAll("button")) el.getClientRects = () => [{}];
    document.getElementById("open9").click();
    const b = document.getElementById("b");
    b.focus();
    const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    b.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement.id).toBe("a");
    Xxd.closeSheet(document.getElementById("s9"));
  });

  it("tooltip 组：刚关掉 300ms 内显示下一个是立即的（data-instant）", () => {
    html(`<button id="t1" data-tooltip="一">1</button><button id="t2" data-tooltip="二">2</button>`);
    Xxd.showTooltip(document.getElementById("t1"));
    const tip = document.querySelector(".xxd-tooltip");
    expect(tip.hasAttribute("data-instant")).toBe(false);
    Xxd.hideTooltip();
    Xxd.showTooltip(document.getElementById("t2"));
    expect(tip.hasAttribute("data-instant")).toBe(true);
    expect(tip.textContent).toBe("二");
    Xxd.hideTooltip();
  });

  it("runBusy：进行中 aria-busy，完成后图标变勾", async () => {
    html(`<button class="xxd-btn" id="rb">${Xxd.ICON.copy(16)}保存</button>`);
    const btn = document.getElementById("rb");
    let resolve;
    const p = Xxd.runBusy(btn, () => new Promise((r) => (resolve = r)));
    expect(btn.getAttribute("aria-busy")).toBe("true");
    resolve(42);
    await expect(p).resolves.toBe(42);
    expect(btn.hasAttribute("aria-busy")).toBe(false);
    expect(btn.hasAttribute("data-done")).toBe(true);
    expect(btn.innerHTML).toContain("m6 12 4 4 8-8");
  });

  it("菜单：鼠标移进哪一项，焦点就在哪一项（只有一个高亮）", () => {
    html(`<div class="xxd-menu" role="menu"><button class="xxd-menu__item" role="menuitem" id="m1">一</button><button class="xxd-menu__item" role="menuitem" id="m2">二</button></div>`);
    document.getElementById("m2").dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
    expect(document.activeElement.id).toBe("m2");
  });

  it("place 写出缩放原点和箭头位置", () => {
    html(`<button id="anc">a</button><div id="fl" style="position:fixed"></div>`);
    const anc = document.getElementById("anc");
    const fl = document.getElementById("fl");
    anc.getBoundingClientRect = () => ({ left: 100, right: 140, top: 50, bottom: 70, width: 40, height: 20 });
    fl.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 100, width: 200, height: 100 });
    Xxd.place(anc, fl, { placement: "bottom-start" });
    expect(fl.dataset.side).toBe("bottom");
    expect(fl.style.getPropertyValue("--xxd-origin")).toBe("20px 0");
    expect(fl.style.getPropertyValue("--xxd-arrow-x")).toBe("20px");
  });
});

describe("O2 组件", () => {
  const pickerHtml = (multi = "") => `<div class="xxd-picker" data-xxd-picker ${multi} data-placeholder="请选择">
    <button class="xxd-picker__trigger"><span class="xxd-picker__value"></span></button>
    <div class="xxd-listbox">
      <div class="xxd-option" data-value="high"><span>高<small>2K，慢一点</small></span></div>
      <div class="xxd-option" data-value="std">标准</div>
      <div class="xxd-option" data-value="no" aria-disabled="true">不可选</div>
    </div></div>`;

  it("Picker：点开、选择、派发 xxd:change、显示选中的字", () => {
    html(pickerHtml());
    const picker = document.querySelector("[data-xxd-picker]");
    const trigger = picker.querySelector(".xxd-picker__trigger");
    expect(picker.querySelector(".xxd-picker__value").textContent).toBe("请选择");
    const seen = vi.fn();
    picker.addEventListener("xxd:change", (e) => seen(e.detail.value));
    trigger.click();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    picker.querySelector('[data-value="std"]').click();
    expect(seen).toHaveBeenCalledWith("std");
    expect(picker.dataset.value).toBe("std");
    expect(picker.querySelector(".xxd-picker__value").textContent).toBe("标准");
    picker.querySelector(".xxd-picker__trigger").click();
    picker.querySelector('[data-value="high"]').click();
    expect(picker.querySelector(".xxd-picker__value").textContent).toBe("高");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("Picker：键盘 ↓ 打开、跳过禁用项、Enter 选择；多选不关", () => {
    html(pickerHtml("data-multiple"));
    const picker = document.querySelector("[data-xxd-picker]");
    const trigger = picker.querySelector(".xxd-picker__trigger");
    key(trigger, "ArrowDown");
    expect(picker.querySelector(".xxd-listbox").hidden).toBe(false);
    key(trigger, "Enter");
    key(trigger, "ArrowDown");
    key(trigger, "ArrowDown");
    expect(picker.querySelector(".xxd-option[data-active]").dataset.value).toBe("high");
    key(trigger, "ArrowDown");
    key(trigger, "Enter");
    expect(picker.dataset.value).toBe("high,std");
    expect(picker.querySelector(".xxd-listbox").hidden).toBe(false);
  });

  it("密钥输入：显示 / 隐藏切换 type 和 aria-pressed", () => {
    html(`<div class="xxd-input-group xxd-secret" data-xxd-secret><input type="password" value="sk_1"><button data-secret-toggle aria-label="显示"></button></div>`);
    const btn = document.querySelector("[data-secret-toggle]");
    btn.click();
    expect(document.querySelector("input").type).toBe("text");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.getAttribute("aria-label")).toBe("隐藏");
    btn.click();
    expect(document.querySelector("input").type).toBe("password");
  });

  it("Toast：同一句话不重复加，只动一下；多张时写出叠放序号", () => {
    html(`<aside id="tp"></aside>`);
    const within = document.getElementById("tp");
    Xxd.toast("已保存", { within, duration: 0 });
    Xxd.toast("已保存", { within, duration: 0 });
    expect(within.querySelectorAll(".xxd-toast").length).toBe(1);
    expect(within.querySelector(".xxd-toast").hasAttribute("data-bump")).toBe(true);
    Xxd.toast("第二条", { within, duration: 0 });
    Xxd.toast("第三条", { within, duration: 0 });
    Xxd.toast("第四条", { within, duration: 0 });
    const list = [...within.querySelectorAll(".xxd-toast")];
    expect(list.map((t) => t.style.getPropertyValue("--i"))).toEqual(["3", "2", "1", "0"]);
    expect(list[0].hasAttribute("data-hidden-in-stack")).toBe(true);
  });

  it("菜单：单选组互斥；→ 打开子菜单并聚焦第一项，← 回到父项", () => {
    html(`<div class="xxd-menu" id="pm" role="menu">
      <button class="xxd-menu__item" role="menuitem" id="ex" data-submenu="sm">导出为</button>
      <div class="xxd-menu" id="sm" role="menu"><button class="xxd-menu__item" role="menuitem" id="md">Markdown</button></div>
      <div role="group"><button class="xxd-menu__item" role="menuitemradio" aria-checked="true" id="r1">新</button><button class="xxd-menu__item" role="menuitemradio" aria-checked="false" id="r2">旧</button></div>
    </div>`);
    document.getElementById("r2").click();
    expect(document.getElementById("r1").getAttribute("aria-checked")).toBe("false");
    expect(document.getElementById("r2").getAttribute("aria-checked")).toBe("true");
    const ex = document.getElementById("ex");
    ex.focus();
    key(ex, "ArrowRight");
    expect(ex.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement.id).toBe("md");
    key(document.getElementById("md"), "ArrowLeft");
    expect(ex.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement.id).toBe("ex");
  });
});
