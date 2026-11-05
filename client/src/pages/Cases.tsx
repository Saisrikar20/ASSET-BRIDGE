import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck2,
  Plus,
  ArrowRight,
  X,
  FileText
} from 'lucide-react';
import { api, type Case } from '../lib/api';
import { useAuth } from '../lib/auth';
import { date, inr } from '../lib/format';
import { Button, Field, Input, Progress, Badge, useToast } from '../components/ui';

interface CaseRow {
  id: string;
  deceasedName: string;
  createdAt: string;
  progress: number;
  totalValue?: number;
  assetCount?: number;
  heirCount?: number;
  status?: string;
}

export default function Cases() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    deceasedName: user?.identity?.name || user?.name || '',
    deceasedPan: user?.identity?.pan || '',
    dateOfDeath: new Date().toISOString().slice(0, 10),
    registrationNo: '',
    place: user?.identity?.state || 'Tamil Nadu',
  });

  const load = () => {
    api<{ cases: CaseRow[] }>('/cases')
      .then((r) => setCases(r.cases || []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    try {
      const res = await api<{ case: Case; ok: boolean }>('/cases', {
        body: form,
      });
      toastSuccess('Estate Case Created', `Case ${res.case.id} initiated successfully.`);
      setShowCreateModal(false);
      nav(`/app/cases/${res.case.id}`);
    } catch (e) {
      const msg = (e as Error).message || 'Failed to create estate case';
      setErr(msg);
      toastError('Case Creation Failed', msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <div className="pb-4 border-b border-[#DDD7CA] flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-semibold tracking-wider text-[#71808C] uppercase">
            STATUTORY SUCCESSION · ESTATE DOSSIERS
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101D2B]">
            Estate Claims & Succession Cases
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Each case organizes statutory succession into concrete, verified milestones across all 7 regulators.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="rounded-full px-4 text-xs font-semibold gap-1.5 bg-[#101D2B] text-white hover:bg-[#1C3041] shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Succession Case</span>
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && !cases && (
        <div className="rounded-2xl border border-[#DDD7CA] bg-white p-12 text-center text-xs text-[#71808C]">
          Loading active succession dockets…
        </div>
      )}

      {/* Empty State */}
      {!loading && cases && cases.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#DDD7CA] p-10 text-center bg-white shadow-xs space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3ED] text-[#71808C]">
            <FileCheck2 className="h-6 w-6 text-[#101D2B]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#101D2B]">No Estate Succession Cases Active</h2>
            <p className="mt-1 text-xs text-[#71808C] max-w-sm mx-auto">
              A case opens automatically when a CRS death registration matches a financial twin, or you can create one manually.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="rounded-full px-5 bg-[#101D2B] text-white text-xs font-semibold"
            >
              Open Manual Case
            </Button>
            <Link to="/app/reunite">
              <Button size="sm" variant="secondary" className="rounded-full px-5 text-xs border-[#DDD7CA]">
                Simulate CRS Event &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Cases List */}
      <div className="space-y-3">
        {cases?.map((c) => (
          <Link key={c.id} to={`/app/cases/${c.id}`}>
            <div className="rounded-2xl border border-[#DDD7CA] bg-white p-5 hover:border-[#101D2B] transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-[#101D2B] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {c.id.slice(0, 5)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-[#101D2B]">
                      Estate of {c.deceasedName}
                    </span>
                    <Badge tone={c.status === 'Settled' ? 'green' : 'amber'}>
                      {c.status || 'IN PROGRESS'}
                    </Badge>
                  </div>

                  <div className="text-xs text-[#71808C] flex items-center gap-2 flex-wrap font-mono">
                    <span className="text-[#101D2B] font-bold">Case ID: {c.id}</span>
                    <span className="text-[#DDD7CA]">·</span>
                    <span>Opened {date(c.createdAt)}</span>
                    {c.totalValue !== undefined && c.totalValue > 0 && (
                      <>
                        <span className="text-[#DDD7CA]">·</span>
                        <span className="font-bold text-[#101D2B] font-sans">
                          Estate Value: {inr(c.totalValue)}
                        </span>
                      </>
                    )}
                    {c.assetCount !== undefined && (
                      <>
                        <span className="text-[#DDD7CA]">·</span>
                        <span className="font-sans font-medium">{c.assetCount} Assets</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar & Arrow */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-44 text-right">
                  <div className="mb-1 text-xs font-bold text-[#101D2B] tabular-nums font-mono">
                    {Math.round(c.progress * 100)}% Complete
                  </div>
                  <Progress value={c.progress} className="h-2 rounded-full bg-[#F5F3ED]" />
                </div>
                <div className="h-8 w-8 rounded-full bg-[#F5F3ED] flex items-center justify-center text-[#101D2B]">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Manual Case Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[#DDD7CA] bg-white p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#DDD7CA]">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#101D2B]" />
                  <h2 className="text-base font-bold text-[#101D2B]">Initiate Estate Succession Case</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full p-1 text-[#71808C] hover:text-[#101D2B] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
                <Field label="Deceased Person Full Name">
                  <Input
                    required
                    value={form.deceasedName}
                    onChange={(e) => setForm({ ...form, deceasedName: e.target.value })}
                    className="rounded-full border-[#DDD7CA]"
                    placeholder="e.g. Raghavan Sundaram"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Permanent Account Number (PAN)">
                    <Input
                      required
                      maxLength={10}
                      value={form.deceasedPan}
                      onChange={(e) => setForm({ ...form, deceasedPan: e.target.value.toUpperCase() })}
                      className="rounded-full border-[#DDD7CA] font-mono uppercase"
                      placeholder="ABCDE1234F"
                    />
                  </Field>

                  <Field label="Date of Demise">
                    <Input
                      required
                      type="date"
                      value={form.dateOfDeath}
                      onChange={(e) => setForm({ ...form, dateOfDeath: e.target.value })}
                      className="rounded-full border-[#DDD7CA]"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Death Registration Reference (Optional)">
                    <Input
                      value={form.registrationNo}
                      onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                      className="rounded-full border-[#DDD7CA]"
                      placeholder="e.g. CRS/2026/89412"
                    />
                  </Field>

                  <Field label="Jurisdiction / State of Domicile">
                    <Input
                      value={form.place}
                      onChange={(e) => setForm({ ...form, place: e.target.value })}
                      className="rounded-full border-[#DDD7CA]"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </Field>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F3ED] border border-[#DDD7CA] text-[11px] text-[#71808C] leading-relaxed">
                  Initiating an estate case pulls mapped holdings, alerts, and legal heirs into an authoritative succession docket with state-specific revenue checklists.
                </div>

                {err && <div className="text-xs text-[#C45D5D] font-medium">{err}</div>}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={creating}
                    disabled={creating}
                    className="rounded-full px-5 bg-[#101D2B] text-white hover:bg-[#1C3041] text-xs font-semibold"
                  >
                    Create Succession Case &rarr;
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
