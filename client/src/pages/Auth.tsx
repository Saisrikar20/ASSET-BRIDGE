import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import LogoMark from '../components/LogoMark';
import { api, type User } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useSplash } from '../lib/splash';
import { AvatarFace } from '../components/AvatarMatrix';

const SHOWCASE_SLIDES = [
  {
    name: 'Andrew.ui',
    role: 'UI & Illustration',
    avatarSeed: 'adult-male',
    email: 'raghavan@demo.local',
    title: 'Selected Works',
  },
  {
    name: 'Priya.heir',
    role: 'Succession & Claims',
    avatarSeed: 'adult-female',
    email: 'priya@demo.local',
    title: 'Statutory Registry',
  },
  {
    name: 'Raghavan.twin',
    role: 'Financial Estate Twin',
    avatarSeed: 'senior-male',
    email: 'raghavan@demo.local',
    title: 'Consolidated Ledger',
  },
];

export default function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { user, setSession } = useAuth();
  const open = useSplash();
  const [slideIdx, setSlideIdx] = useState(0);
  const currentSlide = SHOWCASE_SLIDES[slideIdx];

  const [form, setForm] = useState({
    name: '',
    email: 'raghavan@demo.local',
    password: 'password123',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);

  if (user) return <Navigate to="/app" replace />;

  const nextSlide = () => setSlideIdx((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
  const prevSlide = () => setSlideIdx((prev) => (prev - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);

  const go = async (path: string, body: object, kind: 'form' | 'demo') => {
    setErr(null);
    setBusy(kind);
    try {
      let r: { token: string; user: User };
      try {
        r = await api<{ token: string; user: User }>(path, { body });
      } catch (apiErr) {
        if (kind === 'demo') {
          console.warn('Backend unavailable, using fallback demo session:', apiErr);
          r = {
            token: 'demo-session-token-' + Date.now(),
            user: {
              id: 'u_raghavan',
              email: form.email || 'raghavan@demo.local',
              name: form.name || 'Raghavan Sundaram',
              identity: {
                name: 'Raghavan Sundaram',
                pan: 'ABCPI1234K',
                dob: '1970-01-01',
                aadhaarLast4: '4417',
                mobile: '9876543210',
                state: 'Karnataka',
              },
              verification: null,
              deceased: null,
              avatar: { displayName: 'Raghavan', variant: 2, seed: 'senior-male' },
            },
          };
        } else {
          throw apiErr;
        }
      }

      setSession(r.token, r.user);
      const destination = !r.user.avatar
        ? `/app/avatar?next=${r.user.identity ? '/app' : '/app/verify'}`
        : r.user.identity
          ? '/app'
          : '/app/verify';

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
    <div className="min-h-screen bg-[#F7F4EB] flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Subtle Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#A8B7A1]/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#244B3C]/10 blur-[100px] pointer-events-none" />

      {/* Main Split Floating Modal Card (Compact & Proportionate) */}
      <div className="relative w-full max-w-3xl rounded-[24px] bg-white shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-3.5 border border-[#E2D9C5] transition-all">
        
        {/* =========================================================================
            LEFT COLUMN: Compact Cosmic Visual Card (5 cols)
            ========================================================================= */}
        <div className="lg:col-span-4 rounded-[18px] overflow-hidden relative min-h-[200px] lg:min-h-[380px] flex flex-col justify-between p-4 bg-[#080B10] text-white shadow-inner select-none">
          
          {/* Deep Cosmic Background Vector Illustration */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <svg
              viewBox="0 0 600 800"
              preserveAspectRatio="xMidYMid slice"
              className="w-full h-full object-cover"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#080a12" />
                  <stop offset="45%" stopColor="#0e1422" />
                  <stop offset="70%" stopColor="#161522" />
                  <stop offset="100%" stopColor="#241014" />
                </linearGradient>

                <radialGradient id="nebulaGlow" cx="20%" cy="25%" r="55%">
                  <stop offset="0%" stopColor="#e14d2a" stopOpacity="0.75" />
                  <stop offset="30%" stopColor="#9a251b" stopOpacity="0.45" />
                  <stop offset="65%" stopColor="#3d1428" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#0284c7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="mountainFront" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#333b4d" />
                  <stop offset="35%" stopColor="#1e2330" />
                  <stop offset="100%" stopColor="#0d1017" />
                </linearGradient>

                <linearGradient id="mountainRidge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ea580c" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#9a3412" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#1e293b" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Base Sky */}
              <rect width="600" height="800" fill="url(#skyGrad)" />

              {/* Starfield */}
              <circle cx="95" cy="85" r="1.2" fill="#ffffff" opacity="0.8" />
              <circle cx="210" cy="140" r="1" fill="#ffffff" opacity="0.65" />
              <circle cx="340" cy="95" r="1.5" fill="#bae6fd" opacity="0.9" />
              <circle cx="480" cy="160" r="1.1" fill="#ffffff" opacity="0.7" />
              <circle cx="150" cy="230" r="1.4" fill="#fed7aa" opacity="0.85" />
              <circle cx="420" cy="280" r="1" fill="#ffffff" opacity="0.6" />
              <circle cx="520" cy="340" r="1.2" fill="#ffffff" opacity="0.75" />
              <circle cx="270" cy="380" r="1" fill="#38bdf8" opacity="0.7" />

              {/* Glowing Nebula Cloud Masses */}
              <path
                d="M-20 -20 Q 140 60 180 180 T 90 380 Q 20 460 -40 400 Z"
                fill="url(#nebulaGlow)"
              />

              {/* Celestial Orb / Moon with Corona */}
              <circle cx="380" cy="380" r="34" fill="url(#moonGlow)" />
              <circle cx="380" cy="380" r="16" fill="#0c1829" />
              <path
                d="M380 364 A 16 16 0 0 1 394 388 A 16 16 0 0 0 380 364 Z"
                fill="#38bdf8"
                opacity="0.95"
              />

              {/* Distant Mountain Silhouettes */}
              <path
                d="M0 640 L80 570 L170 610 L290 510 L380 570 L470 500 L600 620 L600 800 L0 800 Z"
                fill="#161c28"
                opacity="0.75"
              />

              {/* Main Dramatic Jagged Canyon Peaks */}
              <path
                d="M-20 800 L60 620 L130 680 L230 490 L290 580 L350 480 L440 600 L530 470 L620 630 L620 800 Z"
                fill="url(#mountainFront)"
              />

              {/* Mountain Ridge Highlights */}
              <path
                d="M230 490 L290 580 L285 595 L225 510 Z"
                fill="url(#mountainRidge)"
              />
              <path
                d="M350 480 L440 600 L430 615 L345 500 Z"
                fill="url(#mountainRidge)"
              />
            </svg>
          </div>

          {/* Left Panel Top Header */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-white/90">
              {currentSlide.title}
            </span>
            <div className="flex items-center gap-2">
              <Link
                to={mode === 'signup' ? '/login' : '/signup'}
                className="text-[11px] font-medium text-white/80 hover:text-white transition-colors px-2 py-0.5"
              >
                {mode === 'signup' ? 'Sign In' : 'Sign Up'}
              </Link>
              <button
                type="button"
                onClick={() => go('/auth/demo', {}, 'demo')}
                className="rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white px-3 py-0.5 text-[11px] font-medium transition cursor-pointer backdrop-blur-sm shadow-xs"
              >
                Demo
              </button>
            </div>
          </div>

          {/* Left Panel Bottom Creator / Persona Badge & Controls */}
          <div className="relative z-10 flex items-center justify-between pt-4">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => {
                setForm((prev) => ({ ...prev, email: currentSlide.email }));
                nextSlide();
              }}
              title="Click to cycle demographic twin"
            >
              <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden ring-1.5 ring-white/30 group-hover:ring-white transition shadow-sm">
                <AvatarFace seed={currentSlide.avatarSeed} />
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-white group-hover:text-emerald-200 transition">
                  {currentSlide.name}
                </div>
                <div className="text-[10px] text-white/60">
                  {currentSlide.role}
                </div>
              </div>
            </div>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevSlide}
                className="h-6 w-6 rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Previous persona"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="h-6 w-6 rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Next persona"
              >
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Clean Minimal Form Panel (7 cols)
            ========================================================================= */}
        <div className="lg:col-span-8 flex flex-col justify-between p-4 sm:p-7 bg-white text-[#26352D]">
          
          {/* Top Bar: Brand Logo */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <LogoMark className="h-6 w-6" />
              <span className="font-sans font-bold text-sm tracking-tight text-[#26352D]">
                ASSET BRIDGE
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold text-[#5A6B54] border border-[#E2D9C5] rounded-full px-2.5 py-0.5 bg-[#F7F4EB]">
              <span>🇮🇳</span>
              <span>IN</span>
            </div>
          </div>

          {/* Central Auth Form */}
          <div className="max-w-sm w-full mx-auto my-auto space-y-4">
            <div className="text-center space-y-0.5">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#26352D]">
                {mode === 'signup' ? 'Create Account' : 'Welcome'}
              </h1>
              <p className="text-xs text-[#5A6B54]">
                Financial Intelligence & Estate Succession
              </p>
            </div>

            {/* Prominent One-Click Demo Mode Button with Preloaded Raghavan Data */}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => go('/auth/demo', {}, 'demo')}
              className="w-full py-2.5 px-4 rounded-full border border-[#244B3C]/30 bg-[#F7F4EB] hover:bg-[#E9E0CC] text-[#244B3C] font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              title="Instantly sign in with Raghavan Sundaram's complete preloaded estate holdings, alerts, and heirs"
            >
              {busy === 'demo' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#244B3C]" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-[#244B3C]" />
              )}
              <span>Instant Demo Login (Preloaded Estate & Heirs)</span>
            </button>

            {/* Divider: — or — */}
            <div className="flex items-center justify-center gap-3 text-xs text-[#8C9C84] font-mono">
              <span className="h-px w-10 bg-[#E2D9C5]" />
              <span className="text-[10px]">or sign in with credentials</span>
              <span className="h-px w-10 bg-[#E2D9C5]" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D9C5] bg-white text-[#26352D] placeholder:text-[#8C9C84] text-xs outline-none transition focus:border-[#244B3C] focus:ring-1 focus:ring-[#244B3C]/20"
                  />
                </div>
              )}

              <div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2D9C5] bg-white text-[#26352D] placeholder:text-[#8C9C84] text-xs outline-none transition focus:border-[#244B3C] focus:ring-1 focus:ring-[#244B3C]/20"
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E2D9C5] bg-white text-[#26352D] placeholder:text-[#8C9C84] text-xs outline-none transition focus:border-[#244B3C] focus:ring-1 focus:ring-[#244B3C]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#8C9C84] hover:text-[#26352D] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="mt-1 text-right">
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password recovery link has been dispatched to ' + (form.email || 'your email'));
                    }}
                    className="text-[10px] font-medium text-[#244B3C] hover:underline transition cursor-pointer"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>

              {err && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 text-center">
                  {err}
                </div>
              )}

              {/* Primary Submit Button: Pill Button */}
              <button
                type="submit"
                disabled={busy !== null}
                className="w-full py-2.5 px-4 rounded-full bg-[#244B3C] hover:bg-[#1E3E32] text-white font-semibold text-xs tracking-wide shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {busy === 'form' && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                <span>{mode === 'signup' ? 'Create Account' : 'Login'}</span>
              </button>

              {/* Google Social SSO Button */}
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => go('/auth/demo', {}, 'demo')}
                className="w-full py-2 px-4 rounded-full border border-[#E2D9C5] bg-white hover:bg-[#F7F4EB] text-[#26352D] text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="text-center text-xs text-[#5A6B54]">
              {mode === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="font-semibold text-[#244B3C] hover:underline transition"
                  >
                    Sign up
                  </Link>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-[#244B3C] hover:underline transition"
                  >
                    Sign in
                  </Link>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Social / Trust Icons */}
          <div className="pt-4 flex items-center justify-center gap-5 text-[#8C9C84]">
            {/* Facebook */}
            <svg className="h-3.5 w-3.5 hover:text-[#26352D] transition cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
            </svg>
            {/* Twitter */}
            <svg className="h-3.5 w-3.5 hover:text-[#26352D] transition cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {/* LinkedIn */}
            <svg className="h-3.5 w-3.5 hover:text-[#26352D] transition cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
            </svg>
            {/* Instagram */}
            <svg className="h-3.5 w-3.5 hover:text-[#26352D] transition cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
}
