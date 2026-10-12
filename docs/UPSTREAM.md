# 同步 Kumo 上游

- 上游：`https://github.com/cloudflare/kumo`，远端名 `upstream`，**push 已禁用**（`git remote set-url --push upstream DISABLED`）。
- 分叉基点：`543dc8a0ca1b6f7678eb9c27be6750965eaf2564`（2026-10-08，@cloudflare/kumo 2.14.0）。

## 怎么同步

```bash
git fetch upstream
git log --oneline main..upstream/main -- packages/kumo   # 看组件库有什么新东西
git merge upstream/main                                   # 在单独分支上做，测试过了再并回 main
pnpm install && pnpm --filter @cloudflare/kumo build && pnpm test
```

## 冲突时的原则

- `.github/`、根 `README.md`、根 `AGENTS.md`、`LICENSE`：保留我们的（上游的说明在 `docs/upstream/`，需要时手动更新那里）。
- `scripts/theme-generator/config.ts`：保留我们的映射，把上游新增的 token 补进映射表 `docs/token-map.md`。
- 生成文件（`theme-kumo.css`、`ai/*`）：不手动合并，合并后重新 codegen。
- 组件内部：逐个看。上游修了 bug 就收，我们的换皮改动保留。

## 什么时候脱钩

换皮后如果每次合并都要花半天以上解决冲突，而上游的新东西我们用不上，就停止同步，在 `docs/PLAN.md` 记录日期和原因，
之后可以把内部包名 `@cloudflare/kumo` 改成 `@xxd/react` 并删掉 `upstream` 远端。
