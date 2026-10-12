// 注册表与 CSS 一致：注册表里的每个类都真的存在；CSS 里的每个组件根类都登记了。
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const registry = JSON.parse(readFileSync(join(root, "registry.json"), "utf8"));
const css = readdirSync(join(root, "src/css")).map((f) => readFileSync(join(root, "src/css", f), "utf8")).join("\n");
const defined = new Set([...css.matchAll(/\.((?:xxd-[\w-]+)|ui-dialog-cancel)/g)].map((m) => m[1]));

describe("registry.json", () => {
  it("每个组件有名字、中文名、分类、示例", () => {
    for (const c of registry.components) {
      expect(c.name && c.zh && c.category && c.markup, c.name).toBeTruthy();
    }
    const names = registry.components.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("登记的类在 CSS 里都存在", () => {
    const missing = registry.components.flatMap((c) => c.classes.filter((k) => !defined.has(k)).map((k) => `${c.name}: ${k}`));
    expect(missing).toEqual([]);
  });

  it("CSS 里的类都登记在某个组件下（工具类除外）", () => {
    const listed = new Set(registry.components.flatMap((c) => c.classes));
    const utilities = new Set(["xxd-page", "xxd-sr-only", "xxd-title", "xxd-heading", "xxd-muted", "xxd-small", "xxd-mono", "xxd-divider", "xxd-read", "xxd-stack", "xxd-cluster"]);
    const unlisted = [...defined].filter((k) => !listed.has(k) && !utilities.has(k));
    expect(unlisted).toEqual([]);
  });
});
