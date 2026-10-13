// 体积预算（gzip 后）：插件里每个页面都要加载这几个文件。超了先想想是不是该拆，而不是直接调高预算。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const BUDGET_KB = { "xxd.min.css": 22, "xxd.js": 32, "boot.js": 3.5, "icons.js": 16, "xxd.shadow.css.js": 24 };

describe("体积预算", () => {
  for (const [file, kb] of Object.entries(BUDGET_KB)) {
    it(`${file} ≤ ${kb}KB gzip`, () => {
      const size = gzipSync(readFileSync(join(import.meta.dirname, "../dist", file))).length / 1024;
      expect(Number(size.toFixed(1))).toBeLessThanOrEqual(kb);
    });
  }
});
