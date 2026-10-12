import { categories, components } from "../lib/data.js";
import { patterns } from "./patterns.js";
import { templates } from "./templates.js";

// 左侧导航。顺序就是阅读顺序。
export const nav = [
  {
    title: "开始",
    items: [
      { label: "首页", href: "/" },
      { label: "三种用法", href: "/start" },
      { label: "设计原则", href: "/principles" },
    ],
  },
  {
    title: "基础",
    items: [
      { label: "颜色", href: "/foundations/colors" },
      { label: "圆角", href: "/foundations/radius" },
      { label: "字体与层级", href: "/foundations/type" },
      { label: "间距与尺寸", href: "/foundations/spacing" },
      { label: "动效", href: "/foundations/motion" },
      { label: "图标", href: "/foundations/icons" },
    ],
  },
  ...categories.map((cat) => ({
    title: `组件 · ${cat}`,
    items: components.filter((c) => c.category === cat).map((c) => ({ label: c.zh, sub: c.name, href: `/components/${c.slug}` })),
  })),
  { title: "模式", items: patterns.map((p) => ({ label: p.zh, href: `/patterns/${p.slug}` })) },
  { title: "模板", items: templates.map((t) => ({ label: t.zh, href: `/templates/${t.slug}` })) },
  {
    title: "工具",
    items: [
      { label: "命令行与同步", href: "/tools" },
      { label: "截图回归", href: "/tools#visual" },
      { label: "给 AI 看", href: "/tools#ai" },
      { label: "更新日志", href: "/changelog" },
    ],
  },
];

export const flatPages = nav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));
