// IIFE 入口：window.Xxd，DOM 就绪后自动 install(document)。
// <script src="xxd.js" data-manual></script> 可以关掉自动安装。
import * as Xxd from "./index.js";

const script = globalThis.document?.currentScript;
globalThis.Xxd = Xxd;

if (globalThis.document && !script?.hasAttribute("data-manual")) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => Xxd.install(document), { once: true });
  else Xxd.install(document);
}
