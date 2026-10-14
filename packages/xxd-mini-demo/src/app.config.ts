export default defineAppConfig({
  pages: ["pages/index/index", "pages/component/index", "pages/todo/index", "pages/settings/index"],
  // 跟随系统暗色：颜色写在 theme.json（@xxd/mini/theme.json，构建时拷进来）
  darkmode: true,
  themeLocation: "theme.json",
  window: {
    navigationBarTitleText: "小小东 UI",
    navigationBarBackgroundColor: "@navBg",
    navigationBarTextStyle: "@navText",
    backgroundColor: "@bg",
    backgroundTextStyle: "@bgText",
  },
  lazyCodeLoading: "requiredComponents",
});
