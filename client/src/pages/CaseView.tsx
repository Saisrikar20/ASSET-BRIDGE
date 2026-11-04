import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, type Case, type Task } from '../lib/api';
import { useLive } from '../lib/live';
import { ErrorNote } from '../components/ui';
import CaseBody from '../components/CaseBody';

export default function CaseView() {
  const { id } = useParams();
  const [c, setC] = useState<Case | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    api<{ case: Case }>(`/cases/${id}`)
      .then((r) => setC(r.case))
      .catch((e) => setErr(e.message));

  useEffect(() => void load(), [id]);
  useLive((e) => e.type === 'case_update' && e.data.id === id && load());

  const toggle = async (t: Task) => {
    const r = await api<{ case: Case }>(`/cases/${id}/tasks/${t.id}`, {
      method: 'PATCH',
      body: { done: !t.done },
    });
    setC(r.case);
  };

  return (
    <div className="space-y-4">
      <Link
        to="/app/cases"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to all cases
      </Link>
      <ErrorNote msg={err} />
      {c && <CaseBody c={c} onToggle={toggle} />}
    </div>
  );
}
