import { NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileCheck2,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isRouteVisible } from '../lib/features';
import { AvatarFace } from './kokonutui/avatar-picker';
import LogoMark from './LogoMark';
import { cx } from './ui';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Financial Twin', icon: LayoutDashboard, end: true },
  { to: '/app/verify', label: 'Verify Identity', icon: ShieldCheck },
  { to: '/app/aggregate', label: 'Aggregate Assets', icon: Layers },
  { to: '/app/alerts', label: 'Alerts', icon: Bell },
  { to: '/app/heirs', label: 'Legal Heirs', icon: Users },
  { to: '/app/reunite', label: 'Reunite Assets', icon: HeartHandshake },
  { to: '/app/cases', label: 'Estate Claims', icon: FileCheck2 },
  { to: '/app/guide', label: 'AI Succession Guide', icon: BookOpen },
  // Secondary / archived features (controlled by feature flags)
  { to: '/app/plan', label: 'Life Plan', icon: Compass },
  { to: '/app/forecast', label: 'Forecast & Analysis', icon: TrendingUp },
  { to: '/app/invest', label: 'Investment Options', icon: Sprout },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  openAlertsCount?: number;
  liveConnected?: boolean;
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onCloseMobile,
  openAlertsCount = 0,
  liveConnected = false,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isNavActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <aside
      className={cx(
        'h-full flex flex-col bg-[#101D2B] text-white transition-all duration-300 select-none z-30',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className={cx('flex items-center gap-3 border-b border-[#1C3041]/60 px-4 py-4.5', collapsed ? 'justify-center' : 'justify-between')}>
        <NavLink
          to="/app"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 outline-none group"
          title="Asset Bridge"
        >
          <div className="h-8 w-8 rounded-lg bg-[#1C3041] flex items-center justify-center shrink-0 border border-[#55C6B0]/30 shadow-xs group-hover:border-[#55C6B0] transition">
            <LogoMark onDark className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                ASSET BRIDGE
              </div>
              <div className="text-[8.5px] font-mono tracking-widest uppercase text-[#55C6B0]">
                SUCCESSION SUITE
              </div>
            </div>
          )}
        </NavLink>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cx(
              'hidden lg:flex h-6 w-6 rounded-md bg-[#1C3041] hover:bg-[#1C3041]/80 text-[#9BA7B2] hover:text-white items-center justify-center cursor-pointer transition',
              collapsed && 'hidden'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.filter(({ to }) => isRouteVisible(to)).map(({ to, label, icon: Icon, end }) => {
          const active = isNavActive(to, end);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onCloseMobile}
              title={collapsed ? label : undefined}
              className={cx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all',
                active
                  ? 'bg-[#1C3041] text-[#55C6B0] shadow-xs'
                  : 'text-[#9BA7B2] hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                className={cx(
                  'h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-[#55C6B0]' : 'text-[#9BA7B2] group-hover:text-white'
                )}
              />
              {!collapsed && <span className="truncate flex-1">{label}</span>}
              {!collapsed && label === 'Alerts' && openAlertsCount > 0 && (
                <span className="rounded-full bg-[#C45D5D] px-1.5 py-0.2 text-[10px] font-bold text-white shadow-xs">
                  {openAlertsCount}
                </span>
              )}
              {collapsed && label === 'Alerts' && openAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C45D5D]" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer for Mini Sidebar */}
      {onToggleCollapse && collapsed && (
        <div className="hidden lg:flex justify-center p-2 border-t border-[#1C3041]/60">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-lg bg-[#1C3041] hover:bg-white/10 text-[#9BA7B2] hover:text-white flex items-center justify-center cursor-pointer transition"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom Profile & Status Card */}
      <div className="p-3 border-t border-[#1C3041]/60 bg-[#0C1520]/60">
        <NavLink
          to="/app/avatar"
          onClick={onCloseMobile}
          className={cx(
            'group flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-white/5 transition',
            collapsed ? 'justify-center' : ''
          )}
          title="Account Profile"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1C3041] ring-1 ring-white/10 transition group-hover:ring-[#55C6B0]">
            {user?.avatar ? (
              <AvatarFace seed={user.avatar.seed} className="h-full w-full" />
            ) : (
              <span className="text-xs font-bold text-[#55C6B0]">
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                  : 'AB'}
              </span>
            )}
          </span>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">
                {user?.avatar?.displayName || user?.name || 'Verified User'}
              </div>
              <div className="truncate text-[10px] text-[#9BA7B2]">
                {user?.identity?.pan ? `PAN: ${user.identity.pan}` : user?.email || 'Individual Account'}
              </div>
            </div>
          )}
        </NavLink>

        {!collapsed && (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#9BA7B2]">
            <div className="flex items-center gap-1.5" title="Live WebSocket connection">
              <span
                className={cx(
                  'h-2 w-2 rounded-full',
                  liveConnected ? 'bg-[#55C6B0] shadow-[0_0_6px_#55C6B0]' : 'bg-amber-400'
                )}
              />
              <span className="text-[10px] truncate">
                {liveConnected ? 'Live connected' : 'Connecting…'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="flex items-center gap-1 text-[#9BA7B2] hover:text-white transition cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3 w-3" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
