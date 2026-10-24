// In-browser AI succession guide: the same BM25 retrieval and cited,
// extractive answers as ai-service/main.py, over the same knowledge files.
const files = import.meta.glob('../../../ai-service/knowledge/*.md', { query: '?raw', import: 'default', eager: true });

const STOP = new Set(
  ('a an the of to and or in on for is are be by with as at it this that from if i my me we our what how do does can who which when where ' +
    'should will would there their they them you your has have had not no was were been get').split(' '),
);
const ALIASES = {
  pf: ['provident', 'epf'], epf: ['provident', 'epfo'], pension: ['eps', '10d'], mf: ['mutual', 'fund'], shares: ['demat', 'transmission'],
  stocks: ['demat', 'shares'], fd: ['deposit', 'bank'], savings: ['bank', 'deposit'], policy: ['insurance', 'insurer'],
  heir: ['legal', 'certificate'], dead: ['death'], died: ['death'], passed: ['death'],
};
const tokens = (t) => (t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOP.has(w));

const CHUNKS = [];
for (const [path, md] of Object.entries(files).sort()) {
  const source = path.split('/').pop();
  let docTitle = source.replace('.md', '');
  let heading = '';
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(' ');
    const stem = source.replace('.md', '').replace(/-/g, ' ');
    CHUNKS.push({ source, docTitle, heading, text, toks: tokens(`${stem} ${docTitle} ${docTitle} ${heading} ${heading} ${text}`) });
    buf = [];
  };
  for (const line of md.split('\n')) {
    if (line.startsWith('# ')) docTitle = line.slice(2).trim();
    else if (line.startsWith('## ')) {
      flush();
      heading = line.slice(3).trim();
    } else if (line.trim()) buf.push(line.trim());
  }
  flush();
}
const N = CHUNKS.length;
const AVGDL = CHUNKS.reduce((s, c) => s + c.toks.length, 0) / Math.max(N, 1);
const DF = new Map();
for (const c of CHUNKS) for (const t of new Set(c.toks)) DF.set(t, (DF.get(t) || 0) + 1);

function bm25(q, c, k1 = 1.4, b = 0.75) {
  const tf = new Map();
  for (const t of c.toks) tf.set(t, (tf.get(t) || 0) + 1);
  let score = 0;
  for (const t of q) {
    const f = tf.get(t);
    if (!f) continue;
    const df = DF.get(t) || 0;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.toks.length) / AVGDL));
  }
  return score;
}

function retrieve(question, state, k = 4) {
  const q = tokens(question);
  q.push(...q.flatMap((t) => ALIASES[t] || []));
  let top = CHUNKS.map((c) => [bm25(q, c), c]).sort((a, b) => b[0] - a[0]).slice(0, k).filter(([s]) => s > 0).map(([, c]) => c);
  if (state && top.length && q.some((t) => ['heir', 'legal', 'certificate', 'nominee', 'nomination', 'succession', 'documents'].includes(t))) {
    const rule = CHUNKS.find((c) => c.heading.toLowerCase() === state.toLowerCase());
    if (rule && !top.includes(rule)) top = [...top.slice(0, k - 1), rule];
  }
  return top;
}

const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);

export function guide({ question, state }) {
  const chunks = retrieve(question, state);
  let answer;
  if (!chunks.length) {
    answer =
      "I couldn't find guidance on that in Asset Bridge's knowledge base. Try asking about a specific asset (bank deposit, EPF, insurance, LIC, mutual fund, shares) or a document such as a legal heir certificate.";
  } else {
    const q = new Set(tokens(question));
    const overlap = (s) => tokens(s).filter((t) => q.has(t)).length;
    answer =
      chunks
        .slice(0, 3)
        .map((c, i) => `${i + 1}. **${c.heading}** — ${[...sentences(c.text)].sort((a, b) => overlap(b) - overlap(a)).slice(0, 2).join(' ')} [${i + 1}]`)
        .join('\n') + '\n\n_Requirements change — confirm the current list with the institution before you visit._';
  }
  return { answer, engine: 'extractive (in browser)', sources: chunks.map((c, i) => ({ n: i + 1, title: c.docTitle, section: c.heading, file: c.source })) };
}
