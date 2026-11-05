import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { api } from '../lib/api';
import { date } from '../lib/format';
import { Button, Card, Empty, PageHeader, Progress } from '../components/ui';

interface CaseRow { id: string; deceasedName: string; createdAt: string; progress: number }

export default function Cases() {
  const [cases, setCases] = useState<CaseRow[] | null>(null);
  useEffect(() => void api<{ cases: CaseRow[] }>('/cases').then((r) => setCases(r.cases)), []);

  return (
    <>
      <PageHeader step="Transfer" title="Estate cases" subtitle="Every case breaks succession into concrete steps — per holding, per regulator, for the right state." />
      {cases && cases.length === 0 && (
        <Empty icon={<FileCheck2 />} title="No estate cases" body="A case opens automatically when a death registration matches a twin. You can simulate one on the Reunite step." action={<Link to="/app/reunite"><Button>Go to Reunite</Button></Link>} />
      )}
      <div className="space-y-3">
        {cases?.map((c) => (
          <Link key={c.id} to={`/app/cases/${c.id}`}>
            <Card className="flex items-center gap-4 p-5 transition hover:border-brand-500">
              <div className="font-mono text-lg font-bold text-ink">{c.id}</div>
              <div className="flex-1">
                <div className="font-medium text-ink">Estate of {c.deceasedName}</div>
                <div className="text-xs text-slate-500">Opened {date(c.createdAt)}</div>
              </div>
              <div className="w-40">
                <div className="mb-1 text-right text-xs font-semibold text-slate-600">{Math.round(c.progress * 100)}% done</div>
                <Progress value={c.progress} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
