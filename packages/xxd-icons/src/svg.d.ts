export type IconNode = [tag: string, attrs: Record<string, string | number>];
export declare const ICON_NODES: Readonly<Record<string, IconNode[]>>;
export declare const ICON_ALIASES: Readonly<Record<string, string>>;
export declare const ICON_ATTRIBUTES: Readonly<Record<string, string | number>>;
export declare const ICON_NAMES: readonly string[];
export declare function resolveIcon(name: string): IconNode[] | null;
export declare function iconSVG(name: string, options?: { size?: number; className?: string; label?: string }): string;
export declare function hydrateIcons(root?: ParentNode): number;
