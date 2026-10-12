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
