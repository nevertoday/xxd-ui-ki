import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createAppearanceStore } from "../src/settings.js";
import { mountXxdUI } from "../src/shadow.js";
import { applyI18n, t, uiLocale } from "../src/i18n.js";
import { buildAll, create, docComponent, listComponents, dropDeclarations, findFallbackConflicts, status, sync, upsertRegion } from "../scripts/cli.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

function mockChrome() {
  const data = {};
  const listeners = new Set();
  globalThis.chrome = {
    storage: {
      sync: {
        get: vi.fn(async (key) => ({ [key]: data[key] })),
        set: vi.fn(async (obj) => {
          const changes = {};
          for (const [k, v] of Object.entries(obj)) {
            changes[k] = { oldValue: data[k], newValue: v };
            data[k] = v;
          }
          listeners.forEach((fn) => fn(changes, "sync"));
        }),
      },
      onChanged: { addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn) },
    },
  };
  return { data, emit: (changes) => listeners.forEach((fn) => fn(changes, "sync")) };
}

afterEach(() => {
  delete globalThis.chrome;
  localStorage.clear();
  document.documentElement.removeAttribute("data-corners");
});

describe("createAppearanceStore", () => {
  it("从 chrome.storage 读、写镜像、应用到 <html>，默认直角", async () => {
    const { data } = mockChrome();
    data["demo-ui"] = { theme: "dark", accent: "#3b74b8" };
    const store = createAppearanceStore({ key: "demo-ui" });
    await store.load();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-corners")).toBe("square");
    expect(JSON.parse(localStorage.getItem("demo-ui")).accent).toBe("#3b74b8");
  });

  it("set 写 chrome.storage；别的页面改了也能收到", async () => {
    const { data, emit } = mockChrome();
    const store = createAppearanceStore({ key: "demo-ui" });
    await store.load();
    const seen = vi.fn();
    store.subscribe(seen);
    await store.set({ corners: "rounded" });
    expect(data["demo-ui"].corners).toBe("rounded");
    expect(document.documentElement.getAttribute("data-corners")).toBe("rounded");
    emit({ "demo-ui": { newValue: { corners: "square", theme: "light" } } });
    expect(document.documentElement.getAttribute("data-corners")).toBe("square");
    expect(seen).toHaveBeenCalled();
  });

  it("apply: false 时不碰页面", async () => {
    mockChrome();
    const store = createAppearanceStore({ key: "demo-ui", apply: false });
    await store.load();
    await store.set({ corners: "rounded" });
    expect(document.documentElement.getAttribute("data-corners")).toBeNull();
  });

  it("没有 chrome 时退回 localStorage", async () => {
    const store = createAppearanceStore({ key: "plain-ui" });
    await store.load();
    await store.set({ theme: "dark" });
    expect(JSON.parse(localStorage.getItem("plain-ui")).theme).toBe("dark");
  });
});

describe("mountXxdUI", () => {
  it("建 Shadow DOM、注入样式、外观写到 host", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    if (!globalThis.CSSStyleSheet.prototype.replaceSync) globalThis.CSSStyleSheet.prototype.replaceSync = function () {};
    const ui = await mountXxdUI(host, { cssText: ":host{--x:1}", settings: { theme: "dark", corners: "rounded" }, install: false });
    expect(ui.root).toBe(host.shadowRoot);
    expect(host.getAttribute("data-theme")).toBe("dark");
    expect(host.getAttribute("data-corners")).toBe("rounded");
    expect(document.documentElement.getAttribute("data-corners")).toBeNull();
    ui.destroy();
    expect(host.isConnected).toBe(false);
  });
});

describe("i18n", () => {
  it("没有 chrome.i18n 时用字典，支持 $1 替换", () => {
    expect(t("count", [3], { count: "今天还能写入 $1 篇" })).toBe("今天还能写入 3 篇");
    document.body.innerHTML = `<span data-i18n="hello"></span><input data-i18n-attr="placeholder:ph">`;
    applyI18n(document, { hello: "你好", ph: "搜索" });
    expect(document.querySelector("span").textContent).toBe("你好");
    expect(document.querySelector("input").placeholder).toBe("搜索");
    document.body.innerHTML = `<span data-i18n="missing">原文</span>`;
    applyI18n(document, {});
    expect(document.querySelector("span").textContent).toBe("原文");
  });

  it("UI 语言映射到三种", () => {
    expect(uiLocale("zh-TW")).toBe("zh-Hant");
    expect(uiLocale("zh-CN")).toBe("zh-CN");
    expect(uiLocale("en-US")).toBe("en");
  });
});

describe("CLI：new / sync / status", () => {
  it("新建的插件是合法的 MV3，三语齐全，vendor 拷好，没有残留占位符", async () => {
    await buildAll({ quiet: true });
    const base = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "xxd-cli-"));
    const dir = join(base, "demo");
    try {
      await create(dir, { name: "批量存图", nameEn: "Bulk Save", slug: "bulk-save" });
      const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
      expect(manifest.manifest_version).toBe(3);
      expect(manifest.default_locale).toBe("zh_CN");
      for (const loc of ["zh_CN", "zh_TW", "en"]) {
        const msgs = JSON.parse(readFileSync(join(dir, "_locales", loc, "messages.json"), "utf8"));
        expect(msgs.appName.message).toBeTruthy();
      }
      expect(JSON.parse(readFileSync(join(dir, "_locales/zh_TW/messages.json"), "utf8")).appName.message).toBe("批量存圖");
      for (const f of ["tokens.css", "xxd.css", "xxd.shadow.css", "xxd.js", "boot.js", "icons.js", "extension.js", "VERSION", "LICENSE"]) {
        expect(existsSync(join(dir, "vendor/xxd", f)), f).toBe(true);
      }
      const all = readdirSync(dir).filter((f) => /\.(html|js|json)$/.test(f)).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
      expect(all).not.toMatch(/__[A-Z_]+__/);
      expect(all).toContain("bulk-save-ui");
      expect(status(dir).state).toBe("最新");
      sync(dir, { quiet: true });
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("upsertRegion", () => {
  it("第一次插在开头（@import 之后），再次运行替换同一段，不重复", () => {
    const css = `@import url("a.css");\n:root { --bg: #fff; }\n`;
    const once = upsertRegion(css, "@layer xxd.tokens { :root { --r-sm: 0px; } }");
    expect(once.indexOf("@import")).toBe(0);
    expect(once.indexOf("xxd:tokens:start")).toBeGreaterThan(once.indexOf("@import"));
    expect(once.indexOf("xxd:tokens:end")).toBeLessThan(once.indexOf("--bg"));
    const twice = upsertRegion(once, "@layer xxd.tokens { :root { --r-sm: 2px; } }");
    expect(twice.match(/xxd:tokens:start/g).length).toBe(1);
    expect(twice).toContain("--r-sm: 2px");
    expect(twice).not.toContain("--r-sm: 0px");
    expect(twice.endsWith(":root { --bg: #fff; }\n")).toBe(true);
  });
});

describe("老项目保护", () => {
  it("找出用了但没声明的令牌名，并能从 CSS 里去掉它们", () => {
    const base = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "xxd-legacy-"));
    try {
      mkdirSync(join(base, "public"));
      writeFileSync(join(base, "public/styles.css"), ":root{--bg:#fff}.a{color:var(--danger,#b91c1c)}.b{outline-color:var(--focus-ring, red)}.c{color:var(--bg)}");
      const found = findFallbackConflicts(base, ["--bg", "--danger", "--focus-ring", "--r-sm"]);
      expect(found.sort()).toEqual(["--danger", "--focus-ring"]);
      const css = ":root {\n  --danger: #b42318;\n  --danger-rgb: 1, 2, 3;\n  --r-sm: 0px;\n}";
      expect(dropDeclarations(css, found)).toBe(":root {\n  --danger-rgb: 1, 2, 3;\n  --r-sm: 0px;\n}");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe("ls / doc", () => {
  it("列出原生和 React 组件；doc 给出类名、示例和规则", () => {
    const list = listComponents();
    expect(list).toContain("Dialog");
    expect(list).toContain("React 组件");
    const doc = docComponent("dialog");
    expect(doc).toContain("ui-dialog-cancel");
    expect(doc).toContain("取消在前");
    expect(docComponent("Button", { react: true })).toContain('import { Button } from "@xxd/react"');
    expect(() => docComponent("Nope")).toThrow();
  });
});
