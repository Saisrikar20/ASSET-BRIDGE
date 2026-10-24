import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, type Case, type Task } from '../lib/api';
import { useLive } from '../lib/live';
import { date } from '../lib/format';
import { ErrorNote, PageHeader } from '../components/ui';
import CaseBody from '../components/CaseBody';

export default function CaseView() {
  const { id } = useParams();
  const [c, setC] = useState<Case | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => api<{ case: Case }>(`/cases/${id}`).then((r) => setC(r.case)).catch((e) => setErr(e.message));
  useEffect(() => void load(), [id]);
  useLive((e) => e.type === 'case_update' && e.data.id === id && load());

  const toggle = async (t: Task) => {
    const r = await api<{ case: Case }>(`/cases/${id}/tasks/${t.id}`, { method: 'PATCH', body: { done: !t.done } });
    setC(r.case);
  };

  return (
    <>
      <Link to="/app/cases" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-ink"><ArrowLeft className="h-4 w-4" /> All cases</Link>
      <ErrorNote msg={err} />
      {c && (
        <>
          <PageHeader step={`Step 05 · Transfer · ${c.id}`} title={`Estate of ${c.deceasedName}`} subtitle={`Died ${date(c.deceased.dateOfDeath)} · CRS ${c.deceased.registrationNo}`} />
          <CaseBody c={c} onToggle={toggle} />
        </>
      )}
    </>
  );
}
