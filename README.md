# xxd-ui-kit · 小小东 UI Kit

**中文** · [English](README.en.md)

小小东自己的界面组件库。会员站和所有 Chrome 插件都用它，所以看起来是同一家的东西。

它基于 Cloudflare 的开源组件库 [Kumo](https://github.com/cloudflare/kumo) 改造：Kumo 负责键盘操作、焦点、读屏这些不容易做对的地方，我们换上小小东的样子。以 [MIT 许可](LICENSE) 开源。

**在线看全部组件：<https://ui.xiaoxiaodong.ai>**（英文版：<https://ui.xiaoxiaodong.ai/en/>）

**默认长这样：**

- 默认直角，可以切成圆角
- 亮色和暖黑暗色两种主题
- 默认用墨色强调，也可以换成 18 种主色之一
- 中文简体、繁体、英文三种语言
- 只用系统自带的无衬线字体，不加载网络字体

## 它由哪几部分组成

从下往上一共三层，上层用下层：

```
令牌     颜色、字号、间距、圆角这些变量          @xxd/tokens   @xxd/icons
  ↓
组件     不用框架的原生组件（插件、会员站）      @xxd/css
         React 组件（Kumo 换皮）                 @xxd/react
  ↓
插件套件 新建插件、同步组件、设置同步            @xxd/extension
```

| 包               | 一句话                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `@xxd/tokens`    | 所有颜色、字号、间距、圆角的唯一来源。另带一段首帧脚本，让页面打开第一眼就是用户选的主题，不闪         |
| `@xxd/icons`     | 201 个图标，统一画法（24 网格、1.5 线宽）                                                              |
| `@xxd/css`       | 59 个原生组件和 13 个小小东专属模式（拖放、图片查看器、两次确认……），一个 CSS 文件加一个 JS 文件就能用 |
| `@xxd/react`     | Kumo 的 React 组件换上小小东的样子，再加上小小东专属组件和外观、语言两个 Provider                      |
| `@xxd/extension` | Chrome 插件工具箱：一条命令新建插件，外观设置在各页面间同步，往网页里放界面时不和网页互相干扰          |
| `@xxd/site`      | 展示站：每个组件、模式、整页模板和设计原则都能在这里看到、试用                                         |

## 怎么用

先看你的项目属于哪一种。

### 1. 新做一个 Chrome 插件

```bash
pnpm xxd new ~/js/插件-今日待办 --name 今日待办 --name-en "Today" --slug today
```

会得到一个能直接「加载已解压的扩展程序」的插件：侧边栏、设置页、会员页、三语都有了。组件文件拷在插件自己的 `vendor/xxd/` 里，因为 Chrome 插件不允许加载远程代码。

以后组件更新了：

```bash
pnpm xxd sync ~/js/插件-今日待办     # 拷入最新版
pnpm xxd status ~/js/插件-*          # 看哪些插件还是旧版
```

页面里这样接：

```html
<!-- boot.js 放最前面：页面第一帧就是用户选的主题 -->
<script src="vendor/xxd/boot.js" data-key="today-ui"></script>
<link rel="stylesheet" href="vendor/xxd/xxd.css" />
<script src="vendor/xxd/icons.js"></script>
<script src="vendor/xxd/xxd.js"></script>
<script src="vendor/xxd/extension.js"></script>
<body class="xxd-page">
  …
</body>
```

更多细节，比如外观设置怎么存、怎么往网页里放界面，看 [插件套件](docs/EXTENSION-KIT.md)。

### 2. 已经有一套样式的老项目（比如会员站）

不改现在的样子，只把新变量和图标接进来。原有变量永远优先，令牌只补上还没有的那些：

```bash
pnpm xxd sync  <项目目录>    # 按项目里的 xxd.config.json 写入令牌和图标
pnpm xxd adopt <项目目录>    # 可选：把和令牌完全相同的旧变量删掉，改由令牌提供
```

配置怎么写、怎么证明「零视觉变化」，看 [会员站接入](docs/member-site.md)。

### 3. React 项目

```tsx
import {
  Button,
  Dialog,
  DialogActions,
  XxdAppearanceProvider,
} from "@xxd/react";
import "@xxd/react/standalone.css"; // 不用 Tailwind 时
// 用 Tailwind v4 时改成：@import "tailwindcss"; @import "@xxd/react/styles.css";
```

## 查组件

不想翻文档时，可以在命令行里查：

```bash
pnpm xxd ls             # 列出全部组件
pnpm xxd doc Dialog     # 某个组件的写法、属性和规则
pnpm xxd doc Dialog --react
```

想直接看效果，就打开展示站 <https://ui.xiaoxiaodong.ai>。改代码时在本机跑：

```bash
pnpm --filter @xxd/site dev     # 打开 http://localhost:4400
```

展示站有中文和英文两套（英文在 `/en/` 下，右上角切换）。每页都有对应的 `.md` 版本，另有 `llms.txt` 和组件清单接口，方便 AI 助手读取。

## 开发

需要 Node 24 以上（本机 26.11 验证过）和 pnpm 12。

```bash
pnpm install
pnpm xxd:build              # 构建小小东的全部包
pnpm xxd:test               # 跑小小东的全部测试
pnpm --filter @cloudflare/kumo test   # 改过 packages/kumo 时也要跑
pnpm lint
```

### 上线前的两道检查

```bash
pnpm --filter @xxd/site build
pnpm --filter @xxd/site visual   # 截图对比：每页 × 4 种外观，和上次比有没有走样
pnpm --filter @xxd/site audit    # 压力测试：无障碍零问题、超长文字不撑破、恶意网页干扰不到、高对比模式看得清、英文页没有漏翻
```

这两道检查都要用无头 Chrome，需要设置 `CHROME_EXE`。截图基线只存在本机。

### 更新线上展示站

```bash
pnpm --filter @xxd/site run release   # 构建，再部署到 Cloudflare（ui.xiaoxiaodong.ai）
```

需要先用 `wrangler login` 登录 Cloudflare。推送到 GitHub 不会自动更新网站，要手动跑这一条。

### 改东西去哪改

- **样子不对**：改令牌 `packages/xxd-tokens/tokens.css`，组件里不写死颜色。
- **组件不对**：改 `packages/xxd-css/src/`，然后同步更新 `registry.json` 里的说明，英文版在旁边的 `registry.en.js`（漏了测试会报错）。
- **React 组件里来自 Kumo 的部分**：改 `packages/kumo` 里的源配置，再跑 codegen 生成。`theme-kumo.css` 这类生成文件不要手改。

完整对照表在 [参与指南](CONTRIBUTING.md)。

### 几条硬规矩

- 卡片、行、按钮不加阴影。
- 字重只用 400、500、600。
- 动画只改透明度和位置。
- 每个视觉决定都要能在 [设计原则](docs/DESIGN-PRINCIPLES.md) 里找到依据。

## 文档

| 想知道                    | 看这里                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| 为什么长这样              | [设计原则](docs/DESIGN-PRINCIPLES.md)                                                                 |
| 做到哪了                  | [开发计划](docs/PLAN.md)（第一轮）、[优化计划](docs/OPTIMIZATION-PLAN.md)（第二轮和对抗测试后的加固） |
| 插件怎么接                | [插件套件](docs/EXTENSION-KIT.md)                                                                     |
| 会员站怎么接              | [会员站接入](docs/member-site.md)                                                                     |
| 展示站怎么搭的            | [文档站](docs/DOCS-SITE.md)                                                                           |
| Kumo 的变量对应我们的哪个 | [令牌映射](docs/token-map.md)                                                                         |
| 怎么合并 Kumo 的新版本    | [同步上游](docs/UPSTREAM.md)                                                                          |
| 开源还剩哪些收尾          | [开源清单](docs/OPEN-SOURCE-CHECKLIST.md)                                                             |
| 给 AI 助手的工作说明      | [AGENTS.md](AGENTS.md)                                                                                |

> 仓库里还保留着 Kumo 原来的文档站：根目录跑 `pnpm dev`，会打开 localhost:4321。那是 Kumo 原版的站点，合并上游时用得到；平时看小小东的效果，请用上面 4400 端口的展示站。

## 许可

MIT。小小东的部分见 [LICENSE](LICENSE)；来自 Kumo 的代码同样是 MIT，原文在 [LICENSE-KUMO](LICENSE-KUMO)。
