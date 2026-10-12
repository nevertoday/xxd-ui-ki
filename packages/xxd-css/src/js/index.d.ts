export type Tone = "neutral" | "success" | "danger" | "warning";

export declare function install(root?: Document | ShadowRoot): Document | ShadowRoot;
export declare function init(root?: ParentNode): void;

export declare function openDialog(dialog: HTMLDialogElement): void;
export declare function closeDialog(dialog: HTMLDialogElement, value?: string): void;
export declare function confirmDialog(options?: {
  title?: string;
  message?: string | Node;
  confirmLabel?: string;
  cancelLabel?: string;
  closeLabel?: string;
  tone?: "danger";
  within?: HTMLElement;
}): Promise<boolean>;

export declare function showFloating(trigger: HTMLElement, floating: HTMLElement, options?: { placement?: string; focusFirst?: boolean }): void;
export declare function hideFloating(floating: HTMLElement, options?: { restoreFocus?: boolean }): void;
export declare function place(anchor: Element, floating: HTMLElement, options?: { placement?: string; offset?: number; padding?: number }): { top: number; left: number; side: string };

export declare function selectTab(list: HTMLElement, tab: HTMLElement, options?: { focus?: boolean }): void;
export declare function selectRadio(group: HTMLElement, item: HTMLElement, options?: { focus?: boolean }): void;
export declare function moveInk(list: HTMLElement): void;

export declare function toast(
  message: string,
  options?: { tone?: Tone; within?: HTMLElement; duration?: number; action?: { label: string; onClick?: () => void } },
): { element: HTMLElement; dismiss: () => void };
export declare function copyText(text: string): Promise<boolean>;
export declare function showTooltip(anchor: HTMLElement): void;
export declare function hideTooltip(): void;

export declare function openLayer(layer: HTMLElement): void;
export declare function closeLayer(layer: HTMLElement): void;
export declare const openSheet: typeof openLayer;
export declare const closeSheet: typeof closeLayer;
export declare const openPanel: typeof openLayer;
export declare const closePanel: typeof closeLayer;

export declare function bindSearch(input: HTMLInputElement, options?: { onQuery?: (q: string) => void; hotkey?: boolean; scope?: EventTarget }): () => void;
export declare function markMatches(root: Element, query: string): number;
export declare function clearMarks(root: Element): void;
export declare function addTag(box: HTMLElement, value: string): boolean;
export declare function tagValues(box: HTMLElement): string[];

export interface CommandItem { id?: string; label: string; hint?: string; keywords?: string; run?: () => void }
export declare function openCommandPalette(options?: { items?: CommandItem[]; placeholder?: string; empty?: string; within?: HTMLElement }): HTMLDialogElement;
export declare function bindCommandPalette(items: CommandItem[] | (() => CommandItem[]), options?: { key?: string; placeholder?: string; empty?: string }): () => void;

export interface AppearanceSettings { theme?: "light" | "dark" | "system"; corners?: "square" | "rounded"; accent?: string; density?: "comfortable" | "compact" }
export declare const APPEARANCE_LABELS: Record<"zh-CN" | "zh-Hant" | "en", Record<string, string>>;
export declare function mountAppearance(
  container: HTMLElement,
  options?: {
    locale?: "zh-CN" | "zh-Hant" | "en";
    labels?: Record<string, string>;
    get?: () => AppearanceSettings;
    set?: (patch: AppearanceSettings) => void;
    presets?: { id: string; name: string; zh?: string }[];
    lockCorners?: boolean;
    showDensity?: boolean;
    languages?: { value: string; label: string }[];
    language?: string;
    onLanguage?: (value: string) => void;
  },
): { element: HTMLElement; sync: () => void; destroy: () => void };

export declare const ICON: Record<"close" | "check" | "copy" | "search" | "success" | "danger" | "warning" | "info", (size?: number) => string>;
