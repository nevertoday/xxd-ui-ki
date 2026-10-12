import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AppearanceSettings,
  ConfirmTwiceButton,
  Dock,
  DropTarget,
  Pagination,
  Search,
  Segmented,
  Sheet,
  SheetHost,
  StatusLine,
  XxdAppearanceProvider,
  XxdLocaleProvider,
  resolveLocale,
} from "../src/index";
afterEach(cleanup);

describe("O5 语言", () => {
  it("resolveLocale：繁体 / 简体 / 英文", () => {
    expect(resolveLocale("zh-TW")).toBe("zh-Hant");
    expect(resolveLocale("zh_HK")).toBe("zh-Hant");
    expect(resolveLocale("zh-CN")).toBe("zh-CN");
    expect(resolveLocale("en-US")).toBe("en");
  });

  it("Kumo 内置文案跟着切换（分页按钮）", () => {
    const { rerender } = render(
      <XxdLocaleProvider locale="zh-CN">
        <Pagination page={2} perPage={10} totalCount={50} setPage={() => {}} />
      </XxdLocaleProvider>,
    );
    expect(screen.getByRole("navigation", { name: "分页" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "下一页" })).toBeTruthy();
    rerender(
      <XxdLocaleProvider locale="en">
        <Pagination page={2} perPage={10} totalCount={50} setPage={() => {}} />
      </XxdLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Next page" })).toBeTruthy();
    rerender(
      <XxdLocaleProvider locale="zh-Hant">
        <Pagination page={2} perPage={10} totalCount={50} setPage={() => {}} />
      </XxdLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "下一頁" })).toBeTruthy();
  });

  it("小小东组件的文案也跟着切换", () => {
    render(
      <XxdLocaleProvider locale="en">
        <Search value="x" onValueChange={() => {}} />
      </XxdLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
  });
});

describe("O5 小小东组件", () => {
  it("Dock：状态在开头，下一步在末尾", () => {
    const { container } = render(<Dock status="24 张" tools={<button>加图片</button>} primary={<button>复制</button>} />);
    const parts = [...container.querySelector(".xxd-dock")!.children].map((el) => el.className);
    expect(parts).toEqual(["xxd-dock__status", "xxd-dock__tools", "xxd-dock__primary"]);
  });

  it("Search：Esc 清空，× 清空", () => {
    function T() {
      const [v, setV] = useState("abc");
      return <Search value={v} onValueChange={setV} />;
    }
    render(<T />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "q" } });
    fireEvent.click(screen.getByRole("button", { name: "清空" }));
    expect(input.value).toBe("");
  });

  it("Segmented：→ 选下一个，aria-checked 跟着走", () => {
    function T() {
      const [v, setV] = useState<"a" | "b" | "c">("a");
      return <Segmented label="类型" value={v} onValueChange={setV} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }]} />;
    }
    render(<T />);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "B" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "End" });
    expect(screen.getByRole("radio", { name: "C" }).getAttribute("aria-checked")).toBe("true");
  });

  it("Sheet：打开写 data-open，Esc 和 scrim 关闭", () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <SheetHost>
        <Sheet open title="封面" onOpenChange={onOpenChange}>
          <input aria-label="标题" />
        </Sheet>
      </SheetHost>,
    );
    const sheet = container.querySelector(".xxd-sheet")!;
    expect(sheet.hasAttribute("data-open")).toBe(true);
    fireEvent.keyDown(sheet, { key: "Escape" });
    fireEvent.click(container.querySelector(".xxd-scrim")!);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("ConfirmTwiceButton：第一次变确认，第二次执行", () => {
    const onConfirm = vi.fn();
    render(<ConfirmTwiceButton onConfirm={onConfirm}>删除</ConfirmTwiceButton>);
    const b = screen.getByRole("button");
    fireEvent.click(b);
    expect(b.textContent).toBe("确认删除");
    expect(b.hasAttribute("data-confirming")).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(b);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(b.textContent).toBe("删除");
  });

  it("StatusLine：没字就不渲染", () => {
    const { container, rerender } = render(<StatusLine>{""}</StatusLine>);
    expect(container.querySelector(".xxd-statusline")).toBeNull();
    rerender(<StatusLine tone="warning">用完了</StatusLine>);
    expect(container.querySelector(".xxd-statusline")?.getAttribute("data-tone")).toBe("warning");
  });

  it("DropTarget：拖进来出遮罩，松手交给 onFiles", () => {
    const onFiles = vi.fn();
    const { container } = render(<DropTarget onFiles={onFiles}><p>区域</p></DropTarget>);
    const target = container.firstElementChild!;
    const file = new File(["x"], "a.png", { type: "image/png" });
    const dataTransfer = { types: ["Files"], files: [file], getData: () => "" };
    fireEvent.dragEnter(target, { dataTransfer });
    expect(container.querySelector(".xxd-dropveil")!.hasAttribute("data-open")).toBe(true);
    fireEvent.drop(target, { dataTransfer });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("AppearanceSettings：开关圆角写到 <html>", async () => {
    render(
      <XxdAppearanceProvider storageKey="test-ui-2">
        <AppearanceSettings />
      </XxdAppearanceProvider>,
    );
    await act(async () => fireEvent.click(screen.getByRole("switch", { name: "圆角" })));
    expect(document.documentElement.getAttribute("data-corners")).toBe("rounded");
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "暗" })));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
