// Charts for the life plan: Monte Carlo fan, cash-flow Sankey, legacy line and progress vs baseline.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { LifeResult, LifeRow, Milestone, Progress } from '../lib/api';
import { date, inr, inrShort } from '../lib/format';

const INK = '#0b1f2a';
const GRID = '#e2e8f0';
const BLUE = '#2a78d6';

function useWidth(min = 320) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.max(min, el.getBoundingClientRect().width)); // measure before first paint
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find((s) => v / p <= s) ?? 10) * p;
}
const short = (v: number) => inrShort(v).replace('.00', '');

function Tooltip({ x, w, children }: { x: number; w: number; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute top-2 z-10 w-56 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg" style={{ left: Math.min(Math.max(0, x + 12), w - 232) }}>
      {children}
    </div>
  );
}
const Row = ({ k, v, swatch, strong }: { k: string; v: string; swatch?: string; strong?: boolean }) => (
  <div className={`flex items-center justify-between gap-2 py-0.5 ${strong ? 'font-semibold text-ink' : ''}`}>
    <span className="flex items-center gap-1.5 text-slate-600">{swatch && <span className="h-2 w-2 rounded-sm" style={{ background: swatch }} />}{k}</span>
    <span className="font-medium text-ink">{v}</span>
  </div>
);

// ---------------- Monte Carlo fan chart ----------------
export function FanChart({ result, milestones, retireAge, real, onPick }: { result: LifeResult; milestones: Milestone[]; retireAge: number; real: boolean; onPick?: (age: number) => void }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = 320;
  const P = { t: 16, r: 16, b: 34, l: 64 };
  const defl = (i: number) => (real ? result.rows[i]?.price || 1 : 1);
  const bands = result.bands.map((b, i) => ({ ...b, p10: b.p10 / defl(i), p25: b.p25 / defl(i), p50: b.p50 / defl(i), p75: b.p75 / defl(i), p90: b.p90 / defl(i) }));
  const n = bands.length;
  const iw = w - P.l - P.r;
  const ih = H - P.t - P.b;
  const yMax = niceMax(Math.max(...bands.map((b) => b.p90)));
  const x = (i: number) => P.l + (n > 1 ? (i / (n - 1)) * iw : 0);
  const y = (v: number) => P.t + ih - (Math.min(v, yMax) / yMax) * ih;
  const area = (lo: number[], hi: number[]) => `M${hi.map((v, i) => `${x(i)},${y(v)}`).join('L')}L${lo.map((v, i) => `${x(i)},${y(v)}`).reverse().join('L')}Z`;
  const line = (vals: number[]) => `M${vals.map((v, i) => `${x(i)},${y(v)}`).join('L')}`;
  const ageIdx = (age: number) => bands.findIndex((b) => b.age === age);
  const ri = ageIdx(retireAge);
  const hv = hover != null ? bands[hover] : null;
  const step = Math.max(1, Math.ceil(n / 9));
  const msAt = (age: number) => milestones.filter((m) => (m.every ? age >= m.age && age <= (m.until ?? 200) && (age - m.age) % m.every === 0 : m.age === age));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: BLUE, opacity: 0.18 }} />10th–90th percentile</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: BLUE, opacity: 0.35 }} />25th–75th</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: BLUE }} />Median of {result.runs.toLocaleString('en-IN')} simulations</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-amber-500" />Milestone</span>
      </div>
      <div ref={ref} className="relative">
        <svg width={w} height={H} role="img" aria-label="Range of projected net worth by age">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={P.l} x2={w - P.r} y1={y(f * yMax)} y2={y(f * yMax)} stroke={GRID} />
              <text x={P.l - 8} y={y(f * yMax)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px]">{short(f * yMax)}</text>
            </g>
          ))}
          {bands.map((b, i) => (i % step === 0 || i === n - 1 ? <text key={b.age} x={x(i)} y={H - 12} textAnchor="middle" className="fill-slate-500 text-[11px]">{b.age}</text> : null))}
          {ri > 0 && (
            <g>
              <rect x={x(ri)} y={P.t} width={x(n - 1) - x(ri)} height={ih} fill="#f1f5f9" />
              <text x={x(ri) + 6} y={P.t + 12} className="fill-slate-500 text-[11px] font-semibold">Retired</text>
            </g>
          )}
          <path d={area(bands.map((b) => b.p10), bands.map((b) => b.p90))} fill={BLUE} fillOpacity={0.18} />
          <path d={area(bands.map((b) => b.p25), bands.map((b) => b.p75))} fill={BLUE} fillOpacity={0.3} />
          <path d={line(bands.map((b) => b.p50))} fill="none" stroke={BLUE} strokeWidth={2} />
          <line x1={P.l} x2={w - P.r} y1={y(0)} y2={y(0)} stroke={INK} strokeOpacity={0.4} />
          {bands.map((b, i) =>
            msAt(b.age).length ? <rect key={`m${b.age}`} x={x(i) - 4} y={y(0) - 4} width={8} height={8} transform={`rotate(45 ${x(i)} ${y(0)})`} fill="#eda100" stroke="#fff" strokeWidth={1.5} /> : null,
          )}
          {hv && hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={P.t + ih} stroke={INK} strokeOpacity={0.35} />
              <circle cx={x(hover)} cy={y(hv.p50)} r={4} fill={BLUE} stroke="#fff" strokeWidth={2} />
            </g>
          )}
          <rect
            x={P.l} y={P.t} width={iw} height={ih} fill="transparent" className={onPick ? 'cursor-pointer' : ''}
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))); }}
            onMouseLeave={() => setHover(null)}
            onClick={() => hover != null && onPick?.(bands[hover].age)}
          />
        </svg>
        {hv && hover != null && (
          <Tooltip x={x(hover)} w={w}>
            <div className="mb-1 font-semibold text-ink">Age {hv.age}{real && ' · today’s ₹'}</div>
            <Row k="Great markets (90th)" v={short(hv.p90)} />
            <Row k="Median" v={short(hv.p50)} strong />
            <Row k="Poor markets (10th)" v={short(hv.p10)} />
            {msAt(hv.age).map((m) => <div key={m.id} className="mt-1 text-amber-700">◆ {m.name}</div>)}
            {onPick && <div className="mt-1.5 text-slate-400">Click to inspect this year</div>}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------------- Cash-flow Sankey ----------------
const FLOW_COLOR = { income: '#0d9488', withdraw: '#64748b', unfunded: '#e34948', tax: '#94a3b8', expense: '#eb6834', milestone: '#eda100', contribution: '#2a78d6', surplus: '#1baf7a' };
type Node = { name: string; value: number; color: string };

export function Sankey({ row }: { row: LifeRow }) {
  const [ref, w] = useWidth(340);
  const [hover, setHover] = useState<string | null>(null);
  const left: Node[] = [
    ...row.income.filter((f) => f.value > 0).map((f) => ({ name: f.name, value: f.value, color: FLOW_COLOR.income })),
    ...(row.withdrawals > 0 ? [{ name: 'Withdrawn from portfolio', value: row.withdrawals, color: FLOW_COLOR.withdraw }] : []),
    ...(row.shortfall > 0 ? [{ name: 'Unfunded (shortfall)', value: row.shortfall, color: FLOW_COLOR.unfunded }] : []),
  ];
  const right: Node[] = [
    ...(row.tax > 0 ? [{ name: 'Income tax', value: row.tax, color: FLOW_COLOR.tax }] : []),
    ...row.expenses.filter((f) => f.value > 0).map((f) => ({ name: f.name, value: f.value, color: FLOW_COLOR.expense })),
    ...row.milestones.map((f) => ({ name: f.name, value: f.value, color: FLOW_COLOR.milestone })),
    ...row.contributions.filter((f) => f.value > 0).map((f) => ({ name: `Invest · ${f.name}`, value: f.value, color: FLOW_COLOR.contribution })),
    ...(row.surplus > 0 ? [{ name: 'Surplus invested', value: row.surplus, color: FLOW_COLOR.surplus }] : []),
  ];
  const total = Math.max(left.reduce((s, n) => s + n.value, 0), right.reduce((s, n) => s + n.value, 0), 1);
  const gap = 10;
  const H = Math.max(260, Math.max(left.length, right.length) * 34 + 20);
  const labelW = Math.min(170, w * 0.28);
  const nodeW = 12;
  const xL = labelW;
  const xM = w / 2 - nodeW / 2;
  const xR = w - labelW - nodeW;
  const scale = (H - gap * (Math.max(left.length, right.length) - 1) - 8) / total;

  const lay = (nodes: Node[]) => {
    const used = nodes.reduce((s, n) => s + n.value * scale, 0) + gap * (nodes.length - 1);
    let yy = (H - used) / 2;
    return nodes.map((n) => { const h = Math.max(2, n.value * scale); const o = { ...n, y: yy, h }; yy += h + gap; return o; });
  };
  const L = lay(left);
  const R = lay(right);
  // Label positions: node centres, pushed apart so two-line labels never overlap.
  const spread = (nodes: { y: number; h: number }[]) => {
    const ys = nodes.map((n) => n.y + n.h / 2);
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + 28);
    const over = (ys.at(-1) ?? 0) - (H - 14);
    if (over > 0) for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i] - over, i < ys.length - 1 ? ys[i + 1] - 28 : Infinity);
    return ys;
  };
  const LY = spread(L);
  const RY = spread(R);
  const midH = total * scale;
  const midY = (H - midH) / 2;

  const band = (x0: number, y0: number, x1: number, y1: number, h: number) => {
    const c = (x0 + x1) / 2;
    return `M${x0},${y0}C${c},${y0} ${c},${y1} ${x1},${y1}L${x1},${y1 + h}C${c},${y1 + h} ${c},${y0 + h} ${x0},${y0 + h}Z`;
  };
  let inY = midY;
  let outY = midY;

  return (
    <div ref={ref}>
      <svg width={w} height={H} role="img" aria-label={`Cash flow at age ${row.age}`}>
        {L.map((n) => { const p = band(xL + nodeW, n.y, xM, inY, n.h); inY += n.h; return <path key={`l${n.name}`} d={p} fill={n.color} fillOpacity={hover && hover !== n.name ? 0.12 : 0.3} onMouseEnter={() => setHover(n.name)} onMouseLeave={() => setHover(null)} />; })}
        {R.map((n) => { const p = band(xM + nodeW, outY, xR, n.y, n.h); outY += n.h; return <path key={`r${n.name}`} d={p} fill={n.color} fillOpacity={hover && hover !== n.name ? 0.12 : 0.3} onMouseEnter={() => setHover(n.name)} onMouseLeave={() => setHover(null)} />; })}
        {L.map((n) => <rect key={`ln${n.name}`} x={xL} y={n.y} width={nodeW} height={n.h} rx={2} fill={n.color} />)}
        <rect x={xM} y={midY} width={nodeW} height={midH} rx={2} fill={INK} />
        {R.map((n) => <rect key={`rn${n.name}`} x={xR} y={n.y} width={nodeW} height={n.h} rx={2} fill={n.color} />)}
        {L.map((n, i) => (
          <text key={`lt${n.name}`} x={xL - 8} y={LY[i]} textAnchor="end" className="text-[11px]">
            <tspan x={xL - 8} dy="-0.2em" className="fill-ink font-medium">{n.name.length > 22 ? n.name.slice(0, 21) + '…' : n.name}</tspan>
            <tspan x={xL - 8} dy="1.2em" className="fill-slate-500">{short(n.value)}</tspan>
          </text>
        ))}
        {R.map((n, i) => (
          <text key={`rt${n.name}`} x={xR + nodeW + 8} y={RY[i]} className="text-[11px]">
            <tspan x={xR + nodeW + 8} dy="-0.2em" className="fill-ink font-medium">{n.name.length > 22 ? n.name.slice(0, 21) + '…' : n.name}</tspan>
            <tspan x={xR + nodeW + 8} dy="1.2em" className="fill-slate-500">{short(n.value)} · {Math.round((n.value / total) * 100)}%</tspan>
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {[['Income', 'income'], ['Portfolio withdrawal', 'withdraw'], ['Tax', 'tax'], ['Expenses', 'expense'], ['Milestones', 'milestone'], ['Contributions', 'contribution'], ['Surplus', 'surplus']].map(([l, k]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FLOW_COLOR[k as keyof typeof FLOW_COLOR] }} />{l}</span>
        ))}
      </div>
    </div>
  );
}

// ---------------- Legacy line ----------------
export function LegacyChart({ rows, real, selected, onPick }: { rows: LifeRow[]; real: boolean; selected: number; onPick: (age: number) => void }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = 240;
  const P = { t: 12, r: 16, b: 30, l: 64 };
  const d = (r: LifeRow) => (real ? r.price : 1);
  const n = rows.length;
  const iw = w - P.l - P.r;
  const ih = H - P.t - P.b;
  const yMax = niceMax(Math.max(...rows.map((r) => r.legacy / d(r))));
  const x = (i: number) => P.l + (n > 1 ? (i / (n - 1)) * iw : 0);
  const y = (v: number) => P.t + ih - (v / yMax) * ih;
  const path = (f: (r: LifeRow) => number) => `M${rows.map((r, i) => `${x(i)},${y(f(r) / d(r))}`).join('L')}`;
  const si = rows.findIndex((r) => r.age === selected);
  const hv = hover != null ? rows[hover] : null;
  const step = Math.max(1, Math.ceil(n / 9));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: '#1baf7a' }} />Estate incl. insurance payouts</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: BLUE }} />Investments only</span>
      </div>
      <div ref={ref} className="relative">
        <svg width={w} height={H} role="img" aria-label="What the family would inherit by age">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={P.l} x2={w - P.r} y1={y(f * yMax)} y2={y(f * yMax)} stroke={GRID} />
              <text x={P.l - 8} y={y(f * yMax)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px]">{short(f * yMax)}</text>
            </g>
          ))}
          {rows.map((r, i) => (i % step === 0 || i === n - 1 ? <text key={r.age} x={x(i)} y={H - 10} textAnchor="middle" className="fill-slate-500 text-[11px]">{r.age}</text> : null))}
          <path d={path((r) => r.legacy)} fill="none" stroke="#1baf7a" strokeWidth={2} />
          <path d={path((r) => r.netWorth)} fill="none" stroke={BLUE} strokeWidth={2} />
          {si >= 0 && <line x1={x(si)} x2={x(si)} y1={P.t} y2={P.t + ih} stroke={INK} strokeWidth={1.5} strokeDasharray="4 3" />}
          {si >= 0 && <circle cx={x(si)} cy={y(rows[si].legacy / d(rows[si]))} r={5} fill="#1baf7a" stroke="#fff" strokeWidth={2} />}
          <rect x={P.l} y={P.t} width={iw} height={ih} fill="transparent" className="cursor-pointer"
            onMouseMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - b.left) / b.width) * (n - 1))))); }}
            onMouseLeave={() => setHover(null)} onClick={() => hover != null && onPick(rows[hover].age)} />
        </svg>
        {hv && hover != null && (
          <Tooltip x={x(hover)} w={w}>
            <div className="mb-1 font-semibold text-ink">If at age {hv.age}</div>
            <Row k="Investments" v={short(hv.netWorth / d(hv))} swatch={BLUE} />
            <Row k="Insurance payouts" v={short(hv.cover / d(hv))} />
            <Row k="Family receives" v={short(hv.legacy / d(hv))} swatch="#1baf7a" strong />
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------------- Progress vs baseline ----------------
export function ProgressChart({ progress }: { progress: Progress }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const H = 260;
  const P = { t: 12, r: 16, b: 30, l: 64 };
  const snaps = progress.snapshots;
  const base = progress.baseline?.points || [];
  if (!snaps.length) return <div ref={ref} className="py-10 text-center text-sm text-slate-500">No snapshots yet — record one to start tracking.</div>;
  const t0 = new Date(Math.min(new Date(snaps[0].date).getTime(), base[0] ? new Date(base[0].date).getTime() : Infinity)).getTime();
  const t1 = Math.max(new Date(snaps.at(-1)!.date).getTime() + 90 * 864e5, t0 + 180 * 864e5);
  const baseAt = (t: number) => {
    for (let i = 1; i < base.length; i++) {
      const a = new Date(base[i - 1].date).getTime();
      const b = new Date(base[i].date).getTime();
      if (t >= a && t <= b) return base[i - 1].value + ((base[i].value - base[i - 1].value) * (t - a)) / (b - a);
    }
    return null;
  };
  const baseLine = Array.from({ length: 40 }, (_, i) => t0 + ((t1 - t0) * i) / 39).map((t) => ({ t, v: baseAt(t) })).filter((p) => p.v != null) as { t: number; v: number }[];
  const vals = [...snaps.map((s) => s.netWorth), ...baseLine.map((p) => p.v)];
  const lo = Math.min(...vals) * 0.95;
  const hi = Math.max(...vals) * 1.03;
  const iw = w - P.l - P.r;
  const ih = H - P.t - P.b;
  const x = (t: number) => P.l + ((t - t0) / (t1 - t0)) * iw;
  const y = (v: number) => P.t + ih - ((v - lo) / (hi - lo)) * ih;
  const pts = snaps.map((s) => ({ t: new Date(s.date).getTime(), v: s.netWorth, s }));
  const hv = hover != null ? pts[hover] : null;
  const months = Array.from({ length: 7 }, (_, i) => t0 + ((t1 - t0) * i) / 6);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke={INK} strokeWidth="2" strokeDasharray="4 3" /></svg>Baseline projection</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: BLUE }} />Actual net worth</span>
      </div>
      <div ref={ref} className="relative">
        <svg width={w} height={H} role="img" aria-label="Actual net worth against the baseline projection">
          {[0, 0.5, 1].map((f) => { const v = lo + (hi - lo) * f; return (
            <g key={f}><line x1={P.l} x2={w - P.r} y1={y(v)} y2={y(v)} stroke={GRID} /><text x={P.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px]">{short(v)}</text></g>
          ); })}
          {months.map((t) => <text key={t} x={x(t)} y={H - 10} textAnchor="middle" className="fill-slate-500 text-[11px]">{new Date(t).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</text>)}
          {baseLine.length > 1 && <path d={`M${baseLine.map((p) => `${x(p.t)},${y(p.v)}`).join('L')}`} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="5 4" />}
          <path d={`M${pts.map((p) => `${x(p.t)},${y(p.v)}`).join('L')}`} fill="none" stroke={BLUE} strokeWidth={2} />
          {pts.map((p, i) => <circle key={p.s.id} cx={x(p.t)} cy={y(p.v)} r={hover === i ? 6 : 4} fill={BLUE} stroke="#fff" strokeWidth={2} />)}
          {pts.map((p, i) => <rect key={`h${p.s.id}`} x={x(p.t) - 12} y={P.t} width={24} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
        </svg>
        {hv && hover != null && (
          <Tooltip x={x(hv.t)} w={w}>
            <div className="mb-1 font-semibold text-ink">{date(hv.s.date)}</div>
            <Row k="Actual" v={inr(hv.v)} swatch={BLUE} strong />
            {baseAt(hv.t) != null && <Row k="Baseline" v={inr(baseAt(hv.t)!)} />}
            {baseAt(hv.t) != null && <Row k="Difference" v={`${hv.v >= baseAt(hv.t)! ? '+' : '−'}${short(Math.abs(hv.v - baseAt(hv.t)!))}`} />}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export const progressGap = (p: Progress) => {
  const base = p.baseline?.points || [];
  const last = p.snapshots.at(-1);
  if (!last || base.length < 2) return null;
  const t = new Date(last.date).getTime();
  for (let i = 1; i < base.length; i++) {
    const a = new Date(base[i - 1].date).getTime();
    const b = new Date(base[i].date).getTime();
    if (t >= a && t <= b) {
      const v = base[i - 1].value + ((base[i].value - base[i - 1].value) * (t - a)) / (b - a);
      return { actual: last.netWorth, expected: v, diff: last.netWorth - v };
    }
  }
  return null;
};
