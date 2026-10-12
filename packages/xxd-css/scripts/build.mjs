// 构建 @xxd/css：
//   dist/components.css   只有组件（需要另外引入 tokens.css）
//   dist/xxd.css          令牌 + 组件（一个文件搞定）
//   dist/xxd.shadow.css   Shadow DOM 版本（:root → :host）
//   dist/xxd.js           经典脚本 window.Xxd（自动 install）
//   dist/xxd.esm.js       ESM 打包版
//   dist/boot.js          @xxd/tokens 首帧脚本（方便一起拷进插件）
//   dist/icons.js         @xxd/icons 经典脚本 window.XxdIcons
import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const tokensDir = join(root, "../xxd-tokens");
const iconsDir = join(root, "../xxd-icons");

for (const dir of [tokensDir, iconsDir]) {
  if (!existsSync(join(dir, "dist"))) execFileSync("node", ["scripts/build.mjs"], { cwd: dir, stdio: "inherit" });
}

const toShadow = (css) => css.replace(/:root((?:\[[^\]]+\])*)/g, (_, attrs) => (attrs ? `:host(${attrs})` : ":host"));
const banner = "/* @xxd/css — 小小东原生组件。Copyright (c) 2026 小小东 (xiaoxiaodong.ai). All rights reserved. */";

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const cssResult = await build({
  entryPoints: [join(root, "src/index.css")],
  bundle: true,
  write: false,
  minify: false,
  target: ["chrome114", "safari17", "firefox125"],
  legalComments: "none",
});
const components = cssResult.outputFiles[0].text;
const tokens = readFileSync(join(tokensDir, "tokens.css"), "utf8");
writeFileSync(join(dist, "components.css"), `${banner}\n${components}`);
writeFileSync(join(dist, "xxd.css"), `${banner}\n${tokens}\n${components}`);
writeFileSync(join(dist, "xxd.shadow.css"), `${banner}\n${toShadow(tokens)}\n${toShadow(components)}`);

const minCss = await build({ stdin: { contents: `${tokens}\n${components}`, loader: "css" }, write: false, minify: true, target: ["chrome114"] });
writeFileSync(join(dist, "xxd.min.css"), `${banner}\n${minCss.outputFiles[0].text}`);

const js = { bundle: true, target: "es2020", legalComments: "none", banner: { js: banner } };
await build({ ...js, entryPoints: [join(root, "src/js/global.js")], format: "iife", minify: true, outfile: join(dist, "xxd.js") });
await build({ ...js, entryPoints: [join(root, "src/js/index.js")], format: "esm", outfile: join(dist, "xxd.esm.js") });

copyFileSync(join(tokensDir, "dist/boot.js"), join(dist, "boot.js"));
copyFileSync(join(iconsDir, "dist/icons.iife.js"), join(dist, "icons.js"));

const size = (f) => {
  const buf = readFileSync(join(dist, f));
  return `${f} ${(buf.length / 1024).toFixed(1)}KB / gzip ${(gzipSync(buf).length / 1024).toFixed(1)}KB`;
};
console.log(["xxd.min.css", "xxd.js", "boot.js", "icons.js"].map(size).join("\n"));
