// XxdPage：每一页的根。写外观变量和外观类名、留出底部安全区、放这一页的轻提示。
//   导航栏用小程序自带的：强制亮 / 暗时跟着换颜色（跟随系统时由 theme.json 管）。用自定义导航栏（NavBar）时设 customNav。
import { View } from "@tarojs/components";
// 按名字导入 API：Taro 编 H5 时只改写它自己处理过的源码里的 Taro.xxx，组件库在 node_modules 里，默认导出上没有这些 API
import { setBackgroundColor, setBackgroundTextStyle, setNavigationBarColor } from "@tarojs/taro";
import { useEffect, type ReactNode } from "react";
import "../styles/layout.mini.css";
import { a11y } from "./aria";
import { useXxd } from "./provider";
import { ToastRegion } from "./toast";
import { cx, IS_H5, styleText } from "./util";

export interface XxdPageProps {
  children?: ReactNode;
  className?: string;
  style?: string | Record<string, string | number>;
  /** 底部留出安全区（全面屏的横条）。页面底部有 TabBar 或固定按钮条时由它们自己留，这里设 false */
  safeArea?: boolean;
  /** 用了自定义导航栏（app.json 的 navigationStyle: custom）：不去改小程序自带导航栏的颜色 */
  customNav?: boolean;
  /** 页面底色：bg（缺省，网页版的页面底）或 paper（白纸，表单页常用） */
  surface?: "bg" | "paper";
  /** 页面底部放了固定的 TabBar：内容底下留出它的高度 */
  tabBar?: boolean;
}

export function XxdPage({ children, className, style, safeArea = true, customNav = false, surface = "bg", tabBar = false }: XxdPageProps) {
  const x = useXxd();
  const bg = surface === "paper" ? x.vars["--paper"] : x.vars["--bg"];

  useEffect(() => {
    if (IS_H5) {
      // H5：整页的底色和滚动条颜色
      const html = document.documentElement;
      html.style.colorScheme = x.theme;
      document.body.style.background = bg;
      return;
    }
    // 窗口底色（下拉露出来的那块）、导航栏颜色跟着外观走
    setBackgroundColor?.({ backgroundColor: bg, backgroundColorTop: bg, backgroundColorBottom: bg })?.catch?.(() => {});
    setBackgroundTextStyle?.({ textStyle: x.theme === "dark" ? "light" : "dark" })?.catch?.(() => {});
    if (!customNav) setNavigationBarColor({ frontColor: x.theme === "dark" ? "#ffffff" : "#000000", backgroundColor: bg, animation: { duration: 0, timingFunc: "linear" } }).catch(() => {});
  }, [x.theme, bg, customNav]);

  return (
    <View className={cx("xxd-page", x.className, surface === "paper" && "is-surface-paper", safeArea && !tabBar && "is-safe-bottom", tabBar && "is-has-tabbar", className)} style={`${x.style};${styleText(style)}`} {...a11y({ role: "main" })}>
      {children}
      <ToastRegion />
    </View>
  );
}

/** 浮层的根：root-portal 把浮层挪到页面最外层，继承不到 XxdPage 上的变量和类名，这里再写一遍 */
export function useOverlayRoot() {
  const x = useXxd();
  return { className: cx("xxd-overlay", x.className), style: x.style };
}
