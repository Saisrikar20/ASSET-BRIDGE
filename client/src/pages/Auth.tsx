import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import LogoMark from "../components/LogoMark";
import CursorGrid from "../components/reactbits/CursorGrid";
import { api, type User } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useSplash } from "../lib/splash";
import { AvatarFace } from "../components/AvatarMatrix";

export interface DemoPersona {
  id: "raghavan" | "priya" | "vikram" | "sunita" | "rajesh";
  name: string;
  role: string;
  state: string;
  age: number;
  avatarSeed: string;
  email: string;
  tagline: string;
  description: string;
}

/**
 * Authoritative Demographic Personas supported by FastAPI Backend
 * Matches fastapi-backend/app/aggregation/personas.py exactly
 */
export const BACKEND_SUPPORTED_PERSONAS: DemoPersona[] = [
  {
    id: "raghavan",
    name: "Raghavan Sundaram",
    role: "Salaried IT Specialist",
    state: "Tamil Nadu",
    age: 42,
    avatarSeed: "senior-male",
    email: "raghavan@demo.local",
    tagline: "Inoperative FD & Tahsildar Succession",
    description:
      "Primary test case. Features inoperative Indian Bank FD without nominee, Canara Bank name mismatch, LIC with deceased nominee, and Tamil Nadu Tahsildar succession roadmap.",
  },
  {
    id: "priya",
    name: "Priya Sharma",
    role: "Medical Professional",
    state: "Karnataka",
    age: 32,
    avatarSeed: "adult-female",
    email: "priya@demo.local",
    tagline: "Active Nominee Audit & PPF",
    description:
      "Multi-hospital consulting portfolio with active EPF, PPF, mutual funds, and proactive legal heir coverage audit under Karnataka succession rules.",
  },
  {
    id: "vikram",
    name: "Vikramaditya Sengupta",
    role: "Retired Public Banker",
    state: "West Bengal",
    age: 68,
    avatarSeed: "senior-male",
    email: "vikram@demo.local",
    tagline: "Pension & Sovereign Gold Bonds",
    description:
      "Post-retirement pension transmission, Sovereign Gold Bonds, ancestral holdings, and multi-regulator nominee updates across banking and postal registries.",
  },
  {
    id: "sunita",
    name: "Sunita Deshmukh",
    role: "Small Business Proprietor",
    state: "Maharashtra",
    age: 51,
    avatarSeed: "senior-female",
    email: "sunita@demo.local",
    tagline: "Sole Proprietor & Court Certificate",
    description:
      "Commercial current accounts, EPF transmission, and Maharashtra Civil Court Succession Certificate thresholds for unnominated estate assets.",
  },
  {
    id: "rajesh",
    name: "Rajesh Patel",
    role: "Cross-Border Depositor (NRI)",
    state: "Gujarat",
    age: 46,
    avatarSeed: "adult-male",
    email: "rajesh@demo.local",
    tagline: "NRE/NRO & Demat Transmission",
    description:
      "Cross-border FEMA compliance, repatriable bank deposits, and depository demat transmission protocols for non-resident succession.",
  },
];

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { user, setSession } = useAuth();
  const open = useSplash();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentPersona = BACKEND_SUPPORTED_PERSONAS[selectedIdx];

  const [form, setForm] = useState({
    name: "",
    email: "raghavan@demo.local",
    password: "password123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "demo" | null>(null);

  if (user) return <Navigate to="/app" replace />;

  const selectPersona = (idx: number) => {
    setSelectedIdx(idx);
    const p = BACKEND_SUPPORTED_PERSONAS[idx];
    setForm((prev) => ({
      ...prev,
      email: p.email,
    }));
  };

  const nextSlide = () =>
    selectPersona((selectedIdx + 1) % BACKEND_SUPPORTED_PERSONAS.length);
  const prevSlide = () =>
    selectPersona(
      (selectedIdx - 1 + BACKEND_SUPPORTED_PERSONAS.length) %
        BACKEND_SUPPORTED_PERSONAS.length,
    );

  /**
   * One-Click Backend Demo Authentication
   * Calls POST /api/auth/demo?persona=... directly on the FastAPI server
   */
  const handleDemoLogin = async (personaId: string = currentPersona.id) => {
    setErr(null);
    setBusy("demo");
    try {
      const res = await api<{ token: string; user: User }>(
        `/auth/demo?persona=${encodeURIComponent(personaId)}`,
        { method: "POST" },
      );
      setSession(res.token, res.user);
      const destination = res.user.identity ? "/app" : "/app/verify";
      await open(async () => destination);
    } catch (apiErr) {
      const message =
        (apiErr as Error).message ||
        "Demo login failed. Please ensure the Asset Bridge backend is running on port 8000.";
      setErr(message);
    } finally {
      setBusy(null);
    }
  };

  /**
   * Credentials Login or Signup
   * Calls POST /api/auth/login or POST /api/auth/signup with strict validation
   */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const name = form.name.trim();

    // Client-side validation matching backend rules
    if (!email) {
      setErr("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setErr("Please enter your password.");
      return;
    }
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && name.length < 2) {
      setErr("Please enter your full name (at least 2 characters).");
      return;
    }

    setBusy("form");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const payload =
        mode === "login"
          ? { email, password }
          : { name, email, password };

      const res = await api<{ token: string; user: User }>(endpoint, {
        method: "POST",
        body: payload,
      });

      setSession(res.token, res.user);
      const destination = res.user.identity ? "/app" : "/app/verify";
      await open(async () => destination);
    } catch (apiErr) {
      setErr(
        (apiErr as Error).message ||
          `${mode === "login" ? "Login" : "Registration"} failed. Please check your credentials.`,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3ED] flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Interactive CursorGrid */}
      <CursorGrid
        cellSize={50}
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

      {/* Subtle Ambient Brand Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#55C6B0]/15 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#101D2B]/10 blur-[100px] pointer-events-none" />

      {/* Main Split Modal Card */}
      <div className="relative z-10 w-full max-w-4xl rounded-[24px] bg-white shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-3 sm:p-4 border border-[#DDD7CA] transition-all">
        {/* =========================================================================
            LEFT COLUMN: Demographic Persona Showcase (5 cols)
            ========================================================================= */}
        <div className="lg:col-span-5 rounded-[20px] overflow-hidden relative min-h-[300px] lg:min-h-[500px] flex flex-col justify-between p-5 sm:p-6 bg-[#101D2B] text-white shadow-inner select-none">
          {/* Deep Vector Illustration Gradients */}
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
                  <stop offset="0%" stopColor="#0B131C" />
                  <stop offset="45%" stopColor="#101D2B" />
                  <stop offset="70%" stopColor="#1C3041" />
                  <stop offset="100%" stopColor="#142636" />
                </linearGradient>

                <radialGradient id="nebulaGlow" cx="20%" cy="25%" r="55%">
                  <stop offset="0%" stopColor="#55C6B0" stopOpacity="0.55" />
                  <stop offset="35%" stopColor="#D5C5A1" stopOpacity="0.30" />
                  <stop offset="70%" stopColor="#1C3041" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#55C6B0" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#1C3041" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="mountainFront" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#253A4D" />
                  <stop offset="45%" stopColor="#182A3A" />
                  <stop offset="100%" stopColor="#101D2B" />
                </linearGradient>

                <linearGradient id="mountainRidge" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#55C6B0" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#D5C5A1" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#1C3041" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              <rect width="600" height="800" fill="url(#skyGrad)" />
              <circle cx="95" cy="85" r="1.2" fill="#ffffff" opacity="0.8" />
              <circle cx="210" cy="140" r="1" fill="#ffffff" opacity="0.65" />
              <circle cx="340" cy="95" r="1.5" fill="#bae6fd" opacity="0.9" />
              <circle cx="480" cy="160" r="1.1" fill="#ffffff" opacity="0.7" />
              <circle cx="150" cy="230" r="1.4" fill="#D5C5A1" opacity="0.85" />
              <circle cx="420" cy="280" r="1" fill="#ffffff" opacity="0.6" />
              <circle cx="520" cy="340" r="1.2" fill="#ffffff" opacity="0.75" />
              <circle cx="270" cy="380" r="1" fill="#55C6B0" opacity="0.7" />

              <path
                d="M-20 -20 Q 140 60 180 180 T 90 380 Q 20 460 -40 400 Z"
                fill="url(#nebulaGlow)"
              />

              <circle cx="380" cy="380" r="34" fill="url(#moonGlow)" />
              <circle cx="380" cy="380" r="16" fill="#101D2B" />
              <path
                d="M380 364 A 16 16 0 0 1 394 388 A 16 16 0 0 0 380 364 Z"
                fill="#55C6B0"
                opacity="0.95"
              />

              <path
                d="M0 640 L80 570 L170 610 L290 510 L380 570 L470 500 L600 620 L600 800 L0 800 Z"
                fill="#161c28"
                opacity="0.75"
              />
              <path
                d="M-20 800 L60 620 L130 680 L230 490 L290 580 L350 480 L440 600 L530 470 L620 630 L620 800 Z"
                fill="url(#mountainFront)"
              />
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

          {/* Left Panel Top: Badge & Mode Switch */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-[#55C6B0] uppercase tracking-wider">
              <span>Persona {selectedIdx + 1} of 5</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={mode === "signup" ? "/login" : "/signup"}
                className="text-xs font-medium text-white/80 hover:text-white transition-colors px-2 py-0.5"
              >
                {mode === "signup" ? "Sign In" : "Sign Up"}
              </Link>
              <button
                type="button"
                onClick={() => handleDemoLogin(currentPersona.id)}
                disabled={busy !== null}
                className="rounded-full border border-[#55C6B0]/50 bg-[#55C6B0]/20 hover:bg-[#55C6B0]/30 text-white px-3 py-0.5 text-xs font-medium transition cursor-pointer backdrop-blur-sm shadow-xs"
              >
                Demo
              </button>
            </div>
          </div>

          {/* Left Panel Middle: Persona Scenario Card */}
          <div className="relative z-10 my-auto py-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden ring-2 ring-[#55C6B0] shadow-md bg-[#1C3041]">
                <AvatarFace seed={currentPersona.avatarSeed} />
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-base font-bold text-white truncate flex items-center gap-1.5">
                  <span>{currentPersona.name}</span>
                  <span className="text-[11px] font-normal text-white/70">
                    ({currentPersona.age}y)
                  </span>
                </div>
                <div className="text-xs text-[#55C6B0] font-medium mt-0.5">
                  {currentPersona.role} · {currentPersona.state}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs space-y-1.5">
              <div className="text-[#D5C5A1] font-semibold text-[11px] uppercase tracking-wide">
                {currentPersona.tagline}
              </div>
              <p className="text-white/80 text-[11px] leading-relaxed">
                {currentPersona.description}
              </p>
            </div>
          </div>

          {/* Left Panel Bottom: Navigation & Dots */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
            {/* Quick Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {BACKEND_SUPPORTED_PERSONAS.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPersona(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === selectedIdx
                      ? "w-6 bg-[#55C6B0]"
                      : "w-2 bg-white/30 hover:bg-white/60"
                  }`}
                  aria-label={`Select ${p.name}`}
                />
              ))}
            </div>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                className="h-7 w-7 rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Previous persona"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="h-7 w-7 rounded-full border border-white/20 hover:border-white/50 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
                aria-label="Next persona"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT COLUMN: Auth Form & Persona Switcher (7 cols)
            ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-7 bg-white text-[#17232E]">
          {/* Top Bar: Brand Logo & Region */}
          <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DC]">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-6 w-6" />
              <span className="font-sans font-bold text-sm tracking-tight text-[#17232E]">
                ASSET BRIDGE
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#71808C] border border-[#DDD7CA] rounded-full px-2.5 py-0.5 bg-[#F5F3ED]">
              <span>🇮🇳</span>
              <span>IN · Statutory RAG</span>
            </div>
          </div>

          {/* Central Auth Body */}
          <div className="max-w-md w-full mx-auto my-auto py-3 space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#17232E]">
                {mode === "signup" ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-xs text-[#71808C]">
                Institutional Financial Intelligence & Estate Succession
              </p>
            </div>

            {/* Persona Switcher Chips */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[#71808C] uppercase tracking-wider flex items-center justify-between">
                <span>Select Demo Scenario</span>
                <span className="text-[#55C6B0] font-mono text-[10px]">
                  5 Live Presets
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {BACKEND_SUPPORTED_PERSONAS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPersona(idx)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                      idx === selectedIdx
                        ? "bg-[#101D2B] text-white shadow-xs ring-1 ring-[#55C6B0]"
                        : "bg-[#F5F3ED] text-[#17232E] hover:bg-[#EAE6DC] border border-[#DDD7CA]"
                    }`}
                  >
                    {p.name.split(" ")[0]} ({p.state.slice(0, 2).toUpperCase()})
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Demo Login Button */}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleDemoLogin(currentPersona.id)}
              className="w-full py-2.5 px-4 rounded-full border border-[#55C6B0]/40 bg-[#101D2B] hover:bg-[#1C3041] text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              title={`Instantly sign in with ${currentPersona.name}'s complete preloaded estate holdings, alerts, and heirs`}
            >
              {busy === "demo" ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#55C6B0]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[#55C6B0]" />
              )}
              <span>Instant Demo · {currentPersona.name}</span>
            </button>

            {/* Divider: — or — */}
            <div className="flex items-center justify-center gap-3 text-xs text-[#71808C] font-mono">
              <span className="h-px w-12 bg-[#DDD7CA]" />
              <span className="text-[10px]">or continue with credentials</span>
              <span className="h-px w-12 bg-[#DDD7CA]" />
            </div>

            {/* Credentials Form */}
            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Legal Name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD7CA] bg-white text-[#17232E] placeholder:text-[#71808C] text-xs outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                  />
                </div>
              )}

              <div>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD7CA] bg-white text-[#17232E] placeholder:text-[#71808C] text-xs outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                />
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password (minimum 6 characters)"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#DDD7CA] bg-white text-[#17232E] placeholder:text-[#71808C] text-xs outline-none transition focus:border-[#101D2B] focus:ring-1 focus:ring-[#55C6B0]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#71808C] hover:text-[#17232E] cursor-pointer"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {mode === "login" && (
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          "Password reset instructions dispatched to " +
                            (form.email || "your registered email"),
                        )
                      }
                      className="text-[10px] font-medium text-[#71808C] hover:text-[#101D2B] transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>

              {/* Error Note */}
              {err && (
                <div className="rounded-xl border border-[#C45D5D]/30 bg-[#C45D5D]/10 p-2.5 text-xs text-[#C45D5D] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              {/* Submit Pill Button */}
              <button
                type="submit"
                disabled={busy !== null}
                className="w-full py-2.5 px-4 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white font-semibold text-xs tracking-wide shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {busy === "form" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                )}
                <span>
                  {mode === "signup"
                    ? "Create Account & Proceed"
                    : "Sign In to Financial Twin"}
                </span>
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center text-xs text-[#71808C] pt-1">
              {mode === "login" ? (
                <span>
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="font-semibold text-[#101D2B] hover:underline transition"
                  >
                    Sign up
                  </Link>
                </span>
              ) : (
                <span>
                  Already registered?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[#101D2B] hover:underline transition"
                  >
                    Sign in
                  </Link>
                </span>
              )}
            </div>
          </div>

          {/* Bottom Trust & Compliance Indicator */}
          <div className="pt-3 border-t border-[#EAE6DC] flex items-center justify-between text-[11px] text-[#71808C]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#34765B]" />
              <span>RBI, SEBI, EPFO & IRDAI Sandbox Aligned</span>
            </div>
            <span className="font-mono text-[10px]">v1.0.0 · Dexathon 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
