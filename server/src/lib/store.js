// Tiny JSON-file store. Swap for Supabase (relational) + MongoDB (paperwork
// metadata) in production — every access goes through these helpers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const empty = () => ({ users: [], heirs: [], consents: [], holdings: [], alerts: [], cases: [] });

let db = load();

function load() {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch {
    return empty();
  }
}

let timer = null;
function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
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

export const uid = (prefix = '') =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
