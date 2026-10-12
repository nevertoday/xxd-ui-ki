# xxd-ui-ki 工作说明（给 Claude / Codex）

小小东的闭源设计系统，fork 自 cloudflare/kumo。

## 开工前必读

1. `docs/PLAN.md` —— 当前阶段、任务清单、验收标准。只做当前阶段的事；做完在「进度」里打勾写日期。
2. `docs/DESIGN-PRINCIPLES.md` —— 审美宪法。任何视觉决定都要能对应到其中一条；对应不上就先问。
3. 改 Kumo 组件前读 `docs/upstream/KUMO-AGENTS.md` 和 `packages/kumo/AGENTS.md`（上游的工程约定仍然有效）。

## 硬规则

- **闭源**：不要发布到 npm，不要把代码推到任何公开仓库，不要 push 到 `upstream`。所有 package 保持 `private: true`。
- **令牌唯一来源**是 `packages/xxd-tokens/tokens.css`。组件里不写死颜色、圆角、阴影、字重。
- 矩形圆角只用 `--r-xs / sm / md / lg / pill`；语义圆用 `--r-circle`。默认直角。
- 卡片、行、按钮不加阴影；动效只动 opacity / transform；字重只有 400 / 500 / 600。
- 图标：24 网格、1.5 线宽、round cap、miter join、方角。
- 不手改生成文件（`theme-kumo.css`、`ai/*`、`src/primitives/*`），改源配置再 codegen。
- 修改后跑 `pnpm --filter @cloudflare/kumo test`；基线是 64 文件 / 1450 测试全绿。
