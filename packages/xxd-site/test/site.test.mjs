import { test } from "node:test";
import assert from "node:assert/strict";
import { forceStates } from "../scripts/assets.mjs";
import { extractFunction, withAttr, STATES } from "../src/lib/markup.js";

test("forceStates：把 :hover / :focus-visible / :active 复制成 [data-force] 版本，包在 xxd.components 层里", () => {
  const css = `@layer xxd.components { .xxd-btn:hover { background: red; } .xxd-btn:focus-visible { outline: 1px solid; } @media (max-width: 400px) { .a:active { color: blue; } } @keyframes k { from { opacity: 0 } } .plain { color: x; } }`;
  const out = forceStates(css);
  assert.match(out, /@layer xxd\.components/);
  assert.match(out, /\.xxd-force-scope \.xxd-btn\[data-force~="hover"\] \{ background: red; \}/);
  assert.match(out, /\.xxd-force-scope \.xxd-btn\[data-force~="focus"\]/);
  assert.match(out, /@media \(max-width: 400px\) \{\n\.xxd-force-scope \.a\[data-force~="active"\]/);
  assert.ok(!out.includes(".plain"));
  assert.ok(!out.includes("@keyframes"));
});

test("withAttr 给第一个元素加属性", () => {
  assert.equal(withAttr('<button class="x">a</button><b>c</b>', "disabled"), '<button disabled class="x">a</button><b>c</b>');
  assert.equal(STATES.hover.attrs, 'data-force="hover"');
});

test("extractFunction 抽出某个演示函数的源码", () => {
  const src = "import x from 'y';\nexport function ADemo() {\n  return 1;\n}\n\nexport function BDemo() {\n  return 2;\n}\n";
  assert.equal(extractFunction(src, "ADemo"), "export function ADemo() {\n  return 1;\n}");
  assert.equal(extractFunction(src, "BDemo"), "export function BDemo() {\n  return 2;\n}");
  assert.equal(extractFunction(src, "None"), "");
});
