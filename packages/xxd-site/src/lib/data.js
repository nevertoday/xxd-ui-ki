// 展示站的数据：全部来自各个包的「唯一来源」，页面不手抄。
import registry from "../../../xxd-css/registry.json";
import tokens from "../../../xxd-tokens/dist/tokens.json";
import { ACCENT_PRESETS, accentPalette, contrast, toRgb } from "@xxd/tokens";
import { ICON_NAMES, ICON_ALIASES, iconSVG } from "@xxd/icons";

export { registry, tokens, ACCENT_PRESETS, accentPalette, contrast, toRgb, ICON_NAMES, ICON_ALIASES, iconSVG };

export const slug = (name) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

export const components = registry.components.map((c) => ({ ...c, slug: slug(c.name) }));

export function componentBySlug(s) {
  return components.find((c) => c.slug === s);
}

const CATEGORY_ORDER = ["基础", "操作", "表单", "导航", "设置", "浮层", "反馈", "内容"];
export const categories = [...new Set(components.map((c) => c.category))].sort(
  (a, b) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99),
);

export const icon = (name, size = 16) => iconSVG(name, { size });
