export interface AccentPreset { id: string; name: string; zh: string }
export declare const ACCENT_PRESETS: readonly AccentPreset[];
export declare const ACCENT_KEYS: readonly string[];
export declare const LIGHT_PAPER: number[];
export declare const DARK_PAPER: number[];
export declare function normalizeAccent(value: unknown): string;
export declare function toRgb(hex: string): [number, number, number];
export declare function luminance(rgb: number[]): number;
export declare function contrast(a: number[], b: number[]): number;
export declare function ensureContrast(rgb: number[], paper: number[], toward: number[], min?: number): number[];
export declare function accentPalette(value: unknown, prefix?: string): Record<string, string> | null;
export declare function applyAccent(element: HTMLElement, value: unknown, options?: { attr?: string; prefix?: string }): string;

export type ThemeMode = "light" | "dark" | "system";
export interface XxdSettings {
  theme?: ThemeMode;
  corners?: "square" | "rounded";
  accent?: string;
  density?: "comfortable" | "compact";
  finish?: "flat" | "material";
}
export declare const DEFAULT_SETTINGS: Readonly<Required<XxdSettings>>;
export declare const DEFAULT_STORAGE_KEY: string;
export declare function readSettings(key?: string): XxdSettings;
export declare function rememberSettings(patch?: XxdSettings, key?: string): XxdSettings;
export declare function resolveTheme(mode?: string): "light" | "dark";
export declare function applySettings(
  settings?: XxdSettings,
  options?: { element?: HTMLElement; lock?: XxdSettings },
): (Required<XxdSettings> & { resolvedTheme: "light" | "dark" }) | null;
export declare function watchSystemTheme(getSettings: () => XxdSettings, options?: { element?: HTMLElement; lock?: XxdSettings }): () => void;
export declare function trackInputModality(root?: HTMLElement): void;
