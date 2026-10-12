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
2. **改为引入令牌、旧名做别名**（`pnpm xxd adopt`，配置在 `xxd.config.json` 的 `adopt`）：
   - 删掉会员站 `:root` / 暗色块里与令牌亮暗两种值都相同的 8 个声明，改由令牌提供：
     `--bg --ink --muted-2 --line --line-strong --wash --z-popover --ui-icon-stroke`。
   - 旧名做别名：`--ui-backdrop: var(--backdrop)`。
   - `--ui-radius*` **保持字面 `0`**：会员站的直角是硬规则，`test/dialog-ui.test.mjs` 按字面检查 `--ui-radius: 0;`（试过别名，那条门禁会失败，所以不改）。
   - 阴影不做别名：会员站暗色里沿用亮色阴影，令牌的暗色阴影更深，做别名会变样。
3. **图标**：`src/lib/site-icons.js` 不再自己画，改为从 `src/lib/xxd-icon-nodes.js`（`@xxd/icons` 的同步副本）取；
   只取会员站一直重画的 184 个名字（`SITE_ICON_NAMES`），以后加名字就能把对应的 Lucide 图标换成统一画法。
   **图标的唯一来源从此是 xxd-ui-ki 的 `packages/xxd-icons/src/nodes.js`。**

## 自动跳过的 4 个令牌（按阶段 5 的「零视觉变化」要求保持原样）

`sync` 发现会员站**用了但没声明**这些变量（靠 `var(--x, 后备值)`，或者干脆没有后备值），我们一声明它们的样子就会变，所以没写进去：

| 变量 | 会员站现在的情况 |
| --- | --- |
| `--danger` | 五种不同的后备红：`#b91c1c` `#b42318` `#b73732` `#c33` `#bd3030`；还有几处 `var(--danger)` 没有后备值（现在是无效值） |
| `--success` | 后备值 `#166534` / `#18794e` |
| `--warning-strong` | 后备值 `#a15c00` |
| `--focus-ring` | 会员站当颜色用（`var(--focus-ring, var(--active-ink))`），小小东令牌里它是 box-shadow 值 —— 含义不同 |

阶段 5 第 1 步要求接入时零视觉变化，所以这 4 个保持会员站现在的行为（不声明）。统一它们是一次**有意的**视觉改动，
不属于接入本身：建议把危险红统一成 `--danger`（`#b42318`），把会员站的 `--focus-ring` 改名 `--focus-color` 后再接令牌。

## 会员站与令牌数值不同的地方（会员站的值继续生效）

| 模式 | 变量 | 会员站 | 小小东令牌 |
| --- | --- | --- | --- |
| 亮 | `--paper` | `#fcfcfc` | `#ffffff` |
| 亮 | `--muted` | `#777777`（白底 4.48:1，略低于小字的 4.5） | `#6b6b6b` |
| 亮 | `--font-body` | 少了 `-apple-system, BlinkMacSystemFont, "Segoe UI"` | 系统字体兜底更全 |
| 亮 | `--font-title` | 少了 `Georgia` | 有 `Georgia` 兜底 |

暗色完全一致。

## 验证

- **变量逐个比较**（`scripts/verify/css-vars-diff.cjs`，无头 Chromium）：会员站 main（31ebee75e）的 `styles.css` 对比这个分支的，
  亮 / 暗两种主题下会员站的 **404 个变量最终值全部相同**，只多出 67 个新令牌；真实的圆角、遮罩、页面底色和字色、`color-scheme` 全部相同。
- **图标**：改动前后各构建一次 `lucide-core.js`，jsdom 渲染全部 220 个图标逐个比较 SVG：**220 / 220 相同**。构建产物大 3KB（整张图标表被打包）。
- **全量测试**：在两个干净的 worktree 里（main 与本分支），补齐同样的环境（根目录依赖 + `playwright-core`，跑过 `build-app` 和 `stamp-assets`），
  用 TAP 逐条比较（`scripts/verify/tap-fail-diff.py`）：两边都是 7965 个测试、7700 通过、260 跳过、**同样的 5 个失败**，
  这 5 个在没改动的 main 上就失败，与这次改动无关：
  - A hands the favorite dot to the heart throughout the animation on shared image surfaces
  - Create stacks Generate over its wallet in the recipe column; Skill forms keep the method beside Send
  - security email is readable on narrow screens and without email-client media rules
  - platform API panel keeps native scrolling and readable controls across viewport sizes and themes
  - Command rating distinguishes intent, preview and confirmation for every score
- `stamp-assets.mjs` 会顺带重新生成一些在 HEAD 上就已过期的文件（`sample-classification.js`、`member.html`），
  与这次改动无关，没有放进这个分支；部署时 `deploy.sh` 会照常 stamp。

## 合并之后

- 改令牌：在 xxd-ui-ki 改 `packages/xxd-tokens/tokens.css` → `pnpm xxd sync …/member-cloudflare` → 跑会员站测试 → 提交。
- 改图标：在 xxd-ui-ki 改 `packages/xxd-icons/src/nodes.js` → 同上。会员站的图标测试（`test/site-icons.test.mjs`）继续当门禁。
- 新组件可以直接用 `@xxd/css` 的类（把 `components.css` 拷进 public 并在 stamp 列表里登记）；旧组件按页面逐个替换。
