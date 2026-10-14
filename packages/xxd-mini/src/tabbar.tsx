// 自定义底部标签栏（app.json 的 tabBar.custom 为 true 时用，或者放在页面底部）：图标 + 字，选中的用墨色。留出底部安全区。
// 用小程序自带的标签栏就不需要它：theme.json 里已经写好了亮暗两套颜色。
import { View, Text } from "@tarojs/components";
// 按名字导入 API：Taro 编 H5 时只改写它自己处理过的源码里的 Taro.xxx，组件库在 node_modules 里，默认导出上没有这些 API
import { redirectTo, switchTab } from "@tarojs/taro";
import type { ReactNode } from "react";
import "../styles/tabbar.mini.css";
import "../styles/badge.mini.css";
import { a11y } from "./aria";
import { Icon, type IconNode } from "./icon";
import { cx, mods } from "./util";

export interface TabBarItem {
  value: string;
  label: ReactNode;
  icon?: IconNode;
  /** 角标数字；0 不显示；true 显示一个点 */
  badge?: number | boolean;
  /** 点了切到这一页（switchTab）；不写就只回调 onValueChange */
  url?: string;
}

export interface TabBarProps {
  items: TabBarItem[];
  value: string;
  onValueChange?: (value: string) => void;
  /** 固定在屏幕底部，缺省是 */
  fixed?: boolean;
  className?: string;
}

export function TabBar({ items, value, onValueChange, fixed = true, className }: TabBarProps) {
  return (
    <View className={cx("xxd-tabbar", mods({ fixed }), className)} {...a11y({ role: "tablist" })}>
      {items.map((item) => {
        const on = item.value === value;
        return (
          <View
            key={item.value}
            className={cx("xxd-tabbar__item", mods({ selected: on }))}
            hoverClass="is-hover"
            onClick={() => {
              if (on) return;
              onValueChange?.(item.value);
              if (item.url) switchTab({ url: item.url }).catch(() => redirectTo({ url: item.url! }));
            }}
            {...a11y({ role: "tab", selected: on })}
          >
            <View className="xxd-tabbar__icon">
              {item.icon && <Icon icon={item.icon} size={22} />}
              {item.badge ? <Text className={cx("xxd-badge", "xxd-tabbar__badge", "is-variant-solid", "is-tone-danger", item.badge === true && "is-dot")}>{item.badge === true ? "" : item.badge > 99 ? "99+" : item.badge}</Text> : null}
            </View>
            <Text className="xxd-tabbar__label">{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
