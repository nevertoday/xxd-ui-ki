# 会员站接入（阶段 5）

会员站 `小小东-提示词/member-cloudflare` 的分支 **`xxd-ui-tokens`**（基于 main 31ebee75e）。**没有推送、没有部署**：
推到 main 会触发 Cloudflare 自动部署，合并和上线由你决定。

## 做了什么

`member-cloudflare/xxd.config.json`：

```json
{
  "vendorDir": false,
  "layeredTokensRegions": ["public/styles.css"],
  "iconNodesTargets": ["src/lib/xxd-icon-nodes.js"]
}
```

在 xxd-ui-ki 里运行 `pnpm xxd sync <会员站>/member-cloudflare`：

1. **令牌**：`public/styles.css` 开头多了一段 `/* xxd:tokens:start */ … /* xxd:tokens:end */`，内容是
   `@layer xxd.tokens { … }` 里的小小东令牌（选择器写成 `:where(:root…)`）。
   - 没进 layer 的样式永远赢过 layer 里的，所以会员站自己已有的变量**一个都不会变**，只多出它还没有的
     （`--r-*` 圆角刻度、`--space-*`、`--motion-*`、`--control-h`、`--text-*`、`--z-*` 等）。
   - 去掉了全局减少动效规则（会员站有自己的处理，要保留语义动画）。
   - 会员站从不设置 `data-corners` / `data-accent`，所以一直是直角、墨色（会员站的直角是硬规则）。
2. **图标**：`src/lib/site-icons.js` 不再自己画，改为从 `src/lib/xxd-icon-nodes.js`（`@xxd/icons` 的同步副本）取；
   只取会员站一直重画的 184 个名字（`SITE_ICON_NAMES`），以后加名字就能把对应的 Lucide 图标换成统一画法。
   **图标的唯一来源从此是 xxd-ui-ki 的 `packages/xxd-icons/src/nodes.js`。**

## 自动跳过的 4 个令牌

`sync` 发现会员站**用了但没声明**这些变量（靠 `var(--x, 后备值)`，或者干脆没有后备值），我们一声明它们的样子就会变，所以没写进去：

| 变量 | 会员站现在的情况 |
| --- | --- |
| `--danger` | 五种不同的后备红：`#b91c1c` `#b42318` `#b73732` `#c33` `#bd3030`；还有几处 `var(--danger)` 没有后备值（现在是无效值） |
| `--success` | 后备值 `#166534` / `#18794e` |
| `--warning-strong` | 后备值 `#a15c00` |
| `--focus-ring` | 会员站当颜色用（`var(--focus-ring, var(--active-ink))`），小小东令牌里它是 box-shadow 值 —— 含义不同 |

统一它们会改变会员站的样子，需要你决定：建议把危险红统一成 `--danger`（`#b42318`），`--focus-ring` 在会员站改名 `--focus-color`。

## 会员站与令牌数值不同的地方（会员站的值继续生效）

| 模式 | 变量 | 会员站 | 小小东令牌 |
| --- | --- | --- | --- |
| 亮 | `--paper` | `#fcfcfc` | `#ffffff` |
| 亮 | `--muted` | `#777777`（白底 4.48:1，略低于小字的 4.5） | `#6f6f6f` |
| 亮 | `--font-body` | 少了 `-apple-system, BlinkMacSystemFont, "Segoe UI"` | 系统字体兜底更全 |
| 亮 | `--font-title` | 少了 `Georgia` | 有 `Georgia` 兜底 |

暗色完全一致。

## 验证

- 图标：改动前后各构建一次 `lucide-core.js`，用 jsdom 渲染全部 220 个图标逐个比较 SVG：**220 / 220 完全相同**。
  构建产物大 3KB（整张图标表被打包，未用的条目摇不掉），gzip 后可忽略。
- 测试：`site-icons`、`icon-renderer`、`asset-hash-consistency`、`dialog-ui`、`right-panel-shell` 82 / 82 通过；全量测试结果见下。
- `stamp-assets.mjs` 会顺带重新生成一些在 HEAD 上就已过期的文件（`sample-classification.js`、`member.html`），
  与这次改动无关，没有放进这个分支；部署时 `deploy.sh` 会照常 stamp。

## 合并之后

- 改令牌：在 xxd-ui-ki 改 `packages/xxd-tokens/tokens.css` → `pnpm xxd sync …/member-cloudflare` → 跑会员站测试 → 提交。
- 改图标：在 xxd-ui-ki 改 `packages/xxd-icons/src/nodes.js` → 同上。会员站的图标测试（`test/site-icons.test.mjs`）继续当门禁。
- 新组件可以直接用 `@xxd/css` 的类（把 `components.css` 拷进 public 并在 stamp 列表里登记）；旧组件按页面逐个替换。
