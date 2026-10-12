import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACCENT_PRESETS,
  DEFAULT_SETTINGS,
  DEFAULT_STORAGE_KEY,
  applySettings,
  readSettings,
  rememberSettings,
  watchSystemTheme,
  type XxdSettings,
} from "@xxd/tokens";

type Ctx = { settings: Required<XxdSettings>; update: (patch: XxdSettings) => void; presets: typeof ACCENT_PRESETS };
const AppearanceContext = createContext<Ctx | null>(null);

/**
 * 外观（主题 / 圆角 / 主色 / 密度）。首帧仍建议在 <head> 里放 @xxd/tokens/dist/boot.js 防闪；
 * 这个 Provider 负责 React 里的读写与同步。lock 用于产品锁定某项（会员站 { corners: "square" }）。
 */
export function XxdAppearanceProvider({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
  lock = {},
  initial,
}: {
  children: ReactNode;
  storageKey?: string;
  lock?: XxdSettings;
  initial?: XxdSettings;
}) {
  const [settings, setSettings] = useState<Required<XxdSettings>>(() => ({
    ...DEFAULT_SETTINGS,
    ...initial,
    ...(typeof window === "undefined" ? {} : readSettings(storageKey)),
  }));

  useEffect(() => {
    applySettings(settings, { lock });
    return watchSystemTheme(() => settings, { lock });
  }, [settings, lock]);

  const update = useCallback(
    (patch: XxdSettings) => setSettings((prev) => ({ ...prev, ...rememberSettings({ ...prev, ...patch }, storageKey) }) as Required<XxdSettings>),
    [storageKey],
  );

  const value = useMemo(() => ({ settings, update, presets: ACCENT_PRESETS }), [settings, update]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useXxdAppearance(): Ctx {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useXxdAppearance 需要放在 <XxdAppearanceProvider> 里");
  return ctx;
}
