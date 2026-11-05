import DetentDial from '../components/kokonutui/detent-dial';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  UserPlus,
  Users,
  Download,
  ShieldCheck,
  Edit2,
  Check,
  AlertCircle,
  HelpCircle,
  Info
} from 'lucide-react';
import { downloadCsv } from '../lib/csv';
import { api, type Heir, type Holding } from '../lib/api';
import { Button, ErrorNote, Field, Input, Select, cx, useToast } from '../components/ui';

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Brother', 'Sister', 'Other'];
const blank = { name: '', relation: 'Spouse', pan: '', mobile: '', email: '', share: 50 };

export default function Heirs() {
  const nav = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingHeirId, setEditingHeirId] = useState<string | null>(null);
  const [editShare, setEditShare] = useState<number>(0);
  const [editBusy, setEditBusy] = useState(false);

  const load = () => {
    api<{ heirs: Heir[] }>('/heirs')
      .then((r) => setHeirs(r.heirs || []))
      .catch(() => {});
    api<{ holdings: Holding[] }>('/holdings')
      .then((r) => setHoldings(r.holdings || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const totalShare = heirs.reduce((s, h) => s + (Number(h.share) || 0), 0);

  const validateForm = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(f.pan.trim().toUpperCase())) {
      setErr('Invalid Permanent Account Number (PAN). Must match statutory 10-character format (e.g. ABCDE1234F).');
      return false;
    }
    if (f.mobile && !/^\d{10}$/.test(f.mobile.replace(/\D/g, ''))) {
      setErr('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }
    if (totalShare + Number(f.share) > 100) {
      setErr(`Allocating ${f.share}% would exceed 100% total estate distribution (Current: ${totalShare}%).`);
      return false;
    }
    return true;
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!validateForm()) return;

    setBusy(true);
    try {
      await api('/heirs', {
        body: {
          ...f,
          pan: f.pan.trim().toUpperCase(),
          share: Number(f.share),
        },
      });
      setF(blank);
      load();
      toastSuccess('Legal Heir Added', `${f.name} successfully registered with ${f.share}% share.`);
    } catch (e) {
      const msg = (e as Error).message || 'Failed to register heir';
      setErr(msg);
      toastError('Registration Failed', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateShare = async (heirId: string) => {
    setEditBusy(true);
    try {
      await api(`/heirs/${heirId}`, {
        method: 'PATCH',
        body: { share: editShare },
      });
      setEditingHeirId(null);
      load();
      toastSuccess('Share Allocation Updated', `Updated estate entitlement to ${editShare}%.`);
    } catch (e) {
      toastError('Update Failed', (e as Error).message);
    } finally {
      setEditBusy(false);
    }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the legal heirs roster?`)) return;
    try {
      await api(`/heirs/${id}`, { method: 'DELETE' });
      load();
      toastSuccess('Heir Removed', `${name} has been removed.`);
    } catch (e) {
      toastError('Deletion Failed', (e as Error).message);
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      'Asset_Bridge_Heir_Distribution_Schedule.csv',
      ['Heir ID', 'Full Name', 'Relationship', 'PAN', 'Mobile', 'Email', 'Allocated Share (%)'],
      heirs.map((h) => [h.id, h.name, h.relation, h.pan, h.mobile, h.email, h.share])
    );
  };

  // Nominee Audit Correlation
  const nomineeNames = new Set(
    holdings.map((h) => h.nominee?.name?.toLowerCase().trim()).filter(Boolean)
  );
  const unassignedHoldings = holdings.filter((h) => !h.nominee || h.nominee.status !== 'valid');

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
            SUCCESSION PLANNING · CLASS-I LEGAL HEIRS
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#101D2B]">
            Legal Heirs & Estate Distribution
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Apportion intended statutory estate shares and verify nominee alignment across all discovered assets.
          </p>
        </div>
        {heirs.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportCsv}
            className="rounded-full text-xs py-1.5 h-8 gap-1.5 cursor-pointer border-[#DDD7CA] text-[#17232E] hover:bg-[#F5F3ED]"
            title="Export legal heir distribution schedule to CSV"
          >
            <Download className="h-3.5 w-3.5 text-[#101D2B]" />
            <span>Export Schedule (.CSV)</span>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-start">
        {/* Left Column: Estate Share, Existing Heirs, & Nominee Coverage Audit */}
        <div className="space-y-5">
          {/* Estate Share Allocation Progress Bar */}
          {heirs.length > 0 && (
            <div className="rounded-2xl border border-[#DDD7CA] bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#101D2B]">
                  Estate Share Distribution Ledger
                </span>
                <span
                  className={cx(
                    'font-mono font-bold tabular-nums text-xs px-2.5 py-0.5 rounded-full',
                    totalShare === 100
                      ? 'bg-[#34765B]/10 text-[#34765B] border border-[#34765B]/30'
                      : totalShare > 100
                        ? 'bg-[#C45D5D]/10 text-[#C45D5D] border border-[#C45D5D]/30'
                        : 'bg-[#C58B3C]/10 text-[#C58B3C] border border-[#C58B3C]/30'
                  )}
                >
                  {totalShare}% of 100% Allocated
                </span>
              </div>

              {/* Multi-segment distribution visual bar */}
              <div className="h-3 w-full rounded-full bg-[#F5F3ED] border border-[#DDD7CA] overflow-hidden flex shadow-inner">
                {heirs.map((h, i) => {
                  const colors = [
                    'bg-[#101D2B]',
                    'bg-[#1C3041]',
                    'bg-[#55C6B0]',
                    'bg-[#34765B]',
                    'bg-[#C58B3C]',
                  ];
                  const width = Math.min(Math.max(Number(h.share) || 0, 0), 100);
                  return (
                    <div
                      key={h.id}
                      title={`${h.name} (${h.relation}): ${h.share}%`}
                      style={{ width: `${width}%` }}
                      className={cx('h-full transition-all border-r border-white/20', colors[i % colors.length])}
                    />
                  );
                })}
              </div>

              {/* Share Breakdown Note */}
              <div className="text-xs text-[#71808C] leading-relaxed">
                {totalShare === 100 ? (
                  <span className="text-[#34765B] font-medium flex items-center gap-1.5">
                    <Check className="h-4 w-4" />
                    <span>Complete 100% estate allocation across {heirs.length} legal heir{heirs.length === 1 ? '' : 's'}.</span>
                  </span>
                ) : totalShare > 100 ? (
                  <span className="text-[#C45D5D] font-medium flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Allocation exceeds 100% by {totalShare - 100}%. Please adjust intended shares before issuing dossiers.</span>
                  </span>
                ) : (
                  <span className="text-[#71808C] flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-[#C58B3C] shrink-0" />
                    <span>
                      {100 - totalShare}% unallocated residue. In intestacy, unallocated surplus is distributed by statutory Class-I personal laws.
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Existing Heirs Roster */}
          <div className="rounded-2xl border border-[#DDD7CA] bg-white divide-y divide-[#DDD7CA]/60 overflow-hidden shadow-xs">
            {heirs.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#71808C] space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F3ED] text-[#71808C] mb-3">
                  <Users className="h-6 w-6 text-[#101D2B]" />
                </div>
                <p className="font-bold text-sm text-[#101D2B]">
                  No Legal Heirs Added Yet
                </p>
                <p className="max-w-xs mx-auto">
                  Add spouse, children, or statutory dependents to map succession shares and generate legal claim dossiers.
                </p>
              </div>
            ) : (
              heirs.map((h) => {
                const isNomineeOnAssets = nomineeNames.has(h.name.toLowerCase().trim());
                const isEditing = editingHeirId === h.id;

                return (
                  <div
                    key={h.id}
                    className="p-4 sm:px-5 sm:py-4 hover:bg-[#F5F3ED]/40 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar Initials */}
                        <div className="h-10 w-10 rounded-full bg-[#101D2B] text-white font-bold text-xs flex items-center justify-center shrink-0 font-mono shadow-xs">
                          {h.name
                            .split(' ')
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </div>

                        {/* Heir Information */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#101D2B] truncate">
                              {h.name}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F5F3ED] text-[#17232E] border border-[#DDD7CA]">
                              {h.relation}
                            </span>
                            {isNomineeOnAssets ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#34765B] bg-[#34765B]/10 px-2 py-0.5 rounded-full border border-[#34765B]/30">
                                <ShieldCheck className="h-3 w-3" />
                                Nominee on Assets
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#71808C] bg-[#F5F3ED] px-2 py-0.5 rounded-full border border-[#DDD7CA]">
                                Legal Heir Only
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-[#71808C] font-mono flex items-center gap-2 flex-wrap">
                            <span>
                              PAN: {h.pan.length >= 10 ? `${h.pan.slice(0, 5)}••••${h.pan.slice(-1)}` : h.pan}
                            </span>
                            {h.mobile && (
                              <>
                                <span className="text-[#DDD7CA]">·</span>
                                <span className="text-[#101D2B] font-medium">
                                  {h.mobile.length >= 10 ? `${h.mobile.slice(0, 3)}••••${h.mobile.slice(-3)}` : h.mobile}
                                </span>
                              </>
                            )}
                            {h.email && (
                              <>
                                <span className="text-[#DDD7CA] hidden sm:inline">·</span>
                                <span className="hidden sm:inline text-[#71808C] font-sans">{h.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Share & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-bold text-[#101D2B] tabular-nums">
                            {h.share}%
                          </div>
                          <div className="text-[10px] text-[#71808C] uppercase font-mono font-semibold">
                            Intended Share
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isEditing) {
                              setEditingHeirId(null);
                            } else {
                              setEditingHeirId(h.id);
                              setEditShare(Number(h.share) || 0);
                            }
                          }}
                          className="p-2 rounded-full text-[#71808C] hover:text-[#101D2B] hover:bg-[#F5F3ED] transition cursor-pointer"
                          title={`Edit share for ${h.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => remove(h.id, h.name)}
                          className="p-2 rounded-full text-[#71808C] hover:text-[#C45D5D] hover:bg-[#C45D5D]/10 transition cursor-pointer"
                          aria-label={`Remove ${h.name}`}
                          title={`Remove ${h.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Share Adjuster (When in edit mode) */}
                    <AnimatePresence>
                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-3 border-t border-[#DDD7CA] flex flex-wrap items-center justify-between gap-3 bg-[#F5F3ED] p-3 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-[#101D2B]">Adjust Share %:</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={editShare}
                              onChange={(e) => setEditShare(Number(e.target.value))}
                              className="w-20 px-2 py-1 text-xs rounded-full border border-[#DDD7CA] bg-white text-center font-bold font-mono"
                            />
                            <span className="text-[11px] text-[#71808C]">
                              (Preview total: {totalShare - Number(h.share) + editShare}%)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingHeirId(null)}
                              className="rounded-full text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              loading={editBusy}
                              onClick={() => handleUpdateShare(h.id)}
                              className="rounded-full text-xs px-4 bg-[#101D2B] text-white hover:bg-[#1C3041]"
                            >
                              Save Share
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>

          {/* Nominee Coverage Audit Notice */}
          <div className="rounded-2xl border border-[#DDD7CA] bg-[#F5F3ED]/70 p-5 space-y-2 text-xs shadow-xs">
            <div className="flex items-center gap-2 font-bold text-[#101D2B]">
              <HelpCircle className="h-4 w-4 text-[#C58B3C]" />
              <span>Statutory Rule: Nominee vs. Legal Heir Law</span>
            </div>
            <p className="text-[#71808C] leading-relaxed">
              Under Supreme Court precedents and the Indian Succession Act 1925, a <strong>nominee acts purely as a statutory trustee</strong> to receive funds from the institution. The beneficial ownership and final distribution remains strictly governed by <strong>Class-I legal heirs</strong> or the deceased depositor's will.
            </p>
            {unassignedHoldings.length > 0 && (
              <div className="pt-2 flex items-center justify-between border-t border-[#DDD7CA] text-[#C45D5D] font-semibold">
                <span>{unassignedHoldings.length} assets require nominee remediation</span>
                <button
                  type="button"
                  onClick={() => nav('/app/alerts')}
                  className="text-xs text-[#101D2B] underline hover:text-[#1C3041] cursor-pointer"
                >
                  Review in Alerts &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Legal Heir Form with Physical Rotary Dial */}
        <div className="rounded-2xl border border-[#DDD7CA] bg-white p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDD7CA]">
            <UserPlus className="h-4 w-4 text-[#101D2B]" />
            <h2 className="text-sm font-bold text-[#101D2B]">
              Register Class-I Legal Heir
            </h2>
          </div>

          <form onSubmit={add} className="space-y-4 text-xs">
            <Field label="Full Legal Name (as on PAN)">
              <Input
                required
                placeholder="e.g. Meenakshi Sundaram"
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                className="rounded-full border-[#DDD7CA] text-xs"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Statutory Relationship">
                <Select
                  value={f.relation}
                  onChange={(e) => setF({ ...f, relation: e.target.value })}
                  className="rounded-full border-[#DDD7CA] text-xs bg-white"
                >
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="PAN (10 Characters)">
                <Input
                  required
                  maxLength={10}
                  value={f.pan}
                  onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="rounded-full border-[#DDD7CA] text-xs font-mono uppercase"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Mobile Number">
                <Input
                  placeholder="10-digit mobile"
                  value={f.mobile}
                  onChange={(e) => setF({ ...f, mobile: e.target.value })}
                  className="rounded-full border-[#DDD7CA] text-xs font-mono"
                />
              </Field>

              <Field label="Email Address (Optional)">
                <Input
                  type="email"
                  placeholder="heir@example.com"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                  className="rounded-full border-[#DDD7CA] text-xs"
                />
              </Field>
            </div>

            {/* Rotary Knob Share Control */}
            <div className="pt-2 pb-2 flex flex-col items-center justify-center bg-[#F5F3ED] rounded-2xl p-4 border border-[#DDD7CA]">
              <div className="text-[11px] font-bold text-[#101D2B] mb-2 uppercase tracking-wider">
                Intended Estate Share Percentage
              </div>
              <DetentDial
                label="Allocated share"
                min={0}
                max={100}
                step={5}
                defaultValue={50}
                size={144}
                value={f.share}
                onValueChange={(v) => setF({ ...f, share: v })}
                formatValue={(v) => `${v}%`}
              />
              <div className="mt-2 text-center">
                <div className="text-xs font-bold text-[#101D2B]">
                  {f.share}% Entitlement
                </div>
                <span className="text-[11px] text-[#71808C]">
                  Projected total: <span className="font-mono font-semibold">{totalShare + Number(f.share)}%</span> of 100%
                </span>
              </div>
            </div>

            <ErrorNote msg={err} />

            <Button
              className="w-full py-2.5 rounded-full bg-[#101D2B] hover:bg-[#1C3041] text-white font-semibold shadow-xs"
              loading={busy}
              disabled={busy}
            >
              Add Legal Heir
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
