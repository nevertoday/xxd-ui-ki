// 对话框：确认、提醒。盖在页面中间（root-portal）；按返回键先关它。网页版 .xxd-dialog。
//   <Dialog open … title="删除这篇？" description="删除后找不回来" confirm={{ label: "删除", danger: true, onClick }} />
import { View, Text } from "@tarojs/components";
import type { ReactNode } from "react";
import "../styles/dialog.mini.css";
import "../styles/sheet.mini.css";
import { a11y } from "./aria";
import { Button } from "./button";
import { BackGuard, Portal, usePresence } from "./overlay";
import { useXxd } from "./provider";
import { cx, mods } from "./util";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** 主操作（在右边）。不给就只有一个「确定」 */
  confirm?: { label?: string; danger?: boolean; loading?: boolean; onClick?: () => void | boolean | Promise<void | boolean> };
  /** 取消按钮的字；写 false 不要取消（只是告知时） */
  cancel?: string | false;
  /** 点遮罩关：缺省不关（确认类的对话框不该一碰就没） */
  dismissible?: boolean;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, description, children, confirm, cancel, dismissible = false, className }: DialogProps) {
  const [mounted, shown] = usePresence(open, 220);
  const { t } = useXxd();
  if (!mounted) return null;
  const close = () => onOpenChange(false);
  const onConfirm = async () => {
    // 返回 false 表示别关（比如校验没过）
    const result = await confirm?.onClick?.();
    if (result !== false) close();
  };
  return (
    <Portal>
      <BackGuard open={open} onBack={close} />
      <View className={cx("xxd-scrim", mods({ open: shown }))} onClick={dismissible ? close : undefined} catchMove />
      <View className={cx("xxd-dialog", mods({ open: shown, role: "alertdialog" }), className)} catchMove {...a11y({ role: "alertdialog", modal: true, label: typeof title === "string" ? title : undefined })}>
        <View className="xxd-dialog__head">
          <Text className="xxd-dialog__title">{title}</Text>
        </View>
        {(description != null || children != null) && (
          <View className="xxd-dialog__body">
            {description != null && <Text className="xxd-dialog__desc">{description}</Text>}
            {children}
          </View>
        )}
        <View className="xxd-dialog__actions">
          {cancel !== false && (
            <Button className="ui-dialog-cancel" onClick={close}>
              {cancel || t.cancel}
            </Button>
          )}
          <Button variant={confirm?.danger ? "danger" : "primary"} loading={confirm?.loading} onClick={onConfirm}>
            {confirm?.label ?? t.confirm}
          </Button>
        </View>
      </View>
    </Portal>
  );
}
