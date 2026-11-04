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
      {/* STEP 2 & 3 — Header & State Selector */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            AI SUCCESSION NAVIGATOR
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            AI Succession Guide
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Understand the steps to settle an estate.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Jurisdiction:
          </span>
          <Select
            className="w-44 py-1.5 text-xs font-medium"
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
