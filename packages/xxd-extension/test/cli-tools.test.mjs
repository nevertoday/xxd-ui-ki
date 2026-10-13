// 命令行的查找、体检、项目记录：都是纯函数或只碰临时目录
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildAll, create, docComponent, init, parseArgs, status } from "../scripts/cli.mjs";
import { COMMANDS, GROUPS } from "../scripts/commands.mjs";
import { findComponent, iconAs, listTokens, pageUrl, searchIcons } from "../scripts/lib/find.mjs";
import { checkCss, checkMarkup, doctor } from "../scripts/lib/doctor.mjs";
import { forgetProject, listProjects, rememberProject } from "../scripts/lib/projects.mjs";
import { suggest, width } from "../scripts/lib/term.mjs";

let base;
beforeAll(() => {
  base = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "xxd-tools-"));
  process.env.XXD_UI_HOME = join(base, "home");
});
afterAll(() => rmSync(base, { recursive: true, force: true }));

describe("参数", () => {
  it("开关不吃掉后面的词；--a=b 也认", () => {
    expect(parseArgs(["购物车", "--svg", "删除"])).toEqual({ _: ["购物车", "删除"], svg: true });
    expect(parseArgs(["dir", "--name", "今日待办", "--name-en=Today"])).toMatchObject({ _: ["dir"], name: "今日待办", nameEn: "Today" });
    expect(parseArgs(["--no-vendor"]).noVendor).toBe(true);
  });

  it("每个命令都有分组、中英文说明和例子，main 里都处理了", () => {
    const src = readFileSync(join(import.meta.dirname, "../scripts/cli.mjs"), "utf8");
    for (const cmd of COMMANDS) {
      expect(GROUPS.some((g) => g.id === cmd.group), cmd.name).toBe(true);
      expect(cmd.zh && cmd.en && cmd.usage && cmd.usageEn && cmd.examples.length, cmd.name).toBeTruthy();
      // 英文页不能有汉字（audit 的「英文」一项也会查）
      for (const text of [cmd.en, cmd.usageEn, ...(cmd.examplesEn || cmd.examples)]) expect(text, cmd.name).not.toMatch(/[\u4e00-\u9fff]/);
      expect(src.includes(`cmd === "${cmd.name}"`), `main 没处理 ${cmd.name}`).toBe(true);
    }
  });
});

describe("查找", () => {
  it("图标：中文关键词、别名、名字都能找到，排序合理", () => {
    expect(searchIcons("删除")[0].name).toBe("Trash");
    expect(searchIcons("购物车")[0].name).toBe("ShoppingCart");
    expect(searchIcons("AlertTriangle")[0].name).toBe("TriangleAlert");
    expect(searchIcons("日历 添加").map((x) => x.name)).toEqual(["CalendarPlus"]);
    expect(searchIcons("zzzq")).toEqual([]);
    expect(iconAs("Cart", "react")).toBe('<Icon name="ShoppingCart" />');
    expect(iconAs("Trash", "svg")).toMatch(/^<svg class="ui-icon"/);
    expect(() => iconAs("Nope")).toThrow();
  });

  it("组件：中文名、类名、拼错都行", () => {
    expect(findComponent("对话框").exact.name).toBe("Dialog");
    expect(findComponent("xxd-banner").exact.name).toBe("Banner");
    expect(findComponent("butn")).toMatchObject({ exact: null, near: true });
    expect(findComponent("butn").matches[0].name).toBe("Button");
    expect(docComponent("Banner", { markup: true })).toMatch(/^<div class="xxd-banner"/);
    expect(() => docComponent("butn")).toThrow(/是不是 Button/);
  });

  it("令牌和展示站地址", () => {
    const line = listTokens("line").map((t) => t.name);
    expect(line).toContain("--line");
    expect(listTokens().find((t) => t.name === "--ink")).toMatchObject({ light: "#111111" });
    expect(pageUrl("对话框")).toBe("https://ui.xiaoxiaodong.ai/components/dialog");
    expect(pageUrl("icons", { en: true })).toBe("https://ui.xiaoxiaodong.ai/en/foundations/icons");
    expect(pageUrl("")).toBe("https://ui.xiaoxiaodong.ai/");
    expect(pageUrl("没有这一页")).toBe(null);
  });

  it("终端：中文算两格，拼错能猜", () => {
    expect(width("删除")).toBe(4);
    expect(suggest("stauts", ["status", "sync", "doctor"])).toEqual(["status"]);
  });
});

describe("体检规则", () => {
  const rules = (css) => checkCss(css).map((f) => f.rule);

  it("抓得到：写死的颜色、卡片阴影、粗字重、写死的圆角、动布局、衬线 / 网络字体", () => {
    expect(rules(".a { color: #333 }")).toEqual(["color"]);
    expect(rules(".card { box-shadow: 0 2px 8px rgba(0,0,0,.1) }")).toEqual(["shadow"]);
    expect(rules(".a { font-weight: 700 }")).toEqual(["weight"]);
    expect(rules(".a { border-radius: 8px }")).toEqual(["radius"]);
    expect(rules(".a { transition: width .2s }")).toEqual(["motion"]);
    expect(rules(".a { font-family: Georgia, serif }")).toEqual(["font"]);
    expect(rules("@font-face { font-family: X; src: url(x.woff2) }")).toEqual(["font"]);
    expect(rules('@import url("https://fonts.googleapis.com/css?family=Inter");')).toEqual(["font"]);
  });

  it("不误报：令牌、后备值、焦点环、描边阴影、浮层令牌、无衬线、注释、令牌区", () => {
    expect(rules(".a { color: var(--ink, #111); background: rgba(var(--paper-rgb), .8) }")).toEqual([]);
    expect(rules(":focus-visible { box-shadow: 0 0 0 3px blue }").filter((r) => r === "shadow")).toEqual([]);
    expect(rules(".a { box-shadow: var(--focus-ring) } .b { box-shadow: 0 0 0 1px var(--line) } .c { box-shadow: none !important }")).toEqual([]);
    expect(rules(".menu { box-shadow: var(--shadow-popover) }")).toEqual([]);
    expect(rules(".a { font-family: system-ui, sans-serif; border-radius: var(--r-md); transition: opacity .2s, transform .2s }")).toEqual([]);
    expect(rules("/* .a { color: #333 } */ .b { --x: #fff }")).toEqual([]);
    expect(rules("/* xxd:tokens:start */ :root { color: #fff } /* xxd:tokens:end */")).toEqual([]);
    expect(checkCss(".a {\n  color: #333;\n}")[0].line).toBe(2);
  });

  it("图标名和类名拼错", () => {
    const found = checkMarkup('<i data-xxd-icon="Trashh"></i><button class="xxd-btn xxd-buton ${x}"></button><i data-xxd-icon="Cart"></i>');
    expect(found.map((f) => [f.rule, f.level ?? "warn"])).toEqual([["icon", "error"], ["class", "warn"]]);
    expect(found[0].message).toMatch(/Trash/);
    expect(found[1].message).toMatch(/xxd-btn/);
  });
});

describe("项目：init / doctor / 记住", () => {
  it("新建的插件体检只差上架图标；网站 init 后 status 认得出", async () => {
    await buildAll({ quiet: true });
    const ext = join(base, "ext");
    await create(ext, { name: "今日待办", nameEn: "Today", slug: "today" });
    const r = doctor(ext);
    expect(r.kind).toBe("extension");
    expect(r.findings.map((f) => f.message)).toEqual([expect.stringMatching(/icons/)]);

    const site = join(base, "site");
    mkdirSync(join(site, "public"), { recursive: true });
    writeFileSync(join(site, "index.html"), '<link rel="stylesheet" href="vendor/xxd/xxd.css"><body class="xxd-page"><button class="xxd-btn">好</button></body>');
    const head = init(site, { quiet: true });
    expect(head).toContain('<script src="vendor/xxd/boot.js" data-key="site-ui"></script>');
    expect(JSON.parse(readFileSync(join(site, "xxd.config.json"), "utf8")).vendorDir).toBe("public/vendor/xxd");
    expect(status(site).state).toBe("最新");
    expect(listProjects()).toContain(site);

    writeFileSync(join(site, "a.css"), ".x { color: #f00 } /* xxd-ignore */\n.y { font-weight: 700 }\n");
    writeFileSync(join(site, "xxd.config.json"), JSON.stringify({ vendorDir: "public/vendor/xxd", doctor: { ignore: ["weight"] } }));
    expect(doctor(site).findings).toEqual([]);
  }, 60_000);

  it("记住 / 忘掉", () => {
    const dir = join(base, "p");
    rememberProject(dir);
    rememberProject(dir);
    expect(listProjects().filter((p) => p === dir)).toHaveLength(1);
    expect(forgetProject(dir)).toBe(true);
    expect(forgetProject(dir)).toBe(false);
  });
});
