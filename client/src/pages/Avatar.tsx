import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ShieldCheck, ArrowRight } from 'lucide-react';
import { api, type User as ApiUser } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, ErrorNote, cx } from '../components/ui';
import { AVATAR_OPTIONS, AvatarFace, resolveAvatarId, type PersonaAvatar } from '../components/AvatarMatrix';

export default function AvatarPage() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const initialSeed = user?.avatar?.seed || 'adult-male';
  const initialId = resolveAvatarId(initialSeed);
  const [selectedId, setSelectedId] = useState<string>(initialId);

  const defaultName =
    user?.avatar?.displayName ||
    user?.identity?.name ||
    user?.name ||
    'Raghavan Sundaram';
  const [displayName, setDisplayName] = useState(defaultName);

  const selectedPersona: PersonaAvatar =
    AVATAR_OPTIONS.find((a) => a.id === selectedId) || AVATAR_OPTIONS[2];

  const handleSave = async () => {
    setErr(null);
    setBusy(true);
    try {
      await api<{ user: ApiUser }>('/me/avatar', {
        method: 'PUT',
        body: {
          displayName: displayName.trim() || defaultName,
          variant: selectedPersona.variant,
          seed: selectedPersona.id,
        },
      });
      await refresh();
      nav(params.get('next') || (user?.identity ? '/app' : '/app/verify'));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Choose Your Avatar
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Select from 6 lifecycle personas. Your avatar identifies you across estate inventories, statutory claims, and the heir portal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 6-Avatar Matrix (8 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Persona (3 Life Stages × 2 Genders)
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            {AVATAR_OPTIONS.map((persona) => {
              const isSelected = selectedId === persona.id;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setSelectedId(persona.id)}
                  className={cx(
                    'relative rounded-xl border p-4 text-left transition cursor-pointer flex flex-col items-center sm:items-start gap-3',
                    isSelected
                      ? 'border-brand-600 dark:border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 ring-2 ring-brand-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="h-14 w-14 shrink-0 rounded-full ring-2 ring-slate-100 dark:ring-slate-800 overflow-hidden shadow-xs">
                      <AvatarFace seed={persona.id} />
                    </div>
                    {isSelected ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                  </div>

                  <div className="min-w-0 w-full">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {persona.title}
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {persona.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Display Name Input */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full legal or familiar name"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400">
              This name will accompany your avatar across family succession documents.
            </p>
          </div>
        </div>

        {/* Right Column: Live Context Preview & Save (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Live Application Preview
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            {/* Context 1: Top Navigation Shell Profile */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Header & Navigation Card
              </div>
              <div className="rounded-xl bg-slate-900 text-white p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden ring-2 ring-white/20">
                  <AvatarFace seed={selectedPersona.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate text-white">
                    {displayName || 'Raghavan Sundaram'}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {user?.email || 'user@example.com'}
                  </div>
                </div>
                <span className="text-[10px] rounded bg-white/10 px-2 py-0.5 font-mono text-slate-300 uppercase shrink-0">
                  {selectedPersona.stage}
                </span>
              </div>
            </div>

            {/* Context 2: Estate Claim Dossier Signatory */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
                Statutory Claim Signatory
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden">
                  <AvatarFace seed={selectedPersona.id} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    PAN: {user?.identity?.pan || 'ABCDE1234F'} · Verified
                  </div>
                </div>
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
            </div>

            {/* Persona Details */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Life stage:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedPersona.stage}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Gender:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedPersona.gender}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Role designation:</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedPersona.role}</span>
              </div>
            </div>

            {err && <ErrorNote msg={err} />}

            <div className="pt-2">
              <Button
                onClick={handleSave}
                loading={busy}
                disabled={busy}
                className="w-full justify-center gap-2"
              >
                <span>Save Avatar & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
