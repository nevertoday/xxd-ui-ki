// 左滑出操作（删除、置顶）：列表行常用。滑过一半松手就停在打开的位置，点别处或者点操作就收回。
// 只动 transform（动效规则）；竖着滑（滚页面）不会误打开。
import { View, Text } from "@tarojs/components";
import { useRef, useState, type ReactNode } from "react";
import "../styles/swipe.mini.css";
import { a11y } from "./aria";
import { cx, mods } from "./util";

export interface SwipeAction {
  label: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export interface SwipeProps {
  children?: ReactNode;
  actions: SwipeAction[];
  /** 每个操作按钮的宽，缺省 72px */
  actionWidth?: number;
  disabled?: boolean;
  className?: string;
}

type Touch = { clientX: number; clientY: number };
type TouchLike = { touches?: Touch[]; changedTouches?: Touch[] };
const point = (e: unknown) => {
  const t = e as TouchLike;
  return (t.touches?.[0] ?? t.changedTouches?.[0]) as Touch | undefined;
};

export function Swipe({ children, actions, actionWidth = 72, disabled, className }: SwipeProps) {
  const width = actions.length * actionWidth;
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null } | null>(null);

  const onStart = (e: unknown) => {
    if (disabled) return;
    const p = point(e);
    if (p) start.current = { x: p.clientX, y: p.clientY, base: x, axis: null };
  };
  const onMove = (e: unknown) => {
    const s = start.current;
    const p = point(e);
    if (!s || !p) return;
    const dx = p.clientX - s.x;
    const dy = p.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (s.axis !== "x") return;
    setDragging(true);
    setX(Math.max(-width, Math.min(0, s.base + dx)));
  };
  const onEnd = () => {
    const s = start.current;
    start.current = null;
    setDragging(false);
    if (!s || s.axis !== "x") return;
    setX((cur) => (cur < -width / 2 ? -width : 0));
  };
  const close = () => setX(0);

  return (
    <View className={cx("xxd-swipe", mods({ open: x !== 0 }), className)}>
      <View className="xxd-swipe__actions" style={`width:${width}px`} {...a11y({ hidden: x === 0 })}>
        {actions.map((a, i) => (
          <View
            key={i}
            className={cx("xxd-swipe__action", mods({ tone: a.danger ? "danger" : undefined }))}
            style={`width:${actionWidth}px`}
            hoverClass="is-hover"
            onClick={() => {
              close();
              a.onClick();
            }}
            {...a11y({ role: "button" })}
          >
            <Text>{a.label}</Text>
          </View>
        ))}
      </View>
      <View
        className={cx("xxd-swipe__content", dragging && "is-dragging")}
        style={`transform:translateX(${x}px)`}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        onTouchCancel={onEnd}
        onClick={x !== 0 ? close : undefined}
      >
        {children}
      </View>
    </View>
  );
}
