// 小小东独有的 React 组件（优化计划 O5）：Kumo 没有的，直接渲染 @xxd/css 的类名和属性。
// 需要同时引入 @xxd/css 的样式：import "@xxd/react/xxd.css"。
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type DragEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "@xxd/icons/react";
import { ACCENT_PRESETS } from "@xxd/tokens";
import { useXxdAppearance } from "./appearance";
import { useXxdLocale } from "./locale";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const flag = (on: boolean | undefined) => (on ? "" : undefined);

/* ── Dock：状态在开头，工具在中间，下一步在末尾 ── */
export function Dock({ status, tools, primary, danger, className, ...rest }: { status?: ReactNode; tools?: ReactNode; primary?: ReactNode; danger?: ReactNode } & HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cx("xxd-dock", className)} {...rest}>
      {status != null && <div className="xxd-dock__status" aria-live="polite">{status}</div>}
      {danger != null && <div className="xxd-dock__danger">{danger}</div>}
      {tools != null && <div className="xxd-dock__tools">{tools}</div>}
      {primary != null && <div className="xxd-dock__primary">{primary}</div>}
    </footer>
  );
}

/* ── Sheet：从 dock 上方升起的半屏层；放在 <SheetHost> 里 ── */
export function SheetHost({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("xxd-sheet-host", className)} {...rest} />;
}

export function Sheet({ open, onOpenChange, title, children, className }: { open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; children?: ReactNode; className?: string }) {
  const { t } = useXxdLocale();
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const back = useRef<Element | null>(null);
  useEffect(() => {
    if (open) {
      back.current = document.activeElement;
      ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not([data-sheet-close]), [href], [tabindex]:not([tabindex='-1'])")?.focus();
    } else if (back.current instanceof HTMLElement) back.current.focus();
  }, [open]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onOpenChange(false);
    }
  };
  return (
    <>
      <div className="xxd-scrim" data-open={flag(open)} onClick={() => onOpenChange(false)} aria-hidden="true" />
      <section ref={ref} className={cx("xxd-sheet", className)} data-open={flag(open)} aria-labelledby={`${id}-t`} aria-hidden={!open} inert={!open} onKeyDown={onKeyDown}>
        <div className="xxd-sheet__head">
          <h3 className="xxd-sheet__title" id={`${id}-t`}>{title}</h3>
          <button type="button" className="xxd-btn" data-variant="ghost" data-icon-only="" data-size="sm" data-sheet-close="" aria-label={t.close} onClick={() => onOpenChange(false)}>
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="xxd-sheet__body">{children}</div>
      </section>
    </>
  );
}

/* ── 设置：Settings > SettingsGroup > SettingsRow ── */
export function Settings({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("xxd-settings", className)} {...rest} />;
}

export function SettingsGroup({ title, note, children, className }: { title?: ReactNode; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("xxd-group", className)}>
      {title != null && <h3 className="xxd-group__title">{title}</h3>}
      <div className="xxd-group__body">{children}</div>
      {note != null && <p className="xxd-group__note">{note}</p>}
    </section>
  );
}

export function SettingsRow({ title, description, control, keywords, href, stack, onClick }: { title: ReactNode; description?: ReactNode; control?: ReactNode; keywords?: string; href?: string; stack?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <div className="xxd-row__text">
        <div className="xxd-row__title">{title}</div>
        {description != null && <div className="xxd-row__desc">{description}</div>}
      </div>
      {control != null && <div className="xxd-row__control">{control}</div>}
    </>
  );
  if (href) return <a className="xxd-row" href={href} data-keywords={keywords} onClick={onClick}>{inner}</a>;
  return <div className="xxd-row" data-keywords={keywords} data-stack={flag(stack)}>{inner}</div>;
}

/* ── Chip：可切换的小标签 ── */
export const Chip = forwardRef<HTMLButtonElement, { pressed?: boolean; onPressedChange?: (pressed: boolean) => void } & ButtonHTMLAttributes<HTMLButtonElement>>(function Chip({ pressed, onPressedChange, className, onClick, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("xxd-chip", className)}
      aria-pressed={pressed === undefined ? undefined : pressed}
      onClick={(e) => {
        onClick?.(e);
        if (pressed !== undefined) onPressedChange?.(!pressed);
      }}
      {...rest}
    />
  );
});

/* ── Search：放大镜 + 清空；hotkey 时 ⌘F / Ctrl+F 聚焦，Esc 清空 ── */
export function Search({ value, onValueChange, placeholder, label, hotkey = false, size, className }: { value: string; onValueChange: (value: string) => void; placeholder?: string; label?: string; hotkey?: boolean; size?: "sm" | "lg"; className?: string }) {
  const { t } = useXxdLocale();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey]);
  return (
    <div className={cx("xxd-input-wrap", className)}>
      <Icon name="Search" size={16} />
      <input
        ref={ref}
        className="xxd-input"
        type="search"
        data-size={size}
        value={value}
        placeholder={placeholder ?? t.search}
        aria-label={label ?? placeholder ?? t.search}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onValueChange("");
          }
        }}
      />
      {value && (
        <button type="button" className="xxd-input-clear" aria-label={t.clear} onClick={() => { onValueChange(""); ref.current?.focus(); }}>
          <Icon name="X" size={14} />
        </button>
      )}
    </div>
  );
}

/* ── Segmented：二到四个互斥选项；← → 移动 ── */
export function Segmented<T extends string>({ value, onValueChange, options, label, block, size, className }: { value: T; onValueChange: (value: T) => void; options: { value: T; label: ReactNode }[]; label: string; block?: boolean; size?: "sm"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const n = e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onValueChange(options[n].value);
    requestAnimationFrame(() => ref.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[n]?.focus());
  };
  return (
    <div ref={ref} className={cx("xxd-segmented", className)} role="radiogroup" aria-label={label} data-block={flag(block)} data-size={size} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} tabIndex={o.value === value ? 0 : -1} onClick={() => onValueChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Rail：会员站左侧的竖排导航 ── */
export function Rail({ items, current, label = "主导航" }: { items: { href: string; label: ReactNode; icon?: string; key?: string }[]; current?: string; label?: string }) {
  return (
    <nav className="xxd-rail" aria-label={label}>
      {items.map((it) => (
        <a key={it.key ?? it.href} href={it.href} aria-current={(it.key ?? it.href) === current ? "page" : undefined}>
          {it.icon && <Icon name={it.icon} size={20} />}
          {it.label}
        </a>
      ))}
    </nav>
  );
}

/* ── Swatches：主色预设 ── */
export function Swatches({ value, onValueChange, presets = ACCENT_PRESETS, label }: { value: string; onValueChange: (value: string) => void; presets?: readonly { id: string; name: string; zh?: string }[]; label?: string }) {
  const { locale, t } = useXxdLocale();
  return (
    <div className="xxd-swatches" role="radiogroup" aria-label={label ?? t.accent}>
      {presets.map((p) => {
        const name = locale === "en" ? p.name : p.zh || p.name;
        return (
          <button
            key={p.id || "ink"}
            type="button"
            role="radio"
            className="xxd-swatch"
            aria-checked={(value || "") === p.id}
            aria-label={name}
            data-tooltip={name}
            style={p.id ? ({ "--swatch": p.id } as CSSProperties) : undefined}
            onClick={() => onValueChange(p.id)}
          />
        );
      })}
    </div>
  );
}

/* ── AppearanceSettings：完整的「外观」设置组（读写 XxdAppearanceProvider） ── */
export function AppearanceSettings({ showDensity = true, showFinish = false, lockCorners = false }: { showDensity?: boolean; showFinish?: boolean; lockCorners?: boolean }) {
  const { settings, update } = useXxdAppearance();
  const { t } = useXxdLocale();
  return (
    <SettingsGroup title={t.appearance}>
      <SettingsRow
        title={t.theme}
        keywords="dark light 暗色 夜间 主题 theme"
        control={<Segmented label={t.theme} value={settings.theme} onValueChange={(theme) => update({ theme })} options={[{ value: "light", label: t.light }, { value: "dark", label: t.dark }, { value: "system", label: t.system }]} />}
      />
      {!lockCorners && (
        <SettingsRow
          title={t.corners}
          description={t.cornersDesc}
          keywords="rounded square 圆角 直角"
          control={<input type="checkbox" role="switch" className="xxd-switch" aria-label={t.corners} checked={settings.corners === "rounded"} onChange={(e) => update({ corners: e.target.checked ? "rounded" : "square" })} />}
        />
      )}
      <SettingsRow title={t.accent} keywords="accent color 颜色 主色" stack control={<Swatches value={settings.accent} onValueChange={(accent) => update({ accent })} />} />
      {showDensity && (
        <SettingsRow title={t.density} keywords="density compact 紧凑" control={<Segmented label={t.density} value={settings.density} onValueChange={(density) => update({ density })} options={[{ value: "comfortable", label: t.comfortable }, { value: "compact", label: t.compact }]} />} />
      )}
      {showFinish && (
        <SettingsRow title={t.finish} keywords="finish material flat 质感" control={<Segmented label={t.finish} value={settings.finish} onValueChange={(finish) => update({ finish })} options={[{ value: "flat", label: t.flat }, { value: "material", label: t.material }]} />} />
      )}
    </SettingsGroup>
  );
}

/* ── Card / CardGrid：瀑布流卡片 ── */
export function CardGrid({ min = 200, masonry, children, className }: { min?: number; masonry?: boolean; children: ReactNode; className?: string }) {
  return <div className={cx(masonry ? "xxd-masonry" : "xxd-grid", className)} style={{ "--grid-min": `${min}px` } as CSSProperties}>{children}</div>;
}

export function Card({ href, title, meta, media, ratio = "3/4", marks, onClick, className }: { href?: string; title: ReactNode; meta?: ReactNode; media?: ReactNode; ratio?: string; marks?: ReactNode; onClick?: () => void; className?: string }) {
  const body = (
    <>
      <div className="xxd-card__media" style={{ "--ratio": ratio } as CSSProperties}>
        {media}
        {marks != null && <div className="xxd-card__marks">{marks}</div>}
      </div>
      <div className="xxd-card__body">
        <p className="xxd-card__title">{title}</p>
        {meta != null && <span className="xxd-card__meta">{meta}</span>}
      </div>
    </>
  );
  return href ? <a className={cx("xxd-card", className)} href={href} onClick={onClick}>{body}</a> : <button type="button" className={cx("xxd-card", className)} onClick={onClick}>{body}</button>;
}

/* ── Prose：阅读排版 ── */
export function Prose({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("xxd-prose", className)} {...rest} />;
}

/* ── O4 模式 ── */

/** 状态行：空着，除非有事要说 —— 一句话，最多一个动作。 */
export function StatusLine({ children, tone, action }: { children?: ReactNode; tone?: "danger" | "warning" | "success"; action?: { label: ReactNode; onClick: () => void } }) {
  if (children == null || children === "" || children === false) return null;
  return (
    <div className="xxd-statusline" role="status" data-tone={tone}>
      <span>{children}</span>
      {action && <button type="button" className="xxd-link" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

/** 两次确认的按钮：第一次变成确认文字（危险色），3 秒内再点才执行 onConfirm。 */
export function ConfirmTwiceButton({ children, confirmLabel, onConfirm, size, variant, timeout = 3000 }: { children: ReactNode; confirmLabel?: ReactNode; onConfirm: () => void; size?: "xs" | "sm" | "lg"; variant?: "ghost" | "outline"; timeout?: number }) {
  const { t } = useXxdLocale();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), timeout);
    return () => clearTimeout(id);
  }, [armed, timeout]);
  return (
    <button
      type="button"
      className="xxd-btn"
      data-size={size}
      data-variant={variant}
      data-confirming={flag(armed)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel ?? t.confirmDelete : children}
    </button>
  );
}

/** 拖放区 + 拖入遮罩：拖到 DropTarget 任何地方都出现遮罩；松手交给 onFiles / onText。 */
export function DropTarget({ onFiles, onText, veil, children, className, style }: { onFiles?: (files: File[]) => void; onText?: (text: string) => void; veil?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  const { t } = useXxdLocale();
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const has = (e: DragEvent) => [...e.dataTransfer.types].some((x) => x === "Files" || x === "text/plain" || x === "text/uri-list");
  const deliver = useCallback(
    (dt: DataTransfer | null) => {
      const files = [...(dt?.files ?? [])];
      if (files.length) onFiles?.(files);
      else {
        const text = dt?.getData("text/uri-list") || dt?.getData("text/plain");
        if (text) onText?.(text);
      }
    },
    [onFiles, onText],
  );
  return (
    <div
      className={className}
      style={{ position: "relative", ...style }}
      data-drop-over={flag(over)}
      onDragEnter={(e) => {
        if (!has(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => has(e) && e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        deliver(e.dataTransfer);
      }}
      onPaste={(e) => {
        if ((e.target as HTMLElement).closest?.("input, textarea, [contenteditable]")) return;
        deliver(e.clipboardData);
      }}
    >
      {children}
      <div className="xxd-dropveil" data-open={flag(over)} aria-hidden="true">{veil ?? t.dropVeil}</div>
    </div>
  );
}

export function DropZone({ icon = "ImagePlus", title, children, over }: { icon?: string; title: ReactNode; children?: ReactNode; over?: boolean }) {
  return (
    <div className="xxd-dropzone" data-over={flag(over)}>
      <Icon name={icon} size={24} />
      <p className="xxd-dropzone__title">{title}</p>
      {children != null && <p className="xxd-help">{children}</p>}
    </div>
  );
}

/** 账号卡：头像（会员一圈主色环）· 名字 · 计划行 · 一个动作。 */
export function AccountCard({ name, avatar, plan, tone, member, action }: { name: ReactNode; avatar?: ReactNode; plan?: ReactNode; tone?: "member" | "warning"; member?: boolean; action?: ReactNode }) {
  return (
    <div className="xxd-account">
      <span className="xxd-avatar" data-member={flag(member)} style={{ "--avatar-size": "36px" } as CSSProperties}>{avatar}</span>
      <div className="xxd-account__main">
        <div className="xxd-account__name">{name}</div>
        {plan != null && <div className="xxd-plan-line" data-tone={tone}>{plan}</div>}
      </div>
      {action}
    </div>
  );
}
