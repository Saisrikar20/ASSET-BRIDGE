import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { PageHeader, Select } from '../components/ui';
import GuideChat from '../components/GuideChat';

export default function Guide() {
  const { user, meta } = useAuth();
  const [state, setState] = useState(user?.identity?.state || 'Tamil Nadu');
  return (
    <>
      <PageHeader
        title="AI succession guide"
        subtitle="Plain-language answers on claiming deposits, EPF, insurance, LIC and mutual funds — grounded in state-specific legal requirements, with sources."
        action={<Select className="w-48" value={state} onChange={(e) => setState(e.target.value)}>{meta?.states.map((s) => <option key={s}>{s}</option>)}</Select>}
      />
      <GuideChat key={state} state={state} />
    </>
  );
}
