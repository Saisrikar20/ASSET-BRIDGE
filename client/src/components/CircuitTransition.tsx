// Home → dashboard: a circuit board. Traces draw from the family's money
// sources (banks, EPF/NPS, insurance) through Verify and Nominees into the
// twin, glowing pulses run along them and each node lights as one arrives.
// Ported from the LedgerLens intro transition and re-themed for Asset Bridge.
import { useEffect, useRef } from 'react';
import { cx } from './ui';

// Lucide-style 24×24 icon paths.
const ICONS: Record<string, string> = {
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  epf: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  verify: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  heirs: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
};

// [x, y, label, icon]; the twin node draws the Asset Bridge mark instead of an icon.
const NODES: Record<string, [number, number, string, string]> = {
  B: [90, 70, 'Banks', 'bank'],
  E: [90, 170, 'EPF · NPS', 'epf'],
  I: [90, 270, 'Insurance', 'shield'],
  V: [330, 100, 'Verify', 'verify'],
  N: [330, 240, 'Nominees', 'heirs'],
  T: [570, 170, 'Your twin', 'twin'],
};
// Right-angled traces, grouped by the stage in which their pulse fires.
const STAGES: [string, string][][] = [
  [['B', 'M110,70 H170 V170 H210'], ['E', 'M110,170 H210'], ['I', 'M110,270 H170 V170 H210']],
  [['V', 'M210,170 V100 H310'], ['N', 'M210,170 V240 H310']],
  [['T', 'M350,100 H450 V170 H545'], ['T', 'M350,240 H450 V170 H545']],
];
const STEP = 420;
/** Total run before the destination should be shown underneath. */
export const CIRCUIT_MS = 200 + STAGES.length * STEP + 260;

const MARK = `
  <linearGradient id="cbG" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1e3a8a"/><stop offset=".45" stop-color="#2563eb"/><stop offset="1" stop-color="#5eead4"/></linearGradient>
  <linearGradient id="cbW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d4ed8"/><stop offset=".6" stop-color="#3b82f6"/><stop offset="1" stop-color="#67e8f9"/></linearGradient>
  <linearGradient id="cbK" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2b25a"/><stop offset="1" stop-color="#b8862e"/></linearGradient>`;
const MARK_BODY = `
  <path d="M5 40C7 31 14 25.5 24.5 24L27 28C18.5 29.5 13.8 33.5 12.4 40Z" fill="url(#cbG)"/>
  <path d="M41 27L49 40H42.5L36.5 29.5Z" fill="#2fb5c9"/>
  <path d="M22 23C28 19 35 17 42 17C44.5 13.8 48.5 12.6 52 14L57 14.4L53.3 16.4C52 23 45.5 28.6 36 28.6C29.5 28.6 25 26.5 22 23Z" fill="url(#cbG)"/>
  <path d="M35 19.5C31 11.5 23 5.5 11 3.5C14.5 8.5 16.5 13.5 17.5 20.5C23 19 29 18.6 35 19.5Z" fill="url(#cbW)"/>
  <path d="M40 22.9C38.2 21.4 36.4 19.9 36.4 18.2C36.4 16.9 37.4 16 38.5 16C39.2 16 39.7 16.4 40 16.9C40.3 16.4 40.8 16 41.5 16C42.6 16 43.6 16.9 43.6 18.2C43.6 19.9 41.8 21.4 40 22.9Z" fill="none" stroke="url(#cbK)" stroke-width="1.6"/>
  <path d="M39.4 23.4L31.6 41.2" stroke="url(#cbK)" stroke-width="1.8" stroke-linecap="round"/>`;

function nodeSvg(k: string, [x, y, label, icon]: [number, number, string, string]) {
  const twin = icon === 'twin';
  const r = twin ? 26 : 20;
  const inner = twin
    ? `<g transform="translate(-19 -15) scale(.68)">${MARK_BODY}</g>`
    : `<g class="ic" transform="translate(-9 -9) scale(.75)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</g>`;
  return `<g class="nd" data-k="${k}" transform="translate(${x} ${y})">
    <rect class="halo" x="${-r - 6}" y="${-r - 6}" width="${(r + 6) * 2}" height="${(r + 6) * 2}" rx="${twin ? 18 : 14}"/>
    <rect x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" rx="${twin ? 14 : 10}"/>
    ${inner}
    <text y="${r + 20}">${label}</text></g>`;
}

export default function CircuitTransition({ leaving }: { leaving: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const traces = [...el.querySelectorAll<SVGPathElement>('.tr')];
    const pulses = [...el.querySelectorAll<SVGPathElement>('.pl')];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const lit = (k: string) => el.querySelector(`.nd[data-k="${k}"]`)?.classList.add('on');

    traces.forEach((t) => {
      const L = t.getTotalLength();
      t.style.strokeDasharray = `${L}`;
      t.style.strokeDashoffset = `${L}`;
    });
    pulses.forEach((p) => (p.style.opacity = '0'));
    ['B', 'E', 'I'].forEach((k, i) => later(() => lit(k), 60 + i * 70));

    let idx = 0;
    STAGES.forEach((group, si) =>
      group.forEach(([target]) => {
        const i = idx++;
        const t = traces[i];
        const p = pulses[i];
        const L = t.getTotalLength();
        const delay = 200 + si * STEP;
        t.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: STEP, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        const seg = Math.min(26, L * 0.35);
        p.style.strokeDasharray = `${seg} ${L + seg}`;
        p.animate(
          [
            { strokeDashoffset: seg, opacity: 1 },
            { strokeDashoffset: -L, opacity: 1 },
            { strokeDashoffset: -L, opacity: 0 },
          ],
          { duration: STEP + 120, delay: delay + 60, easing: 'ease-in', fill: 'forwards' },
        );
        later(() => lit(target), delay + STEP);
        if (si === 0) later(() => el.querySelector('.jn')?.setAttribute('opacity', '1'), delay + STEP - 40);
      }),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const paths = STAGES.flat().map(([, d]) => d);
  const svg = `<svg viewBox="40 20 580 300" aria-hidden="true">
    <defs>${MARK}<filter id="cbGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${paths.map((d) => `<path class="tr" d="${d}"/>`).join('')}
    ${paths.map((d) => `<path class="pl" d="${d}"/>`).join('')}
    <circle cx="210" cy="170" r="3.5" class="jn" opacity="0"/>
    ${Object.entries(NODES).map(([k, v]) => nodeSvg(k, v)).join('')}</svg>`;

  return (
    <div ref={ref} role="status" aria-label="Opening your twin" className={cx('cb', leaving && 'out')}>
      <div className="contents" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="cb-cap">
        Mapping <b>banks · EPF · insurance</b> → opening your twin
      </div>
    </div>
  );
}
