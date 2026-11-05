import type { CSSProperties, ReactNode, ElementType } from 'react';

export interface CrystalizedBallProps {
  preset?: 'plasma' | 'aurora' | 'nebula' | 'ember' | 'frost' | 'solar' | 'eclipse' | 'abyss';
  color?: string;
  theme?: 'dark' | 'light';
  size?: number;
  strands?: number;
  crackle?: number;
  flares?: number;
  glow?: number;
  sparks?: number;
  particleCount?: number;
  fill?: number;
  motion?: 'rise' | 'fall' | 'drift' | 'orbit';
  particleShape?: 'square' | 'round';
  depth?: number;
  sway?: number;
  twinkle?: number;
  haze?: number;
  speed?: number;
  dustSpeed?: number;
  interactive?: boolean;
  hoverStrength?: number;
  intro?: boolean;
  paused?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface CursorGridProps {
  cellSize?: number;
  color?: string;
  gridColor?: string;
  radius?: number;
  falloff?: 'smooth' | 'linear' | 'sharp';
  highlight?: 'area' | 'cell';
  holdTime?: number;
  fadeDuration?: number;
  lineWidth?: number;
  maxOpacity?: number;
  fillOpacity?: number;
  gridOpacity?: number;
  gridStyle?: 'lines' | 'dashed' | 'dots' | 'crosses';
  cellRadius?: number;
  cellGap?: number;
  spotlight?: number;
  clickPulse?: boolean;
  pulseSpeed?: number;
  ambient?: number;
  edgeFade?: number;
  intro?: boolean;
  lightMode?: boolean;
  dpr?: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

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

declare module './CrystalizedBall' {
  const CrystalizedBall: React.FC<CrystalizedBallProps>;
  export default CrystalizedBall;
}

declare module './CursorGrid' {
  const CursorGrid: React.FC<CursorGridProps>;
  export default CursorGrid;
}

declare module './PillNav' {
  const PillNav: React.FC<PillNavProps>;
  export default PillNav;
}
