# xxd-ui-ki · 小小东 UI Kit

小小东提示词会员站和 Chrome 插件共用的设计系统。基于 [cloudflare/kumo](https://github.com/cloudflare/kumo) 二次开发。**闭源。**

- 默认直角，可切圆角；亮 / 暖黑暗色；墨色强调，可选 18 种主色
- 三层：令牌（纯 CSS）→ 原生组件（插件、会员站）/ React 组件（Kumo 换皮）→ Chrome 插件套件

## 包

| 包 | 是什么 |
| --- | --- |
| `@xxd/tokens` | 设计令牌唯一来源 + 首帧外观脚本（主题 / 圆角 / 主色 / 密度） |
| `@xxd/icons` | 201 个图标：24 网格、1.5 线宽、斜接角、方角 |
| `@xxd/css` | 原生组件（插件、会员站）：43 个组件 + 行为 JS |
| `@xxd/react` | React 组件（Kumo 换皮版） |
| `@xxd/extension` | Chrome 插件套件：模板、设置同步、Shadow DOM、三语、`pnpm xxd` 命令 |

## 常用命令

```bash
pnpm xxd:build && pnpm xxd:test          # 构建 + 测试小小东的包
pnpm xxd new <目录> --name 四字名字       # 新建插件
pnpm xxd sync <插件目录>                  # 把组件拷进插件的 vendor/xxd/
pnpm xxd ls / pnpm xxd doc Dialog         # 查组件
```

预览：`packages/xxd-css/playground.html`、`packages/xxd-tokens/preview.html`（用任意静态服务器打开仓库根目录）。

## 文档

- [开发计划](docs/PLAN.md) —— 第一轮（已完成）
- [优化计划](docs/OPTIMIZATION-PLAN.md) —— 第二轮：对照 Kumo 补组件、补交互细节、建展示站
- [设计原则](docs/DESIGN-PRINCIPLES.md) —— 一切设计决定的依据
- [插件套件](docs/EXTENSION-KIT.md) · [会员站接入](docs/member-site.md) · [文档站](docs/DOCS-SITE.md)
- [Kumo → 小小东 令牌映射](docs/token-map.md) · [同步上游](docs/UPSTREAM.md) · [开源准备](docs/OPEN-SOURCE-CHECKLIST.md)

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
