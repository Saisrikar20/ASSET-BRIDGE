import DetentDial from '../components/kokonutui/detent-dial';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Trash2, UserPlus, Users, Download } from 'lucide-react';
import { downloadCsv } from '../lib/csv';
import { api, type Heir } from '../lib/api';
import { Button, ErrorNote, Field, Input, Select, cx } from '../components/ui';

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister', 'Other'];
const blank = { name: '', relation: 'Spouse', pan: '', mobile: '', email: '', share: 50 };

export default function Heirs() {
  const nav = useNavigate();
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api<{ heirs: Heir[] }>('/heirs')
      .then((r) => setHeirs(r.heirs))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api('/heirs', { body: f });
      setF(blank);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/heirs/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const totalShare = heirs.reduce((s, h) => s + (h.share || 0), 0);

  const handleExportCsv = () => {
    downloadCsv(
      'Asset_Bridge_Heir_Distribution_Schedule.csv',
      ['Heir ID', 'Full Name', 'Relationship', 'PAN', 'Mobile', 'Email', 'Allocated Share (%)'],
      heirs.map((h) => [h.id, h.name, h.relation, h.pan, h.mobile, h.email, h.share])
    );
  };

  return (
    <div className="space-y-6">
      {/* STEP 2 — Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-end justify-between gap-4">
        <div>
          
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Your heirs
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Manage the people connected to your estate.
          </p>
        </div>
        {heirs.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCsv}
            className="text-xs py-1.5 h-8 gap-1.5 cursor-pointer"
            title="Export legal heir distribution schedule to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Schedule (.CSV)</span>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* Left Column: Estate Share & Existing Heirs */}
        <div className="space-y-4">
          {/* STEP 4 — Estate Share Distribution */}
          {heirs.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Estate share allocation
                </span>
                <span
                  className={cx(
                    'font-mono font-semibold tabular-nums text-xs',
                    totalShare === 100
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : totalShare > 100
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  {totalShare}% of 100%
                </span>
              </div>

              {/* Multi-segment distribution bar */}
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                {heirs.map((h, i) => {
                  const colors = [
                    'bg-brand-600',
                    'bg-indigo-500',
                    'bg-sky-500',
                    'bg-teal-500',
                    'bg-emerald-500',
                  ];
                  const width = Math.min(Math.max(h.share, 0), 100);
                  return (
                    <div
                      key={h.id}
                      title={`${h.name}: ${h.share}%`}
                      style={{ width: `${width}%` }}
                      className={cx('h-full transition-all', colors[i % colors.length])}
                    />
                  );
                })}
              </div>

              {/* Distribution helper note */}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {totalShare === 100 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Complete estate distribution ({heirs.length} heir{heirs.length === 1 ? '' : 's'}).
                  </span>
                ) : totalShare > 100 ? (
                  <span className="text-rose-600 dark:text-rose-400">
                    Allocation exceeds 100% by {totalShare - 100}%. Please adjust shares.
                  </span>
                ) : (
                  <span>
                    {100 - totalShare}% unallocated. Intended shares usually total 100%. (Actual division follows your will or succession law.)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Existing Heirs List */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-sm">
            {heirs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
                  <Users className="h-5 w-5" />
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  No heirs added yet
                </p>
                <p>
                  Add at least one family member so they can be notified and verified when the time comes.
                </p>
              </div>
            ) : (
              heirs.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Initial / Avatar */}
                    <div className="h-9 w-9 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold text-xs flex items-center justify-center shrink-0 font-mono">
                      {h.name
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>

                    {/* Heir Details */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {h.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          · {h.relation}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>
                          PAN {h.pan.length >= 10 ? `${h.pan.slice(0, 5)}••••${h.pan.slice(-1)}` : h.pan}
                        </span>
                        {h.mobile && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{h.mobile}</span>
                          </>
                        )}
                        {h.email && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                            <span className="hidden sm:inline text-slate-700 dark:text-slate-300 font-medium">{h.email}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Share & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {h.share > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                          {h.share}%
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono font-semibold">
                          share
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(h.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      aria-label={`Remove ${h.name}`}
                      title={`Remove ${h.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* STEP 6 — Succession Simulation Banner */}
          {heirs.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Ready to simulate estate transfer?
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Test how the Civil Registration System (CRS) flow notifies registered heirs ({heirs.length} registered).
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    nav(
                      '/app/guide?q=' +
                        encodeURIComponent(
                          'How do legal heirs claim estate assets if someone dies intestate?'
                        )
                    )
                  }
                  className="gap-1.5 text-xs"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Ask AI Guide</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => nav('/app/reunite')}
                  className="gap-1.5 text-xs"
                >
                  <span>Next: Reunite</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: STEP 5 — Add an Heir Form */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <UserPlus className="h-4 w-4 text-brand-700 dark:text-brand-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Add an heir
            </h2>
          </div>

          <form onSubmit={add} className="space-y-3.5 text-xs">
            <Field label="Full name">
              <Input
                required
                placeholder="e.g. Meenakshi Sundaram"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Relationship">
                <Select
                  value={f.relation}
                  onChange={(e) => setF({ ...f, relation: e.target.value })}
                >
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="PAN (for verification)">
                <Input
                  required
                  maxLength={10}
                  value={f.pan}
                  onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Mobile">
                <Input
                  placeholder="10-digit mobile"
                  value={f.mobile}
                  onChange={(e) => setF({ ...f, mobile: e.target.value })}
                />
              </Field>

              <Field label="Email">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </Field>
            </div>

            <div className="pt-2 pb-1 flex flex-col items-center justify-center bg-[#F5F3ED] rounded-xl p-3 border border-[#DDD7CA]">
              <DetentDial
                label="Allocated share"
                min={0}
                max={100}
                step={5}
                defaultValue={50}
                size={136}
                value={f.share}
                onValueChange={(v) => setF({ ...f, share: v })}
                formatValue={(v) => `${v}%`}
              />
              <span className="text-[11px] text-[#71808C] mt-1.5 font-medium">
                Target estate proportion · Total allocated: {totalShare + f.share}%
              </span>
            </div>

            <ErrorNote msg={err} />

            <Button className="w-full py-2" loading={busy}>
              Add heir
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
