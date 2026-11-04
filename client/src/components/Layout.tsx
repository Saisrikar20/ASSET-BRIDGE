import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Compass,
  Sprout,
  TrendingUp,
  FileCheck2,
  HeartHandshake,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLive, useLiveStatus } from '../lib/live';
import { api, type Alert, type User } from '../lib/api';
import { Logo, cx, useToast } from './ui';
import { AvatarFace } from './kokonutui/avatar-picker';
import { ThemeToggle } from '../lib/theme';
import { isRouteVisible } from '../lib/features';

const NAV = [
  { to: '/app', label: 'Financial twin', icon: LayoutDashboard, end: true },
  { to: '/app/verify', label: 'Verify', step: '01', icon: ShieldCheck },
  { to: '/app/aggregate', label: 'Aggregate', step: '02', icon: Layers },
  { to: '/app/alerts', label: 'Alerts', step: '03', icon: Bell },
  { to: '/app/plan', label: 'Life plan', icon: Compass },
  { to: '/app/forecast', label: 'Forecast & analysis', icon: TrendingUp },
  { to: '/app/invest', label: 'Investment options', icon: Sprout },
  { to: '/app/heirs', label: 'Heirs', icon: Users },
  { to: '/app/reunite', label: 'Reunite', step: '04', icon: HeartHandshake },
  { to: '/app/cases', label: 'Transfer', step: '05', icon: FileCheck2 },
  { to: '/app/guide', label: 'AI succession guide', icon: BookOpen },
];

export default function Layout() {
  const { user, meta, logout, setSession } = useAuth();
  const nav = useNavigate();
  const connected = useLiveStatus();
  const { toast, success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [openAlerts, setOpenAlerts] = useState(0);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const loadCount = () =>
    api<{ alerts: Alert[] }>('/alerts')
      .then((r) => setOpenAlerts(r.alerts.filter((a) => !a.resolved).length))
      .catch(() => {});

  useEffect(() => void loadCount(), []);

  useLive((e) => {
    if (e.type === 'alert') {
      if (!e.data.resolved) setOpenAlerts((n) => n + 1);
      if (e.data.severity === 'high') {
        toast({
          title: e.data.title,
          detail: `${e.data.regulator} · Statutory action needed`,
          variant: 'error',
        });
      }
    }
    if (e.type === 'alert_resolved') setOpenAlerts((n) => Math.max(0, n - 1));
    if (e.type === 'case') {
      toast({
        title: 'Estate Case Opened',
        detail: `Case ${e.data.id} — heirs notified & checklist initialized`,
        variant: 'success',
      });
    }
  });

  const handleSwitchPersona = async (personaId: string, personaName: string) => {
    setSwitching(true);
    setPersonaOpen(false);
    try {
      const res = await api<{ token: string; user: User }>(`/auth/demo?persona=${encodeURIComponent(personaId)}`, {
        method: 'POST',
      });
      setSession(res.token, res.user);
      success(`Switched persona to ${personaName}`, `Now viewing portfolio and cases for ${personaName}`);
      // Reload alerts count for newly active profile
      loadCount();
    } catch (err) {
      error('Failed to switch persona', (err as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  const personas = meta?.personas || [];
  const currentPersona = personas.find((p) => p.name.toLowerCase() === user?.name?.toLowerCase()) || {
    id: 'custom',
    name: user?.name || 'Active User',
    role: 'Claimant',
    state: user?.identity?.state || 'India',
  };

  const personaDropdown = (
    <div className="relative">
      <button
        onClick={() => setPersonaOpen(!personaOpen)}
        disabled={switching}
        className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface/90 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
        title="Switch Demo Persona Profile"
      >
        <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
        <span className="truncate max-w-[140px] font-medium text-slate-900 dark:text-white">{currentPersona.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {personaOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPersonaOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-76 rounded-xl border border-slate-200 dark:border-slate-800 bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Switch Demographic Persona
            </div>
            <div className="mt-1 divide-y divide-slate-100 dark:divide-slate-800/80">
              {personas.map((p) => {
                const isSelected = p.name.toLowerCase() === user?.name?.toLowerCase();
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchPersona(p.id, p.name)}
                    className={cx(
                      'w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex flex-col gap-0.5 cursor-pointer',
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        {p.name}
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />}
                      </span>
                      <span className="text-[10px] rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-slate-500">
                        {p.state}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {p.role} · PAN: {p.pan}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 px-2 pt-1">
        <Logo light tagline onClick={() => setOpen(false)} />
      </div>
      {NAV.filter(({ to }) => isRouteVisible(to)).map(({ to, label, step, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-white/15 text-white' : 'text-[#b9d3f5]/80 hover:bg-white/10 hover:text-white'
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{label}</span>
          {label === 'Alerts' && openAlerts > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{openAlerts}</span>
          )}
          {step && <span className="text-[10px] font-bold text-[#b9d3f5]/50">{step}</span>}
        </NavLink>
      ))}

      <div className="mt-auto rounded-xl bg-white/10 p-3 text-xs text-[#b9d3f5]">
        <NavLink to="/app/avatar" onClick={() => setOpen(false)} className="group flex items-center gap-2.5" title="Change avatar">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/20 transition group-hover:ring-white/50">
            {user?.avatar ? (
              <AvatarFace seed={user.avatar.seed} className="h-full w-full" />
            ) : (
              <span className="text-sm font-bold text-white">
                {user?.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-white">{user?.avatar?.displayName || user?.name}</span>
            <span className="block truncate">{user?.avatar ? user.email : 'Pick your avatar →'}</span>
          </span>
        </NavLink>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cx('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-slate-400')} />
          {connected ? 'Live alerts connected' : 'Connecting…'}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => {
              logout();
              nav('/');
            }}
            className="flex cursor-pointer items-center gap-1.5 font-semibold text-white/90 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <ThemeToggle onDark />
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-brand-900 to-night lg:block print:hidden">
        {sidebar}
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-brand-900 to-night">
            <button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)} aria-label="Close menu">
              <X />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Sticky Top Header bar with Persona Switcher & Navigation controls */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 bg-surface/90 px-4 py-2.5 backdrop-blur print:hidden">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Logo />
          </div>

        </div>

        <div className="flex items-center gap-3">
          {personaDropdown}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
