import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

// 小小东 UI Kit 展示站。静态构建；界面本身用 @xxd/css（自己用自己），React 演示是 Astro 岛。
export default defineConfig({
  site: "http://localhost:4400",
  integrations: [react(), mdx()],
  build: { format: "directory" },
  vite: { server: { fs: { allow: ["../.."] } } },
});
