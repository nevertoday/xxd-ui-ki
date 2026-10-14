// 三个主页面之间的底部标签栏（不是小程序的 tabBar 页面：TabBar 切页时 switchTab 不成就 redirectTo）
import { CheckSquare, LayoutGrid, SlidersHorizontal } from "@xxd/icons/each";
import type { TabBarItem } from "@xxd/mini";

export const MAIN_TABS = (tr: (zh: string, en: string) => string): TabBarItem[] => [
  { value: "index", label: tr("组件", "Components"), icon: LayoutGrid, url: "/pages/index/index" },
  { value: "todo", label: tr("待办", "To-do"), icon: CheckSquare, url: "/pages/todo/index" },
  { value: "settings", label: tr("外观", "Appearance"), icon: SlidersHorizontal, url: "/pages/settings/index" },
];
