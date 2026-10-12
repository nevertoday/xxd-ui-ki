# 开源准备清单（阶段 7）

> 现在是**闭源**。这份清单只是准备：真正开源前由你决定要不要开、开哪几个包、用什么许可。
> 自查脚本：`node scripts/open-source-audit.mjs`（只读，列出所有不该公开的内部引用）。

## 1. 先决定

- [ ] **开哪些**：建议只开 `@xxd/tokens`、`@xxd/icons`、`@xxd/css`（纯前端、没有业务）；`@xxd/extension` 的模板和 CLI 看情况；
      会员站相关的 `docs/member-site.md`、试点记录不公开。
- [ ] **许可**：Kumo 部分必须保留 MIT（`LICENSE-KUMO`）。你自己的部分可选 MIT（最省事、和 Kumo 一致）或 GPL-3.0（和你其他开源项目一致，如 xiaoxiaodong 主页）。
- [x] **和 Kumo 上游的关系**：已决定继续同步、内部包名不改（2026-10-12，依据和脱钩条件见 `docs/UPSTREAM.md`）。
- [ ] **发不发 npm**：开源不等于要发 npm。插件靠 `pnpm xxd sync` 拷文件，不需要 npm；React 项目才需要。

## 2. 清理（跑自查脚本逐项清零或确认）

| 检查 | 现在（2026-10-12） | 开源前 |
| --- | --- | --- |
| 本机路径 `/Volumes/…` `/Users/…` | 0 处（`skills/xxd-ui/SKILL.md` 里有，属内部 Skill，开源时不带或改成相对路径） | 0 |
| 个人邮箱 / 微信号 | 0 处 | 0 |
| 会员站域名 | 版权行与计划里有 | 版权行可以保留；计划文档不公开 |
| Chrome 商店 ID | 0 处 | 0 |
| 闭源声明（`UNLICENSED`、All rights reserved、闭源） | 根 LICENSE、README、AGENTS、各 package、构建横幅、`vendor/xxd/LICENSE` 生成逻辑 | 换成选定的许可，构建横幅一起改 |
| `"private": true` | 所有 package | 要发 npm 的包改 false，并加 `publishConfig` |
| 上游 Cloudflare 品牌 | Cloudflare Logo 组件、文档站链接、`wrangler.jsonc` 账号、视觉回归脚本 | 删掉 Logo 组件或保留但不导出；`wrangler.jsonc` 换成自己的或删 |

## 3. 补齐

- [x] 许可核对（2026-10-12）：根 `LICENSE` + `LICENSE-KUMO`；`packages/kumo/LICENSE`、`packages/kumo-docs-astro/LICENSE` 带 MIT 原文；kumo-figma / screenshot-worker 是未改动的上游代码，保持 MIT。

- [x] `CONTRIBUTING.md`：已写（中文；先读原则、各层改哪里、提交前的检查、改别的项目用 worktree）。开源时把开头的「闭源」段落改掉即可。
- [ ] `README.md`：面向外部读者重写（截图、安装、三层架构、`pnpm xxd new` 一分钟上手）。
- [x] CI：`.github/workflows/xxd.yml`（构建 + 小小东测试 + Kumo 测试 + lint）；上游的工作流已删除。有远端仓库后才会运行。
- [x] 安全：2026-10-12 扫过本项目新增的全部提交（543dc8a..HEAD），没有密钥 / 令牌 / 密码。开源前对完整历史再扫一次（上游历史由 Cloudflare 公开维护）。
- [ ] 历史：仓库带着 Kumo 的完整 git 历史，开源时可以保留（MIT 允许），或者从一个干净的提交开始新仓库。

## 4. 不需要在开源前做的

- 会员站、各插件**不需要**跟着开源：它们通过 `vendor/xxd/` 拷文件使用，许可只看拷进去的那几个文件。
