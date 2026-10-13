# 参与 xxd-ui-kit

**中文** · [English](CONTRIBUTING.en.md)

这是 MIT 开源项目，欢迎提 issue 和 PR。这是作者个人品牌的设计系统，**审美上的决定由作者来做**，所以先读下面「欢迎什么」再动手，免得白做。
改 `packages/kumo` 内部时，上游的贡献指南 `docs/upstream/KUMO-CONTRIBUTING.md` 仍然有效。

## 欢迎什么

| 很欢迎，直接提 PR | 先开 issue 讨论 | 一般不接受 |
| --- | --- | --- |
| bug 修复、无障碍（键盘、读屏、对比度）、浏览器兼容、繁体和英文翻译、文档、测试、命令行的改进 | 新组件、新模式、改变现有组件的样子或交互、新令牌 | 违反[设计原则](docs/DESIGN-PRINCIPLES.md)的视觉改动（阴影上卡片、700 字重、网络字体……）、只为个人口味的调整 |

视觉改动要能对应到设计原则里的一条；对应不上，先在 issue 里讨论。

## 动手之前

1. 读 `docs/DESIGN-PRINCIPLES.md`。
2. 准备环境：Node 24.12 以上、pnpm 12；`pnpm install && pnpm xxd:build`。
3. 本机看效果：`pnpm dev`（展示站 http://localhost:4400）。

## 改哪里

| 想改 | 只改这里 | 然后 |
| --- | --- | --- |
| 颜色、圆角、字号、间距、动效 | `packages/xxd-tokens/tokens.css` | `pnpm --filter @xxd/tokens build`；对比度测试必须过 |
| 图标 | `packages/xxd-icons/src/nodes.js`，分类和中文关键词在 `src/meta.js` | 图标规则测试必须过 |
| 原生组件 | `packages/xxd-css/src/css/*.css`、`src/js/*.js` | 同步改 `registry.json` 和旁边的英文版 `registry.en.js`；看四种外观 |
| React 组件的颜色映射 | `packages/kumo/scripts/theme-generator/xxd-overrides.ts` | `pnpm --filter @cloudflare/kumo codegen:themes`，更新 `docs/token-map.md` |
| React 组件内部 | `packages/kumo/src/components/…` | 尽量少改（要合并上游）；改了在提交信息里写清楚为什么 |
| 插件模板 / 命令行 | `packages/xxd-extension/`，命令清单在 `scripts/commands.mjs` | `pnpm xxd new` 生成一个看看 |
| 展示站页面 | `packages/xxd-site/src/views/`（正文），`src/pages/` 和 `src/pages/en/` 各放一个入口 | 中英两版都要有（测试会查） |

不要手改生成的文件：`theme-kumo.css`、`ai/*`、`src/primitives/*`、`packages/xxd-react/src/kumo-exports.ts`、各包的 `dist/`，以及任何项目里的 `vendor/xxd/`、`xxd:tokens` 标记区域、`xxd-icon-nodes.js`。

## 提交前

```bash
pnpm xxd:build && pnpm xxd:test           # 小小东的包（含所有合同测试）；改了 packages/kumo 先 pnpm --filter @cloudflare/kumo build
pnpm --filter @cloudflare/kumo test       # 动了 packages/kumo 时
pnpm lint
pnpm changeset                            # 改了用户看得到的东西时，写一条版本记录（见 .changeset/README.md）
```

展示站的两道检查（`visual` 截图对比、`audit` 压力测试）要无头 Chrome。没有条件跑的话，在 PR 里说一声，维护者来跑；`audit` 也会在 CI 里跑。

视觉改动：附四种外观的截图（亮 / 暗 × 直角 / 圆角，至少一种主色），说明对应原则的哪一条。

## 提交信息

`feat(xxd): …` / `fix(xxd): …` / `docs: …`，说清楚做了什么、为什么。一个提交只做一件事。中文英文都可以。

## 许可

提交的代码以 MIT 许可开源。来自 Kumo 的部分保留 `LICENSE-KUMO`，不要删。

## 行为准则与安全

参与时请遵守 [行为准则](CODE_OF_CONDUCT.md)。发现安全问题请按 [SECURITY.md](SECURITY.md) 私下报告，不要开公开 issue。
