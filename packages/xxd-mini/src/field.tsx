// 输入框：标签、说明、出错、字数。网页版的 .xxd-field / .xxd-input / .xxd-textarea。
import { Input as TaroInput, Textarea as TaroTextarea, View, Text } from "@tarojs/components";
import { createContext, useContext, useState, type ReactNode } from "react";
import "../styles/field.mini.css";
import { a11y } from "./aria";
import { useXxd } from "./provider";
import { cx, IS_H5, mods, nextId } from "./util";

export interface FieldProps {
  label?: ReactNode;
  /** 输入框下面的说明 */
  help?: ReactNode;
  /** 出错时的说明（有它时输入框变红） */
  error?: ReactNode;
  /** 标签后面写「选填」 */
  optional?: boolean;
  children?: ReactNode;
  className?: string;
}

// 字段的标签字：里面的输入框拿它当读屏名字（小程序里没有 <label for>）
const FieldLabel = createContext<string | undefined>(undefined);

/** 一个字段：标签 + 输入框 + 说明 / 出错 */
export function Field({ label, help, error, optional, children, className }: FieldProps) {
  const { lang } = useXxd();
  return (
    <FieldLabel.Provider value={typeof label === "string" ? label : undefined}>
    <View className={cx("xxd-field", mods({ invalid: Boolean(error) }), className)}>
      {label != null && (
        <Text className={cx("xxd-label", mods({ optional }))}>
          {label}
          {optional && <Text className="xxd-label__optional">{lang === "en" ? "Optional" : "选填"}</Text>}
        </Text>
      )}
      {children}
      {error ? (
        <Text className="xxd-error" {...a11y({ role: "alert", live: "assertive" })}>
          {error}
        </Text>
      ) : help != null ? (
        <Text className="xxd-help">{help}</Text>
      ) : null}
    </View>
    </FieldLabel.Provider>
  );
}

/** 输入框的读屏名字：自己的 label → 外面 Field 的标签 → 提示字。H5 里还要交给里面真正的 <input> */
function useInputName(label?: string, placeholder?: string) {
  const fromField = useContext(FieldLabel);
  const name = label ?? fromField ?? placeholder;
  return { name, native: IS_H5 && name ? { nativeProps: { "aria-label": name } } : {} };
}

interface InputBase {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  maxLength?: number;
  /** 输入框下面显示字数（要给 maxLength） */
  counter?: boolean;
  /** 读屏说明（没有 Field 的 label 时写） */
  label?: string;
  className?: string;
  focus?: boolean;
  onConfirm?: (value: string) => void;
  onBlur?: (value: string) => void;
}

export interface InputProps extends InputBase {
  type?: "text" | "number" | "idcard" | "digit" | "nickname" | "safe-password";
  password?: boolean;
  size?: "sm" | "md" | "lg";
  confirmType?: "send" | "search" | "next" | "go" | "done";
}

function useValue(value: string | undefined, defaultValue: string | undefined, onValueChange?: (v: string) => void) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const set = (v: string) => {
    if (value == null) setInner(v);
    onValueChange?.(v);
  };
  return [current, set] as const;
}

function Counter({ length, max }: { length: number; max: number }) {
  const { t } = useXxd();
  return <Text className={cx("xxd-help", "is-counter", length > max && "is-over")}>{t.count(length, max)}</Text>;
}

export function Input({ value, defaultValue, onValueChange, placeholder, disabled, invalid, maxLength, counter, label, className, type = "text", password, size, confirmType, focus, onConfirm, onBlur }: InputProps) {
  const [current, set] = useValue(value, defaultValue, onValueChange);
  const { name, native } = useInputName(label, placeholder);
  const [id] = useState(() => nextId("input"));
  return (
    <>
      <TaroInput
        id={id}
        className={cx("xxd-input", mods({ invalid, disabled, size: size === "md" ? undefined : size }), className)}
        placeholderClass="is-placeholder"
        value={current}
        type={type}
        password={password}
        placeholder={placeholder}
        disabled={disabled || undefined}
        maxlength={maxLength ?? -1}
        confirmType={confirmType}
        focus={focus}
        onInput={(e) => set(e.detail.value)}
        onConfirm={(e) => onConfirm?.(e.detail.value)}
        onBlur={(e) => onBlur?.(e.detail.value)}
        {...native}
        {...a11y({ label: name, disabled })}
      />
      {counter && maxLength != null && <Counter length={current.length} max={maxLength} />}
    </>
  );
}

export interface TextareaProps extends InputBase {
  /** 跟着内容长高 */
  autoHeight?: boolean;
  rows?: number;
}

export function Textarea({ value, defaultValue, onValueChange, placeholder, disabled, invalid, maxLength, counter, label, className, autoHeight, rows = 3, focus, onConfirm, onBlur }: TextareaProps) {
  const [current, set] = useValue(value, defaultValue, onValueChange);
  const { name, native } = useInputName(label, placeholder);
  return (
    <>
      <TaroTextarea
        className={cx("xxd-textarea", mods({ invalid, disabled, autosize: autoHeight }), className)}
        placeholderClass="is-placeholder"
        style={autoHeight ? undefined : `height:${rows * 22 + 18}px`}
        value={current}
        placeholder={placeholder}
        disabled={disabled || undefined}
        maxlength={maxLength ?? -1}
        autoHeight={autoHeight}
        focus={focus}
        onInput={(e) => set(e.detail.value)}
        onConfirm={(e) => onConfirm?.(e.detail.value)}
        onBlur={(e) => onBlur?.(e.detail.value)}
        {...native}
        {...a11y({ label: name, disabled })}
      />
      {counter && maxLength != null && <Counter length={current.length} max={maxLength} />}
    </>
  );
}
