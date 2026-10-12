import type { Context, ForwardRefExoticComponent, RefAttributes } from "react";
import type { IconProps, Icon as IconComponent } from "./phosphor.js";
export type { IconProps };
export declare const ICON_NAMES: readonly string[];
export declare const IconContext: Context<{ size?: number | string; color?: string; className?: string }>;
export declare const Icon: ForwardRefExoticComponent<IconProps & { name: string } & RefAttributes<SVGSVGElement>>;
export declare function createIcon(name: string): IconComponent;
export declare const icons: Readonly<Record<string, IconComponent>>;
