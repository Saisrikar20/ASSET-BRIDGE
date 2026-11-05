import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useLive, useLiveStatus } from '../lib/live';
import { api, type Alert, type User } from '../lib/api';
import { Logo, cx, useToast } from './ui';
import CursorGrid from './reactbits/CursorGrid';
import PillNav from './reactbits/PillNav';
import Sidebar from './Sidebar';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/app': { title: 'Financial Twin', subtitle: 'Executive net worth and regulatory asset summary' },
  '/app/verify': { title: 'Identity Verification', subtitle: 'Statutory PAN & CKYC registry compliance' },
  '/app/aggregate': { title: 'Account Aggregator', subtitle: 'Multi-regulator consent gateway (RBI, SEBI, IRDAI, EPFO)' },
  '/app/alerts': { title: 'Regulatory Alerts', subtitle: 'Real-time nominee gaps and compliance intelligence' },
  '/app/heirs': { title: 'Legal Heirs Roster', subtitle: 'Statutory succession shares and nominee audit' },
  '/app/reunite': { title: 'Reunite Unclaimed', subtitle: 'DEA Fund, IEPF, EPFO, and SCWF asset recovery' },
  '/app/cases': { title: 'Estate Claims', subtitle: 'Deceased succession dossiers and institutional dispatch' },
  '/app/guide': { title: 'Succession Navigator', subtitle: 'AI legal guide grounded in circulars and case documents' },
  '/app/avatar': { title: 'Account Profile', subtitle: 'Demographic identity and persona settings' },
};

export default function Layout() {
  const { user, meta, setSession } = useAuth();
  const location = useLocation();
  const connected = useLiveStatus();
  const { toast, success, error } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openAlerts, setOpenAlerts] = useState(0);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('ab_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ab_sidebar_collapsed', String(next));
      return next;
    });
  };

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
      const res = await api<{ token: string; user: User }>(
        `/auth/demo?persona=${encodeURIComponent(personaId)}`,
        { method: 'POST' }
      );
      setSession(res.token, res.user);
      success(`Switched persona to ${personaName}`, `Now viewing portfolio and cases for ${personaName}`);
      loadCount();
    } catch (err) {
      error('Failed to switch persona', (err as Error).message);
    } finally {
      setSwitching(false);
    }
  };

  const personas = meta?.personas || [];
  const currentPersona = personas.find(
    (p) => p.name.toLowerCase() === user?.name?.toLowerCase()
  ) || {
    id: 'custom',
    name: user?.name || 'Active User',
    role: 'Claimant',
    state: user?.identity?.state || 'India',
    pan: user?.identity?.pan || 'ABCDE1234F',
  };

  const currentRouteMeta = PAGE_TITLES[location.pathname] || {
    title: 'Asset Bridge',
    subtitle: 'Statutory succession and asset recovery suite',
  };

  return (
    <div
      className={cx(
        'min-h-screen bg-[#F5F3ED] text-[#17232E] relative transition-all duration-300',
        collapsed ? 'lg:pl-20' : 'lg:pl-64'
      )}
    >
      {/* Interactive Background CursorGrid - Non-intrusive and lightweight */}
      <CursorGrid
        cellSize={54}
        color="#55C6B0"
        gridColor="#DDD7CA"
        highlight="area"
        gridStyle="lines"
        radius={140}
        holdTime={400}
        fadeDuration={800}
        fillOpacity={0.035}
        gridOpacity={0.065}
        spotlight={0.45}
        clickPulse
        lightMode={true}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Desktop Fixed Sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block print:hidden">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          openAlertsCount={openAlerts}
          liveConnected={connected}
        />
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <div
            className="fixed inset-0 bg-[#101D2B]/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#101D2B] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition z-50"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar
              collapsed={false}
              onCloseMobile={() => setMobileOpen(false)}
              openAlertsCount={openAlerts}
              liveConnected={connected}
            />
          </div>
        </div>
      )}

      {/* Sticky Global Application Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#DDD7CA] bg-white/95 px-4 py-2.5 backdrop-blur-sm print:hidden shadow-xs">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden h-8 w-8 rounded-lg border border-[#DDD7CA] bg-white hover:bg-[#F5F3ED] flex items-center justify-center text-[#17232E] cursor-pointer"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="lg:hidden shrink-0">
            <Logo size="md" />
          </div>

          <div className="hidden lg:block min-w-0">
            <div className="font-bold text-sm text-[#101D2B] tracking-tight leading-tight truncate">
              {currentRouteMeta.title}
            </div>
            <div className="text-[11px] text-[#71808C] truncate leading-tight">
              {currentRouteMeta.subtitle}
            </div>
          </div>
        </div>

        {/* Center: Desktop Quick Navigation PillNav */}
        <div className="hidden xl:flex items-center">
          <PillNav
            items={[
              { label: 'Twin', href: '/app' },
              { label: 'Verify', href: '/app/verify' },
              { label: 'Aggregate', href: '/app/aggregate' },
              { label: 'Alerts', href: '/app/alerts' },
              { label: 'Heirs', href: '/app/heirs' },
              { label: 'Reunite', href: '/app/reunite' },
              { label: 'Cases', href: '/app/cases' },
              { label: 'AI Guide', href: '/app/guide' },
            ]}
            activeHref={location.pathname}
            layout="joined"
            size="sm"
            theme="light"
            surface="solid"
            itemStyle="pill"
            hoverEffect="glide"
            indicator="pill"
            highlightColor="#101D2B"
            highlightTextColor="#FFFFFF"
            barColor="#F5F3ED"
            textColor="#17232E"
            linkComponent={({ href, ...rest }: any) => (
              <NavLink to={href} {...rest} />
            )}
            className="shadow-xs border border-[#DDD7CA]"
          />
        </div>

        {/* Right: Demographic Persona Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPersonaOpen(!personaOpen)}
              disabled={switching}
              className="flex items-center gap-2 rounded-full border border-[#DDD7CA] bg-white px-3 py-1.5 text-xs font-semibold text-[#101D2B] shadow-xs hover:bg-[#F5F3ED] transition cursor-pointer"
              title="Switch Demographic Persona Profile"
            >
              <span className="flex h-2 w-2 rounded-full bg-[#55C6B0] shadow-[0_0_4px_#55C6B0]" />
              <span className="truncate max-w-[120px] sm:max-w-[160px] font-bold text-[#101D2B]">
                {currentPersona.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[#71808C]" />
            </button>

            {personaOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setPersonaOpen(false)}
                />
                <div className="absolute right-0 mt-2 z-50 w-76 rounded-2xl border border-[#DDD7CA] bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#71808C] flex items-center justify-between border-b border-[#DDD7CA] pb-2">
                    <span>DEMOGRAPHIC PERSONAS</span>
                    <Sparkles className="h-3 w-3 text-[#55C6B0]" />
                  </div>
                  <div className="mt-1 divide-y divide-slate-100">
                    {personas.map((p) => {
                      const isSelected =
                        p.name.toLowerCase() === user?.name?.toLowerCase();
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitchPersona(p.id, p.name)}
                          className={cx(
                            'w-full text-left px-3 py-2 rounded-xl text-xs transition flex flex-col gap-0.5 cursor-pointer mt-0.5',
                            isSelected
                              ? 'bg-[#101D2B] text-white font-semibold'
                              : 'hover:bg-[#F5F3ED] text-[#17232E]'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              {p.name}
                              {isSelected && (
                                <span className="h-1.5 w-1.5 rounded-full bg-[#55C6B0]" />
                              )}
                            </span>
                            <span
                              className={cx(
                                'text-[10px] rounded-full px-2 py-0.2 font-mono',
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#F5F3ED] text-[#71808C] border border-[#DDD7CA]'
                              )}
                            >
                              {p.state}
                            </span>
                          </div>
                          <div
                            className={cx(
                              'text-[10px] truncate',
                              isSelected ? 'text-white/80' : 'text-[#71808C]'
                            )}
                          >
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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
