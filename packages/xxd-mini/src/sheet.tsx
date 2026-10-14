// 底部面板：手机上一切「更多操作」都放这里——网页版的菜单、浮动卡片在小程序里都换成它（§5）。
//   <Sheet open={open} onOpenChange={setOpen} title="封面">…</Sheet>
//   <ActionSheet open … actions={[{ label: "删除", danger: true, onClick }]} />   一列操作 + 取消
import { ScrollView, View, Text } from "@tarojs/components";
import { X } from "@xxd/icons/each";
import type { ReactNode } from "react";
import "../styles/sheet.mini.css";
import { a11y } from "./aria";
import { Button } from "./button";
import { BackGuard, Portal, usePresence } from "./overlay";
import { useXxd } from "./provider";
import { cx, mods } from "./util";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  children?: ReactNode;
  /** 右上角的关闭按钮，缺省有 */
  closable?: boolean;
  /** 点遮罩关，缺省可以 */
  dismissible?: boolean;
  /** 面板底部固定的一排按钮 */
  footer?: ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, title, children, closable = true, dismissible = true, footer, className }: SheetProps) {
  const [mounted, shown] = usePresence(open, 200);
  const { t } = useXxd();
  if (!mounted) return null;
  const close = () => onOpenChange(false);
  return (
    <Portal>
      <BackGuard open={open} onBack={close} />
      <View className={cx("xxd-scrim", mods({ open: shown }))} onClick={dismissible ? close : undefined} catchMove />
      <View className={cx("xxd-sheet", mods({ open: shown }), className)} catchMove {...a11y({ role: "dialog", modal: true, label: typeof title === "string" ? title : undefined })}>
        {(title != null || closable) && (
          <View className="xxd-sheet__head">
            <Text className="xxd-sheet__title">{title}</Text>
            {closable && <Button variant="ghost" size="sm" icon={X} label={t.close} onClick={close} />}
          </View>
        )}
        {/* 内容多了在面板里滚：用 scroll-view（Skyline 没有 overflow: auto） */}
        <ScrollView className="xxd-sheet__body" scrollY enhanced showScrollbar={false}>
          {children}
        </ScrollView>
        {footer != null && <View className="xxd-sheet__foot">{footer}</View>}
      </View>
    </Portal>
  );
}

export interface SheetAction {
  label: ReactNode;
  description?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  actions: SheetAction[];
  cancelLabel?: string;
}

/** 一列操作 + 取消：手机上的「更多」菜单 */
export function ActionSheet({ open, onOpenChange, title, actions, cancelLabel }: ActionSheetProps) {
  const { t } = useXxd();
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} closable={false} className="is-actions">
      <View className="xxd-sheet__actions" {...a11y({ role: "menu" })}>
        {actions.map((a, i) => (
          <View
            key={i}
            className={cx("xxd-sheet__action", mods({ tone: a.danger ? "danger" : undefined, disabled: a.disabled }))}
            hoverClass={a.disabled ? "none" : "is-hover"}
            onClick={
              a.disabled
                ? undefined
                : () => {
                    close();
                    a.onClick();
                  }
            }
            {...a11y({ role: "menuitem", disabled: a.disabled })}
          >
            <Text className="xxd-sheet__action-label">{a.label}</Text>
            {a.description != null && <Text className="xxd-sheet__action-desc">{a.description}</Text>}
          </View>
        ))}
      </View>
      <View className="xxd-sheet__action is-cancel" hoverClass="is-hover" onClick={close} {...a11y({ role: "button" })}>
        <Text className="xxd-sheet__action-label">{cancelLabel ?? t.cancel}</Text>
      </View>
    </Sheet>
  );
}
