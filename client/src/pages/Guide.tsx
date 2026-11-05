import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Select } from '../components/ui';
import GuideChat from '../components/GuideChat';

const ALL_STATES = [
  'Tamil Nadu',
  'Kerala',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Delhi',
  'Uttar Pradesh',
  'West Bengal',
  'Gujarat',
];

export default function Guide() {
  const { user, meta } = useAuth();
  const [state, setState] = useState(user?.identity?.state || 'Tamil Nadu');
  const statesList = meta?.states?.length ? meta.states : ALL_STATES;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header & State Selector */}
      <div className="pb-3 border-b border-[#DDD7CA] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] font-bold tracking-wider text-[#71808C] uppercase">
            STATUTORY INTELLIGENCE
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#17232E]">
            AI Succession Navigator
          </h1>
          <p className="mt-0.5 text-xs text-[#71808C]">
            Statutory succession guidance, regulatory circulars, and document analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#71808C] font-semibold whitespace-nowrap">
            Jurisdiction:
          </span>
          <Select
            className="w-44 py-1.5 text-xs font-semibold rounded-full border-[#DDD7CA] bg-white text-[#17232E]"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {statesList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <GuideChat key={state} state={state} />
    </div>
  );
}
