import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Card, ErrorNote, Field, Input, Logo } from '../components/ui';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, setSession } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);

  if (user) return <Navigate to="/app" replace />;

  const go = async (path: string, body: object, kind: 'form' | 'demo') => {
    setErr(null);
    setBusy(kind);
    try {
      const r = await api<{ token: string; user: User }>(path, { body });
      setSession(r.token, r.user);
      nav(r.user.identity ? '/app' : '/app/verify');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(mode === 'login' ? '/auth/login' : '/auth/signup', form, 'form');
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><Logo size="lg" /></Link>
        <Card className="p-7">
          <h1 className="text-xl font-bold text-ink">{mode === 'login' ? 'Welcome back' : 'Create your financial twin'}</h1>
          <p className="mt-1 text-sm text-slate-600">{mode === 'login' ? 'Sign in to see your holdings and alerts.' : 'Takes two minutes. Your data stays under your consent.'}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <Field label="Full name (as on PAN)">
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password">
              <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <ErrorNote msg={err} />
            <Button className="w-full" loading={busy === 'form'}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><div className="h-px flex-1 bg-slate-200" />or<div className="h-px flex-1 bg-slate-200" /></div>
          <Button variant="secondary" className="w-full" loading={busy === 'demo'} onClick={() => go('/auth/demo', {}, 'demo')}>
            Continue with demo account
          </Button>
          <p className="mt-5 text-center text-sm text-slate-600">
            {mode === 'login' ? (
              <>New here? <Link className="font-semibold text-brand-700" to="/signup">Create an account</Link></>
            ) : (
              <>Already have an account? <Link className="font-semibold text-brand-700" to="/login">Sign in</Link></>
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
