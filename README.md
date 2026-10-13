# xxd-ui-kit · 小小东 UI Kit

**中文** · [English](README.en.md)

[![CI](https://github.com/nevertoday/xxd-ui-kit/actions/workflows/xxd.yml/badge.svg)](https://github.com/nevertoday/xxd-ui-kit/actions/workflows/xxd.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![status: alpha](https://img.shields.io/badge/status-alpha-lightgrey.svg)

一套中文优先、不依赖框架的界面组件：**一个 CSS 加一个 JS 就能用**，专门照顾 Chrome 插件（MV3）。
React 项目也能用（基于 Cloudflare 的 [Kumo](https://github.com/cloudflare/kumo) 换皮）。

这是小小东个人品牌的设计系统：会员站和小小东的 Chrome 插件都用它，审美上的决定由作者来做。代码以 [MIT 许可](LICENSE) 开源，欢迎拿去用。

**在线看全部组件：<https://ui.xiaoxiaodong.ai>**（英文版：<https://ui.xiaoxiaodong.ai/en/>）

![同一个插件侧边栏的四种外观：亮 / 暗 × 直角 / 圆角，后两个换了主色](docs/assets/overview.png)

> **状态：alpha（0.x）。** 还没有发布到 npm，目前从源码用（下面写了怎么做）。0.x 期间小版本之间也可能有不兼容的改动，看 [更新记录](CHANGELOG.md)。

## 适合 / 不适合

**适合**

- Chrome 插件（MV3）：组件文件拷进插件自己的目录（插件不许加载远程代码）；往别人网页里放界面时用 Shadow DOM 隔开；首帧不闪；简体、繁体、英文三语。
- 中小网站、工具页：不想引入 React 和 Tailwind，一行 `<link>` 一行 `<script>` 就能用。
- 想要一种安静、克制的样子：默认直角、墨色强调、发丝线、系统字体，不加载网络字体。
- 想有人替你守规矩：`xxd-ui doctor` 会查写死的颜色、阴影、字重、圆角，图标名和类名拼错，以及插件的 manifest 和多语言。

**不适合**

- 大型后台、复杂表单和数据表格：[Ant Design](https://ant.design) 在这方面成熟得多。
- 想把组件源码拷进项目、自己改样式：[shadcn/ui](https://ui.shadcn.com) 的做法更合适。
- 需要很强的品牌定制：这里的审美是固定的（可以换主色、圆角、密度，但不会变成另一种风格）。

|  | xxd-ui-kit | shadcn/ui | Ant Design |
| --- | --- | --- | --- |
| 要不要框架 | 不要（原生），也有 React 版 | React + Tailwind | React |
| 怎么用 | 一个 CSS + 一个 JS，或 React 组件 | 把源码拷进项目 | npm 包 |
| Chrome 插件 | 专门做了（vendor、Shadow DOM、三语、doctor） | 没有专门支持 | 没有专门支持 |
| 中文 | 中文优先，三语 | 英文 | 中文、英文 |
| 体量 | 59 个组件 + 13 个模式 | 组件多，社区大 | 组件最全 |

## 快速开始

### 0. 准备

需要 Node 24.12 以上和 pnpm 12（没有 pnpm 时，按 `package.json` 里的版本自动下载）。

```bash
git clone https://github.com/nevertoday/xxd-ui-kit.git
cd xxd-ui-kit
pnpm install
pnpm xxd:build      # 构建令牌、图标、组件、插件套件
pnpm xxd link       # 可选：装成全局命令 xxd-ui，之后在任何目录都能用
```

下面的命令都写成 `xxd-ui …`；没有 `link` 的话，在仓库里把它换成 `pnpm xxd …`。

### 普通网页

**先试一下**：展示站上有带版本号的构建文件，直接引用：

```html
<script src="https://ui.xiaoxiaodong.ai/v/0.1.0/boot.js" data-key="my-site-ui"></script>
<link rel="stylesheet" href="https://ui.xiaoxiaodong.ai/v/0.1.0/xxd.css" />
<script src="https://ui.xiaoxiaodong.ai/v/0.1.0/icons.js"></script>
<script src="https://ui.xiaoxiaodong.ai/v/0.1.0/xxd.js"></script>

<body class="xxd-page">
  <button class="xxd-btn" data-variant="primary">保存</button>
</body>
```

**正式用**：把文件拷进自己的项目，以后一条命令更新：

```bash
xxd-ui init ./my-site     # 写 xxd.config.json、拷组件，打印要放进 <head> 的几行
xxd-ui sync ./my-site     # 以后组件更新了，拷入最新版
```

**有打包工具（Vite 等）**：用 `xxd-ui pack` 打出 `@xxd/css` 装进项目（见下面 React 一节），然后：

```js
import "@xxd/css/dist/xxd.css";
import { install, toast, confirmDialog } from "@xxd/css";
install();
```

网站已经有一套 CSS 变量、不想改动现在的样子：看 [已有网站怎么接入](docs/existing-site.md)。

### Chrome 插件

```bash
xxd-ui new ./today --name 今日待办 --name-en "Today" --slug today
```

得到一个能直接「加载已解压的扩展程序」的插件：侧边栏、设置页、三语都有了。需要时再加：

| 选项 | 加什么 |
| --- | --- |
| `--popup` | 点工具栏图标弹出的小窗 |
| `--content "https://example.com/*"` | 往网页里放界面的内容脚本（Shadow DOM 隔开） |
| `--account` | 登录和会员页（价格是占位） |

以后组件更新了：

```bash
xxd-ui status          # 看哪些项目是旧版（new / init / sync 过的都会记住）
xxd-ui sync --all      # 全部更新
xxd-ui doctor ./today  # 体检：引用、manifest、多语言、MV3 规则、写死的样式
```

页面里怎么接、外观设置怎么存、怎么往网页里放界面：看 [插件套件](docs/EXTENSION-KIT.md)。

### React

```tsx
import { Button, Dialog, DialogActions, XxdAppearanceProvider } from "@xxd/react";
import "@xxd/react/standalone.css"; // 不用 Tailwind 时
```

用 Tailwind v4 时，在你的 CSS 最前面写：

```css
@layer properties, theme, base, xxd, components, utilities;
@import "tailwindcss";
@import "@xxd/react/styles.css";
```

npm 还没发布。在仓库外的项目里用：

```bash
# 在 xxd-ui-kit 里打包（输出 tokens、icons、css、react 四个 .tgz）
xxd-ui pack ./packs
# 在你的项目里
npm install ./packs/*.tgz
```

完整例子（带 Provider 的 `App.tsx`）见展示站的 [开始使用](https://ui.xiaoxiaodong.ai/start)。

## 查组件

```bash
xxd-ui ls               # 列出全部组件
xxd-ui doc 对话框       # 一个组件的写法、属性和规则（中文名、拼错都行）
xxd-ui doc Dialog --react
xxd-ui icon 删除        # 找图标（500 个，中文关键词）；加 --svg / --react / --copy
xxd-ui tokens line      # 令牌和亮 / 暗色值
xxd-ui help             # 全部命令
```

也可以看展示站的 [命令行与工具](https://ui.xiaoxiaodong.ai/tools)。展示站每页都有 `.md` 版本，另有 `llms.txt` 和组件清单接口，方便 AI 助手读取。

## 它由哪几部分组成

从下往上三层，上层用下层：

```
令牌     颜色、字号、间距、圆角这些变量          @xxd/tokens   @xxd/icons
  ↓
组件     不用框架的原生组件                      @xxd/css
         React 组件（Kumo 换皮）                 @xxd/react
  ↓
插件套件 新建插件、同步组件、设置同步、命令行    @xxd/extension
```

| 包               | 一句话                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `@xxd/tokens`    | 所有颜色、字号、间距、圆角的唯一来源；另带首帧脚本，页面打开第一眼就是用户选的主题         |
| `@xxd/icons`     | 500 个图标，统一画法（24 网格、1.5 线宽、方角），可以按中文关键词搜                        |
| `@xxd/css`       | 59 个原生组件和 13 个模式（拖放、图片查看器、两次确认……），自己实现键盘和读屏，audit 守着 |
| `@xxd/react`     | Kumo 的 React 组件换上小小东的样子（键盘、焦点、读屏由 Kumo 底层的 Base UI 负责），再加小小东独有组件和外观、语言两个 Provider |
| `@xxd/extension` | Chrome 插件工具箱和命令行 `xxd-ui`                                                          |
| `@xxd/site`      | 展示站：每个组件、模式、整页模板和设计原则，中英两版                                       |

## 开发

```bash
pnpm xxd:build              # 构建小小东的全部包
pnpm xxd:test               # 跑小小东的全部测试
pnpm --filter @cloudflare/kumo test   # 改过 packages/kumo 时也要跑
pnpm lint
pnpm dev                    # 展示站 http://localhost:4400
```

上线前的两道检查（都要无头 Chrome，设置 `CHROME_EXE`）：

```bash
pnpm --filter @xxd/site build
pnpm --filter @xxd/site visual   # 截图对比：每页 × 4 种外观
pnpm --filter @xxd/site audit    # 无障碍、长文字、恶意宿主页、高对比、英文漏翻、细节、浮层、冒烟
```

几条硬规矩：卡片、行、按钮不加阴影；字重只用 400 / 500 / 600；动画只改透明度和位置；每个视觉决定都要能在 [设计原则](docs/DESIGN-PRINCIPLES.md) 里找到依据。
怎么参与见 [参与指南](CONTRIBUTING.md)。

## 文档

**用的人**

| 想知道             | 看这里                                      |
| ------------------ | ------------------------------------------- |
| 为什么长这样       | [设计原则](docs/DESIGN-PRINCIPLES.md)       |
| 插件怎么接         | [插件套件](docs/EXTENSION-KIT.md)           |
| 已有网站怎么接     | [已有网站怎么接入](docs/existing-site.md)   |
| 每次改了什么       | [更新记录](CHANGELOG.md)                    |
| 发现安全问题       | [安全](SECURITY.md)                         |

**维护的人**

| 想知道                    | 看这里                                                    |
| ------------------------- | --------------------------------------------------------- |
| 路线和进度                | [维护者文档](docs/maintainers/)（计划、评审、开源清单）   |
| 展示站怎么搭、怎么部署    | [文档站](docs/DOCS-SITE.md)                               |
| Kumo 的变量对应我们的哪个 | [令牌映射](docs/token-map.md)                             |
| 怎么合并 Kumo 的新版本    | [同步上游](docs/UPSTREAM.md)                              |
| 给 AI 助手的工程约定      | [AGENTS.md](AGENTS.md)                                    |

## 和 Kumo、Cloudflare 的关系

React 组件来自 Cloudflare 的开源组件库 [Kumo](https://github.com/cloudflare/kumo)（MIT），换上了小小东的样子；原生组件、令牌、图标、插件套件是这个项目自己写的。
**本项目与 Cloudflare 没有关联，也没有得到它的背书。** Cloudflare 的品牌组件（Logo 等）没有放进 `@xxd/react`。

仓库保留了 Kumo 的提交历史（方便合并上游），所以 GitHub 的贡献者列表里排在前面的是 Kumo 的作者们。
`packages/kumo*` 是上游代码：内部包名保持 `@cloudflare/kumo` 以便合并，对外请用 `@xxd/react`。根目录的 `pnpm kumo:dev` 打开 Kumo 原版的文档站。

## 许可

MIT。小小东的部分见 [LICENSE](LICENSE)；来自 Kumo 的代码同样是 MIT，原文在 [LICENSE-KUMO](LICENSE-KUMO)。
