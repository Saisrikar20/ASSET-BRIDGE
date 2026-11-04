import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Logo } from '../components/ui';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSplash } from '../lib/splash';

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, setSession } = useAuth();
  const open = useSplash();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);

  if (user) return <Navigate to="/app" replace />;

  const go = async (path: string, body: object, kind: 'form' | 'demo') => {
    setErr(null);
    setBusy(kind);
    try {
      // Step 1: Execute authentication request first to verify credentials
      let r: { token: string; user: User };
      try {
        r = await api<{ token: string; user: User }>(path, { body });
      } catch (apiErr) {
        if (kind === 'demo') {
          console.warn('Backend unavailable, using fallback demo session:', apiErr);
          r = {
            token: 'demo-session-token-' + Date.now(),
            user: {
              id: 'u_demo_raghavan',
              email: 'raghavan@assetbridge.in',
              name: 'Raghavan',
              identity: {
                name: 'Raghavan',
                pan: 'ABCPI1234K',
                dob: '1970-01-01',
                aadhaarLast4: '4417',
                mobile: '9876543210',
                state: 'Karnataka',
              },
              verification: null,
              deceased: null,
              avatar: { displayName: 'Raghavan', variant: 1, seed: 'raghavan' },
            },
          };
        } else {
          // Re-throw genuine credentials / network error so transition NEVER triggers on failure
          throw apiErr;
        }
      }

      // Step 2: Establish authentication session state
      setSession(r.token, r.user);
      const destination = !r.user.avatar
        ? `/app/avatar?next=${r.user.identity ? '/app' : '/app/verify'}`
        : r.user.identity
          ? '/app'
          : '/app/verify';

      // Step 3: Trigger the bespoke Asset Bridge transition to dashboard
      await open(async () => destination);
    } catch (e) {
      setErr((e as Error).message || 'Authentication failed');
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || (mode === 'signup' && !form.name)) {
      setErr('Please fill in all required fields.');
      return;
    }
    go(mode === 'login' ? '/auth/login' : '/auth/signup', form, 'form');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc] dark:bg-[#0a0b0d] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Focused Authentication Card */}
        <div className="bg-white dark:bg-[#141619] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-7 sm:p-9 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login'
                ? 'Sign in to see your holdings and alerts.'
                : 'Takes two minutes. Your data stays under your consent.'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full name (as on PAN)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raghavan Sundaram"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1c22] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1c22] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a1c22] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-200">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={busy !== null}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#0e2747] hover:bg-[#15345d] dark:bg-white dark:hover:bg-slate-100 dark:text-[#0e2747] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy === 'form' && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
            </button>
          </form>

          {/* Subtle Divider */}
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="font-mono uppercase text-[10px]">or</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Continue with demo account */}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => go('/auth/demo', {}, 'demo')}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-[#181a1e] dark:hover:bg-[#22252c] text-slate-800 dark:text-slate-200 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy === 'demo' && <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />}
            <span>Continue with demo account</span>
          </button>

          {/* Footer Navigation */}
          <p className="mt-5 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <Link
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline"
                  to="/signup"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link
                  className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline"
                  to="/login"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
