// @xxd/react —— 小小东 React 组件入口。
// 组件来自 packages/kumo（Kumo 换皮版，内部包名保持 @cloudflare/kumo 以便合并上游）。
// 消费者只认 @xxd/react：
//   import { Button, Dialog, DialogActions } from "@xxd/react";
//   import "@xxd/react/styles.css";   // 需要 Tailwind v4：先 @import "tailwindcss"
//   import "@xxd/react/standalone.css"; // 不用 Tailwind 时
export * from "@cloudflare/kumo";
export { DialogActions } from "./dialog-actions";
export { XxdAppearanceProvider, useXxdAppearance } from "./appearance";
export { Icon, IconContext, createIcon, icons, ICON_NAMES } from "@xxd/icons/react";
export { ACCENT_PRESETS, type XxdSettings } from "@xxd/tokens";
