# 参与 xxd-ui-kit

> 这是 MIT 开源项目，欢迎提 issue 和 PR。日常主要由小小东和他的 AI 助手（Claude / Codex）在改。
> Kumo 上游的贡献指南在 `docs/upstream/KUMO-CONTRIBUTING.md`，改 `packages/kumo` 内部时仍然有效。

## 动手之前

1. 读 `docs/DESIGN-PRINCIPLES.md`。任何视觉改动都要能对应到其中一条；对应不上，先讨论，别先写。
2. 读 `docs/PLAN.md`，确认改动属于哪个阶段，做完在「进度」里记一笔。
3. `pnpm install`（Node 24+，pnpm 12）。

## 改哪里

| 想改 | 只改这里 | 然后 |
| --- | --- | --- |
| 颜色、圆角、字号、间距、动效 | `packages/xxd-tokens/tokens.css` | `pnpm --filter @xxd/tokens build`；对比度测试必须过 |
| 图标 | `packages/xxd-icons/src/nodes.js` | 图标规则测试必须过；会员站同步后跑它的 `test/site-icons.test.mjs` |
| 原生组件 | `packages/xxd-css/src/css/*.css`、`src/js/*.js` | 同步改 `registry.json`；看 `playground.html` 四种外观 |
| React 组件的颜色映射 | `packages/kumo/scripts/theme-generator/xxd-overrides.ts` | `pnpm --filter @cloudflare/kumo codegen:themes`，更新 `docs/token-map.md` |
| React 组件内部 | `packages/kumo/src/components/…` | 尽量少改（上游合并）；改了就在提交信息里写清楚为什么 |
| 插件模板 / CLI | `packages/xxd-extension/` | `pnpm xxd new` 生成一个看看 |

不要手改生成的文件：`theme-kumo.css`、`ai/*`、`src/primitives/*`、各包的 `dist/`，以及任何项目里的 `vendor/xxd/`、`xxd:tokens` 标记区域、`xxd-icon-nodes.js`。

## 提交前

```bash
pnpm xxd:build && pnpm xxd:test           # 小小东的包（含所有合同测试）
pnpm --filter @cloudflare/kumo test       # 动了 packages/kumo 时
pnpm lint                                 # 动了 packages/kumo、文档站或 xxd-react 时
```

视觉改动：附四种外观的截图（亮 / 暗 × 直角 / 圆角，至少一种主色），并说明对应原则的哪一条。

## 提交信息

`feat(xxd): …` / `fix(xxd): …` / `docs: …`，中文说清楚做了什么、为什么。一个提交只做一件事。

## 改到别的项目时

插件、会员站各有自己的仓库和未提交的工作：用 `git worktree add -b <新分支>` 在临时目录里改、在新分支上提交；
**不推送、不部署**，由小小东决定合并。先跑那个项目自己的测试做基线，改完再跑一次对比。

## 许可与发布

- 代码以 MIT 许可开源；来自 Kumo 的部分保留 `LICENSE-KUMO`，不要删。
- 不要 push `upstream`（Cloudflare 的仓库）。
- package 暂时保持 `private: true`，防止误发 npm；要发哪个包由小小东决定。
