import type { APIRoute } from "astro";
import { components, ICON_NAMES } from "../../lib/data.js";
import { principles } from "../../data/principles.js";
import { patterns } from "../../data/patterns.js";
import { templates } from "../../data/templates.js";
import { flatPages } from "../../data/nav.js";

// 每页的 Markdown 版本（给 AI）：内容来自同一份数据，和 HTML 页一致。
const fence = (s, lang = "html") => "```" + lang + "\n" + s.trim() + "\n```";

function componentMd(c) {
  return [
    `# ${c.zh} ${c.name}`,
    "",
    `分类：${c.category}${c.react ? ` · React：${c.react}` : ""}`,
    c.summary ? `\n${c.summary}` : "",
    "",
    "## 示例",
    fence(c.markup),
    ...(c.examples ?? []).flatMap((e) => ["", `### ${e.title}`, e.text ?? "", fence(e.markup)]),
    "",
    "## 属性与类名",
    ...Object.entries(c.attributes ?? {}).map(([k, v]) => `- \`${k}\`：${v}`),
    `- 类名：${c.classes.map((x) => `\`${x}\``).join(" ")}`,
    ...(c.js ? ["", "## JS", fence(c.js, "js")] : []),
    ...(c.a11y ? ["", "## 键盘与读屏", ...c.a11y.map((r) => `- ${r}`)] : []),
    ...(c.rules?.length ? ["", "## 规则", ...c.rules.map((r) => `- ${r}`)] : []),
  ].join("\n");
}

export function getStaticPaths() {
  const pages = [
    { path: "index", body: "# 小小东 UI\n\n小小东提示词与每一个小小东插件共用的设计系统。见 /llms.txt。" },
    { path: "principles", body: ["# 设计原则", "", ...principles.flatMap((p) => [`## ${p.title}（${p.ref}）`, `- 好：${p.doText}`, fence(p.doMarkup), `- 不好：${p.dontText}`, ""])].join("\n") },
    { path: "foundations/icons", body: `# 图标\n\n${ICON_NAMES.length} 个：${ICON_NAMES.join("、")}\n\n用法：\`<i data-xxd-icon="Check"></i>\` 或 \`XxdIcons.iconSVG("Check", { size: 16 })\`。` },
    ...components.map((c) => ({ path: `components/${c.slug}`, body: componentMd(c) })),
    ...patterns.map((p) => ({ path: `patterns/${p.slug}`, body: [`# ${p.zh}`, "", p.summary, "", fence(p.markup), ...(p.rules ?? []).map((r) => `- ${r}`), ...(p.js ? ["", fence(p.js, "js")] : [])].join("\n") })),
    ...templates.map((t) => ({ path: `templates/${t.slug}`, body: [`# ${t.zh}`, "", t.summary, "", fence(t.markup)].join("\n") })),
  ];
  // 其余静态页：给出标题和 HTML 地址，保证每页的「本页的 Markdown」都有东西
  const have = new Set(pages.map((p) => p.path));
  for (const page of flatPages) {
    const path = page.href.replace(/^\//, "").split("#")[0];
    if (path && !have.has(path)) {
      have.add(path);
      pages.push({ path, body: `# ${page.label}\n\n（${page.group}）完整内容见 ${page.href}；组件 API 见 /api/registry.json。` });
    }
  }
  return pages.map((p) => ({ params: { path: p.path }, props: { body: p.body } }));
}

export const GET: APIRoute = ({ props }) => new Response(props.body, { headers: { "content-type": "text/markdown; charset=utf-8" } });
