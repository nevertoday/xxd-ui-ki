// Astro 岛：按名字渲染 demos.tsx 里的 React 演示。
import * as demos from "./demos";

export default function ReactDemo({ name }: { name: string }) {
  const Demo = (demos as Record<string, () => JSX.Element>)[`${name}Demo`];
  return Demo ? <Demo /> : null;
}
