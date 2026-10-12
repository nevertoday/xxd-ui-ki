# 文档站

```bash
pnpm install
pnpm --filter @cloudflare/kumo build            # 文档站读组件库构建产物
pnpm --filter @cloudflare/kumo-docs-astro dev   # http://localhost:4321
```

小小东的页面：`/xxd`（原则）、`/xxd/native`（原生组件，从 `packages/xxd-css/registry.json` 生成）、
`/xxd/showcase`（React 换皮总览）、`/xxd/extension`（插件套件）。右上角切换直角 / 圆角和主色，最右边切换主题。

## 部署（只在你决定时做）

文档站是闭源资料，**不要公开部署**。要放到线上时：

1. 把 `packages/kumo-docs-astro/wrangler.jsonc` 里 Cloudflare（上游）的账号、路由换成你自己的；
2. `pnpm --filter @cloudflare/kumo-docs-astro build` 后用 wrangler 部署到你的账号；
3. 在 Cloudflare Zero Trust 里给这个域名加 **Access** 策略，只允许你的邮箱登录。

本仓库没有替你部署过。
