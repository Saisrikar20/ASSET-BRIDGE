// Browser stand-in for server/src/lib/store.js: same API, kept in localStorage.
const KEY = 'ab_local_db';
const empty = () => ({ users: [], heirs: [], consents: [], holdings: [], alerts: [], cases: [], snapshots: [] });

function load() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return empty();
  }
}

let db = load();
let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, 50);
}

export const store = {
  all(table, pred = () => true) {
    return db[table].filter(pred);
  },
  find(table, pred) {
    return db[table].find(pred);
  },
  insert(table, row) {
    db[table].push(row);
    persist();
    return row;
  },
  update(table, pred, patch) {
    const row = db[table].find(pred);
    if (row) {
      Object.assign(row, typeof patch === 'function' ? patch(row) : patch);
      persist();
    }
    return row;
  },
  remove(table, pred) {
    const before = db[table].length;
    db[table] = db[table].filter((r) => !pred(r));
    persist();
    return before - db[table].length;
  },
  reset() {
    db = empty();
    persist();
  },
};

export const uid = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
