# xxd-ui-kit 工作说明（给 Claude / Codex）

小小东的开源设计系统（MIT），fork 自 cloudflare/kumo。

## 开工前必读

1. `docs/PLAN.md` —— 当前阶段、任务清单、验收标准。只做当前阶段的事；做完在「进度」里打勾写日期。
2. `docs/DESIGN-PRINCIPLES.md` —— 审美宪法。任何视觉决定都要能对应到其中一条；对应不上就先问。
3. 改 Kumo 组件前读 `docs/upstream/KUMO-AGENTS.md` 和 `packages/kumo/AGENTS.md`（上游的工程约定仍然有效）。

## 硬规则

- **许可与发布**：MIT 开源。来自 Kumo 的代码保留 `LICENSE-KUMO`。不要 push 到 `upstream`（那是 Cloudflare 的仓库）；推送、发布 npm、部署都等小小东说了再做。package 暂时保持 `private: true`，防止误发 npm。
- **令牌唯一来源**是 `packages/xxd-tokens/tokens.css`。组件里不写死颜色、圆角、阴影、字重。
- 矩形圆角只用 `--r-xs / sm / md / lg / pill`；语义圆用 `--r-circle`。默认直角。
- 卡片、行、按钮不加阴影；动效只动 opacity / transform；字重只有 400 / 500 / 600。
- 图标：24 网格、1.5 线宽、round cap、miter join、方角。
- 不手改生成文件（`theme-kumo.css`、`ai/*`、`src/primitives/*`），改源配置再 codegen。
- 展示站有中英两版：改 `packages/xxd-css/registry.json` / `patterns.json` 时同步改旁边的 `registry.en.js` / `patterns.en.js`；加展示站页面时 `src/pages/en/` 也加一个（正文写在 `src/views/`）。测试会检查。
- 字体只用系统无衬线（不用宋体 / 衬线），不加载网络字体。
- 修改后跑 `pnpm --filter @cloudflare/kumo test`；基线是 64 文件 / 1450 测试全绿。
