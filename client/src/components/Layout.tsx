import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Compass, Sprout, TrendingUp, FileCheck2, HeartHandshake, LayoutDashboard, Layers, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLive, useLiveStatus } from '../lib/live';
import { api, type Alert } from '../lib/api';
import { Logo, cx } from './ui';
import { AvatarFace } from './kokonutui/avatar-picker';
import { ThemeToggle } from '../lib/theme';

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

interface Toast { id: string; title: string; detail: string; severity?: string }

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const connected = useLiveStatus();
  const [open, setOpen] = useState(false);
  const [openAlerts, setOpenAlerts] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const loadCount = () => api<{ alerts: Alert[] }>('/alerts').then((r) => setOpenAlerts(r.alerts.filter((a) => !a.resolved).length)).catch(() => {});
  useEffect(() => void loadCount(), []);

  const toast = (t: Toast) => {
    setToasts((ts) => [...ts.slice(-2), t]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 4500);
  };

  useLive((e) => {
    if (e.type === 'alert') {
      if (!e.data.resolved) setOpenAlerts((n) => n + 1);
      if (e.data.severity === 'high') toast({ id: e.data.id, title: e.data.title, detail: e.data.regulator, severity: 'high' });
    }
    if (e.type === 'alert_resolved') setOpenAlerts((n) => Math.max(0, n - 1));
    if (e.type === 'case') toast({ id: e.data.id, title: 'Estate case opened', detail: `Case ${e.data.id} — heirs notified` });
  });

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 px-2 pt-1">
        <Logo light tagline onClick={() => setOpen(false)} />
      </div>
      {NAV.map(({ to, label, step, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-white/15 text-white' : 'text-[#ccfbf1]/80 hover:bg-white/10 hover:text-white')
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{label}</span>
          {label === 'Alerts' && openAlerts > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{openAlerts}</span>}
          {step && <span className="text-[10px] font-bold text-[#ccfbf1]/50">{step}</span>}
        </NavLink>
      ))}
      <div className="mt-auto rounded-xl bg-white/10 p-3 text-xs text-[#ccfbf1]">
        <NavLink to="/app/avatar" onClick={() => setOpen(false)} className="group flex items-center gap-2.5" title="Change avatar">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/20 transition group-hover:ring-white/50">
            {user?.avatar ? <AvatarFace seed={user.avatar.seed} className="h-full w-full" /> : <span className="text-sm font-bold text-white">{user?.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>}
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
          <button onClick={() => { logout(); nav('/'); }} className="flex cursor-pointer items-center gap-1.5 font-semibold text-white/90 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <ThemeToggle onDark />
        </div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-brand-900 to-night lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gradient-to-b from-brand-900 to-night">
            <button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
        <Logo />
        <ThemeToggle className="ml-auto" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <Outlet />
      </main>
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={cx('rounded-xl border bg-surface p-3 shadow-lg', t.severity === 'high' ? 'border-rose-200' : 'border-brand-100')}>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className={cx('h-2 w-2 rounded-full', t.severity === 'high' ? 'bg-rose-500' : 'bg-brand-600')} />
              {t.title}
            </div>
            <div className="mt-0.5 pl-4 text-xs text-slate-500">{t.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
