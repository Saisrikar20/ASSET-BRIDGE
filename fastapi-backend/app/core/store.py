import json, os, time, random
from app.config import DATA_DIR, SUPABASE_URL, SUPABASE_KEY

DB_FILE = DATA_DIR / "db.json"
TABLES = ["users", "heirs", "consents", "holdings", "alerts", "cases", "snapshots"]

def uid(prefix=""):
    return f"{prefix}{int(time.time()*1000):x}{random.randint(1000, 9999):x}"

class Store:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.db = {t: [] for t in TABLES}
        if DB_FILE.exists():
            try:
                self.db.update(json.loads(DB_FILE.read_text(encoding="utf-8")))
            except Exception:
                pass

    def persist(self):
        try:
            DB_FILE.write_text(json.dumps(self.db, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    def all(self, table, pred=lambda r: True):
        return [r for r in self.db.get(table, []) if pred(r)]

    def find(self, table, pred):
        for r in self.db.get(table, []):
            if pred(r):
                return r
        return None

    def insert(self, table, row):
        if "id" not in row:
            row["id"] = uid(f"{table[0]}_")
        self.db.setdefault(table, []).append(row)
        self.persist()
        return row

    def update(self, table, pred, patch):
        row = self.find(table, pred)
        if row:
            if callable(patch):
                patch(row)
            elif isinstance(patch, dict):
                row.update(patch)
            self.persist()
        return row

    def remove(self, table, pred):
        orig = self.db.get(table, [])
        kept = [r for r in orig if not pred(r)]
        self.db[table] = kept
        self.persist()
        return len(orig) - len(kept)

    def reset(self):
        self.db = {t: [] for t in TABLES}
        self.persist()

store = Store()
