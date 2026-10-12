# xxd-ui-ki · 小小东 UI Kit

小小东提示词会员站和 Chrome 插件共用的设计系统。基于 [cloudflare/kumo](https://github.com/cloudflare/kumo) 二次开发。**闭源。**

- 默认直角，可切圆角；亮 / 暖黑暗色；墨色强调，可选 18 种主色
- 三层：令牌（纯 CSS）→ 原生组件（插件、会员站）/ React 组件（Kumo 换皮）→ Chrome 插件套件

## 文档

- [开发计划](docs/PLAN.md) —— 现在做到哪、下一步做什么
- [设计原则](docs/DESIGN-PRINCIPLES.md) —— 一切设计决定的依据
- [同步上游](docs/UPSTREAM.md)

## 开发

```bash
pnpm install
pnpm --filter @cloudflare/kumo build   # 构建 React 组件库
pnpm --filter @cloudflare/kumo test    # 单元测试
pnpm dev                               # 文档站 localhost:4321
```

需要 Node 24+（本机 26.11 已验证）和 pnpm 12。

## 许可

见 [LICENSE](LICENSE)。来自 Kumo 的代码保留其 MIT 许可，原文在 [LICENSE-KUMO](LICENSE-KUMO)。
