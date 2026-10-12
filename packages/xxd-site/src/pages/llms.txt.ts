import type { APIRoute } from "astro";
import { flatPages } from "../data/nav.js";
import { components } from "../lib/data.js";

// 全站目录（给 AI）：每页一行，带 .md 版本的地址。
export const GET: APIRoute = () => {
  const lines = [
    "# 小小东 UI Kit",
    "",
    "> 小小东提示词与 Chrome 插件共用的设计系统。黑白灰、默认直角、强调靠墨色；原生 HTML（@xxd/css）与 React（@xxd/react）两种实现。",
    "",
    "## 页面",
    ...flatPages.filter((p) => !p.href.includes("#")).map((p) => `- [${p.label}](${p.href === "/" ? "/md/index.md" : `/md${p.href}.md`})${p.sub ? ` — ${p.sub}` : ""}`),
    "",
    "## 组件（原生类名）",
    ...components.map((c) => `- ${c.name}（${c.zh}）：${c.classes.slice(0, 4).join(" ")}`),
    "",
    "注册表：/api/registry.json",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
};
