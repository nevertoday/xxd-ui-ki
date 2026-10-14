// 浮层的公共部分：开关动画（关的时候先播完再卸载）、挂到页面最外层（root-portal）、手机返回键先关浮层。
import { PageContainer, RootPortal, View } from "@tarojs/components";
import { useEffect, useState, type ReactNode } from "react";
import { useOverlayRoot } from "./page";
import { IS_H5 } from "./util";

/** open 变 false 以后再留 ms 毫秒（播收起动画）。返回 [还挂着, 已经展开] */
export function usePresence(open: boolean, ms = 200): [boolean, boolean] {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // 先挂上（收起的样子），下一帧再展开，过渡才有起点
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return [mounted, shown];
}

/**
 * 浮层打开时，手机的返回键 / 右滑先关浮层，不直接离开这一页。
 * 微信里借 page-container（基础库 2.16 起）：它本身不画任何东西，只拦返回。
 */
export function BackGuard({ open, onBack }: { open: boolean; onBack: () => void }) {
  if (IS_H5) return null;
  return (
    <PageContainer
      show={open}
      duration={0}
      overlay={false}
      position="center"
      customStyle="width:0;height:0;background:transparent;overflow:hidden"
      onBeforeLeave={() => onBack()}
    />
  );
}

/** 挂到页面最外层，并带上外观变量（root-portal 里继承不到 XxdPage 上的） */
export function Portal({ children, className }: { children?: ReactNode; className?: string }) {
  const root = useOverlayRoot();
  const body = (
    <View className={`${root.className}${className ? ` ${className}` : ""}`} style={root.style}>
      {children}
    </View>
  );
  // H5 没有 root-portal（浮层本来就是 fixed 定位，直接放在原地就行）
  return IS_H5 ? body : <RootPortal>{body}</RootPortal>;
}
