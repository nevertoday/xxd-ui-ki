export default defineAppConfig({
  pages: ["pages/index/index", "pages/settings/index"],
  // 跟随系统暗色：导航栏、窗口的颜色写在 theme.json（构建时从 @xxd/mini 拷进来）
  darkmode: true,
  themeLocation: "theme.json",
  window: {
    navigationBarTitleText: "__APP_NAME__",
    navigationBarBackgroundColor: "@navBg",
    navigationBarTextStyle: "@navText",
    backgroundColor: "@bg",
    backgroundTextStyle: "@bgText",
  },
  lazyCodeLoading: "requiredComponents",
});
