import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AssetClass, ForecastPoint } from '../lib/api';
import { CLASS_COLOR, CLASS_ORDER, inr, inrShort } from '../lib/format';

const H = 300;
const PAD = { top: 12, right: 16, bottom: 32, left: 64 };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => n <= s) ?? 10) * p;
}

/** Stacked area of projected wealth by asset class, with a crosshair tooltip and an invested-amount line. */
export default function ForecastChart({ points, labels, real, inflation, age }: { points: ForecastPoint[]; labels: Record<string, string>; real: boolean; inflation: number; age: number | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setW(Math.max(320, el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Deflate everything to today's rupees when "real" is on.
  const rows = useMemo(
    () =>
      points.map((p) => {
        const d = real ? Math.pow(1 + inflation / 100, p.year) : 1;
        const by = Object.fromEntries(CLASS_ORDER.map((k) => [k, p.byClass[k] / d])) as Record<AssetClass, number>;
        return { year: p.year, by, total: p.total / d, contributed: p.contributed / d };
      }),
    [points, real, inflation],
  );

  const active = CLASS_ORDER.filter((k) => rows.some((r) => r.by[k] > 0));
  const iw = w - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const yMax = niceMax(Math.max(...rows.map((r) => Math.max(r.total, r.contributed))));
  const x = (i: number) => PAD.left + (rows.length > 1 ? (i / (rows.length - 1)) * iw : 0);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  // Cumulative stacks bottom → top in fixed class order.
  const stacks = useMemo(() => {
    const acc = rows.map(() => 0);
    return active.map((k) => {
      const lower = [...acc];
      rows.forEach((r, i) => (acc[i] += r.by[k]));
      return { k, lower, upper: [...acc] };
    });
  }, [rows, active.join()]);

  const area = (lower: number[], upper: number[]) =>
    `M${upper.map((v, i) => `${x(i)},${y(v)}`).join('L')}L${lower.map((v, i) => `${x(i)},${y(v)}`).reverse().join('L')}Z`;
  const line = (vals: number[]) => `M${vals.map((v, i) => `${x(i)},${y(v)}`).join('L')}`;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const step = Math.max(1, Math.ceil(rows.length / 8));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (rows.length - 1));
    setHover(Math.max(0, Math.min(rows.length - 1, i)));
  };

  const hv = hover != null ? rows[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {active.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CLASS_COLOR[k] }} />
            {labels[k]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="#0b1f2a" strokeWidth="2" strokeDasharray="4 3" /></svg>
          Amount invested
        </span>
      </div>
      <div ref={wrap} className="relative">
        <svg width={w} height={H} role="img" aria-label="Projected wealth by asset class">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px]">{inrShort(t).replace('.00', '')}</text>
            </g>
          ))}
          {rows.map((r, i) =>
            i % step === 0 || i === rows.length - 1 ? (
              <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {r.year === 0 ? 'Now' : age != null ? `${age + r.year}y` : `+${r.year}`}
              </text>
            ) : null,
          )}
          {stacks.map(({ k, lower, upper }) => (
            <path key={k} d={area(lower, upper)} fill={CLASS_COLOR[k]} fillOpacity={0.85} stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
          ))}
          <path d={line(rows.map((r) => r.contributed))} fill="none" stroke="#0b1f2a" strokeWidth={2} strokeDasharray="5 4" />
          {hv && hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="#0b1f2a" strokeOpacity={0.35} strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hv.total)} r={4} fill="#0b1f2a" stroke="#fff" strokeWidth={2} />
            </g>
          )}
          <rect x={PAD.left} y={PAD.top} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
        {hv && hover != null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-56 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(0, x(hover) + 12), w - 232) }}
          >
            <div className="mb-1.5 font-semibold text-ink">
              {hv.year === 0 ? 'Today' : `Year ${hv.year}`}{age != null && ` · age ${age + hv.year}`}
            </div>
            {[...active].reverse().map((k) => (
              <div key={k} className="flex items-center justify-between gap-2 py-0.5">
                <span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-sm" style={{ background: CLASS_COLOR[k] }} />{labels[k]}</span>
                <span className="font-medium text-ink">{inrShort(hv.by[k])}</span>
              </div>
            ))}
            <div className="mt-1.5 flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-ink"><span>Total</span><span>{inr(hv.total)}</span></div>
            <div className="flex justify-between text-slate-500"><span>Invested</span><span>{inrShort(hv.contributed)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
