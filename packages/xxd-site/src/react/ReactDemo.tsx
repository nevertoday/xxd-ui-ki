// Astro 岛：按名字渲染 demos.tsx 里的 React 演示；外面包一层三语 Provider（跟着 <html lang>）。
import { XxdLocaleProvider } from "@xxd/react";
import * as demos from "./demos";

export default function ReactDemo({ name }: { name: string }) {
  const Demo = (demos as Record<string, () => JSX.Element>)[`${name}Demo`];
  const lang = typeof document === "undefined" ? "zh-CN" : document.documentElement.lang;
  return Demo ? (
    <XxdLocaleProvider locale={lang}>
      <Demo />
    </XxdLocaleProvider>
  ) : null;
}
