import type { CSSProperties, FC, ReactNode, ElementType } from 'react';

export interface PillNavItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  ariaLabel?: string;
}

export interface PillNavProps {
  items?: PillNavItem[];
  logo?: ReactNode | string;
  logoAlt?: string;
  logoHref?: string;
  activeHref?: string;
  defaultActiveIndex?: number;
  onItemClick?: (item: PillNavItem, index: number, event: any) => void;
  linkComponent?: ElementType;
  theme?: 'dark' | 'light';
  layout?: 'split' | 'joined';
  size?: 'sm' | 'md' | 'lg';
  surface?: 'glass' | 'solid' | 'none';
  itemStyle?: 'pill' | 'plain';
  hoverEffect?: 'fill' | 'glide' | 'none';
  indicator?: 'dot' | 'pill' | 'none';
  highlightColor?: string;
  highlightTextColor?: string;
  barColor?: string;
  textColor?: string;
  bounce?: number;
  stretch?: number;
  intro?: boolean;
  collapse?: 'auto' | 'always' | 'never';
  onMenuToggle?: (open: boolean) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

declare const PillNav: FC<PillNavProps>;
export default PillNav;
