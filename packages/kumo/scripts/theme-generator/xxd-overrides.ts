/**
 * 小小东换皮：把 Kumo 的语义 token 指向 @xxd/tokens 的变量。
 *
 * 小小东的变量本身已经随 <html data-theme> / data-accent 切换，所以 light 和 dark 写同一个值；
 * light-dark() 仍然由 color-scheme 驱动，但两侧相同。每个值都带 Kumo 原来的亮色作为 fallback，
 * 没引入 tokens.css 时组件依旧能显示。
 *
 * 映射说明见 docs/token-map.md。这个文件是换皮的唯一入口 —— 不要改 config.ts 里的条目，
 * 上游合并时就不会冲突。
 */
import type { ThemeConfig } from "./types.js";

const same = (value: string) => ({ light: value, dark: value });
const tint = (color: string, pct: number) => `color-mix(in srgb, var(${color}) ${pct}%, transparent)`;

export const XXD_COLOR: Record<string, string> = {
  // 面：纸 / 背景 / 洗色
  "kumo-canvas": "var(--bg, #fcfcfc)",
  "kumo-elevated": "var(--bg, #fcfcfc)",
  "kumo-recessed": "var(--wash, #f4f4f5)",
  "kumo-base": "var(--paper, #ffffff)",
  "kumo-tint": "var(--wash, #f4f4f5)",
  "kumo-contrast": "var(--ink, #111111)",
  "kumo-overlay": "var(--paper, #ffffff)",
  "kumo-control": "var(--paper, #ffffff)",
  "kumo-interact": "var(--line-strong, #c9c9ce)",
  "kumo-fill": "var(--wash-strong, #ececee)",
  "kumo-fill-hover": "var(--wash, #f4f4f5)",
  // 强调：墨色或主色
  "kumo-brand": "var(--action, #111111)",
  "kumo-brand-hover": "color-mix(in srgb, var(--action, #111111) 84%, var(--paper, #ffffff))",
  // 线
  "kumo-line": "var(--line, #e7e7ea)",
  "kumo-hairline": "var(--line, #e7e7ea)",
  "kumo-focus": "var(--action, #111111)",
  "kumo-shadow-edge": "rgba(var(--shadow-rgb, 17, 17, 17), 0.12)",
  "kumo-shadow-drop": "rgba(var(--shadow-rgb, 17, 17, 17), 0.08)",
  "kumo-arrow-edge": "var(--line, #e7e7ea)",
  "kumo-arrow-stroke": "transparent",
  // 语义：只表达意义；info 是中性的。color 组会被当作底色用（白字），所以用 *-strong；text 组用普通语义色。
  "kumo-info-tint": tint("--ink, #111111", 5),
  "kumo-info": "var(--ink, #111111)",
  "kumo-warning-tint": tint("--warning, #b45309", 10),
  "kumo-warning": "var(--warning-strong, #b45309)",
  "kumo-danger-tint": tint("--danger, #b42318", 9),
  "kumo-danger": "var(--danger-strong, #b42318)",
  "kumo-success-tint": tint("--success, #15803d", 9),
  "kumo-success": "var(--success-strong, #15803d)",
  "kumo-banner-info": "var(--wash, #f4f4f5)",
  "kumo-banner-warning": "color-mix(in srgb, var(--warning, #b45309) 10%, var(--paper, #ffffff))",
  // 徽标：颜色只留给意义；装饰色收敛到强调色或中性
  "kumo-badge-red": "var(--danger-strong, #b42318)",
  "kumo-badge-green": "var(--success-strong, #15803d)",
  "kumo-badge-orange": "var(--warning-strong, #b45309)",
  "kumo-badge-purple": "var(--action, #111111)",
  "kumo-badge-teal": "var(--action, #111111)",
  "kumo-badge-blue": "var(--action, #111111)",
  "kumo-badge-neutral": "var(--muted, #6f6f6f)",
  "kumo-badge-inverted": "var(--ink, #111111)",
};

export const XXD_TEXT: Record<string, string> = {
  "kumo-default": "var(--ink, #111111)",
  "kumo-inverse": "var(--on-ink, #ffffff)",
  "kumo-strong": "var(--ink, #111111)",
  "kumo-subtle": "var(--muted, #6f6f6f)",
  "kumo-inactive": "var(--muted-2, #9a968d)",
  "kumo-placeholder": "var(--muted-2, #9a968d)",
  "kumo-brand": "var(--action-text, #111111)",
  "kumo-link": "var(--action-text, #111111)",
  "kumo-info": "var(--ink, #111111)",
  "kumo-success": "var(--success, #15803d)",
  "kumo-danger": "var(--danger, #b42318)",
  "kumo-warning": "var(--warning, #b45309)",
  "kumo-badge-orange-subtle": "var(--warning, #b45309)",
  "kumo-badge-teal-subtle": "var(--action-text, #111111)",
  "kumo-badge-neutral-subtle": "var(--ink, #111111)",
  "kumo-badge-inverted": "var(--on-ink, #ffffff)",
};

/** 就地改写 THEME_CONFIG 的 kumo 主题值。新增的上游 token 没有映射时直接报错，避免漏掉。 */
export function applyXxdOverrides(config: ThemeConfig): ThemeConfig {
  for (const [group, map] of [
    ["color", XXD_COLOR],
    ["text", XXD_TEXT],
  ] as const) {
    const tokens = config[group];
    for (const name of Object.keys(tokens)) {
      const value = map[name];
      if (!value) throw new Error(`xxd-overrides: 上游新增了 ${group} token "${name}"，请在 xxd-overrides.ts 和 docs/token-map.md 里补上映射`);
      tokens[name].theme.kumo = same(value);
    }
  }
  return config;
}
