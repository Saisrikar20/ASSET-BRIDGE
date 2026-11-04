import json
import os
import time
import random
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from app.config import DATA_DIR
from app.core.db import get_connection, init_db, transaction

DB_FILE = DATA_DIR / "db.json"
TABLES = [
    "users", "heirs", "consents", "holdings", "alerts", "cases",
    "snapshots", "user_documents", "doc_chunks", "chat_sessions", "chat_messages"
]

def uid(prefix: str = "") -> str:
    """Generate a collision-resistant unique identifier."""
    return f"{prefix}{int(time.time()*1000):x}{random.randint(1000, 9999):x}"

class Store:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        init_db()
        self._migrate_from_json_if_needed()

    def _migrate_from_json_if_needed(self):
        """One-time migration: Import records from legacy db.json into SQLite if database is empty."""
        try:
            conn = get_connection()
            user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            if user_count == 0 and DB_FILE.exists():
                data = json.loads(DB_FILE.read_text(encoding="utf-8"))
                with transaction():
                    for table in TABLES:
                        rows = data.get(table, [])
                        for row in rows:
                            self._insert_row_sql(conn, table, row)
        except Exception as e:
            # Migration error should not crash the app, but log or fallback
            pass

    def _sync_to_file(self):
        """Optional non-blocking synchronization snapshot to db.json for external audit visibility."""
        try:
            snapshot = {t: self.all(t) for t in ["users", "heirs", "consents", "holdings", "alerts", "cases", "snapshots"]}
            DB_FILE.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    def _insert_row_sql(self, conn, table: str, row: Dict[str, Any]):
        row_id = str(row.get("id") or uid(f"{table[0]}_"))
        row["id"] = row_id
        raw_json = json.dumps(row, ensure_ascii=False)
        user_id = str(row.get("userId") or row.get("user_id") or row.get("ownerId") or "")
        created_at = str(row.get("createdAt") or row.get("created_at") or "")

        if table == "users":
            email = (row.get("email") or "").strip().lower()
            name = row.get("name") or ""
            conn.execute(
                "INSERT OR REPLACE INTO users (id, email, name, raw_json, created_at) VALUES (?, ?, ?, ?, ?)",
                (row_id, email, name, raw_json, created_at)
            )
        elif table == "holdings":
            regulator = str(row.get("regulator") or "")
            institution = str(row.get("institution") or "")
            htype = str(row.get("type") or "")
            val = float(row.get("value") or 0.0)
            is_dup = 1 if row.get("isDuplicate") else 0
            conn.execute(
                """INSERT OR REPLACE INTO holdings 
                   (id, user_id, regulator, institution, type, value, is_duplicate, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (row_id, user_id, regulator, institution, htype, val, is_dup, raw_json, created_at)
            )
        elif table == "alerts":
            holding_id = str(row.get("holdingId") or row.get("holding_id") or "")
            severity = str(row.get("severity") or "")
            kind = str(row.get("kind") or row.get("type") or "")
            conn.execute(
                """INSERT OR REPLACE INTO alerts 
                   (id, user_id, holding_id, severity, kind, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (row_id, user_id, holding_id, severity, kind, raw_json, created_at)
            )
        elif table == "cases":
            owner_id = str(row.get("ownerId") or row.get("owner_id") or user_id)
            dec_name = str(row.get("deceasedName") or "")
            state = str(row.get("state") or "")
            conn.execute(
                """INSERT OR REPLACE INTO cases 
                   (id, owner_id, deceased_name, state, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (row_id, owner_id, dec_name, state, raw_json, created_at)
            )
        elif table == "heirs":
            case_id = str(row.get("caseId") or row.get("case_id") or "")
            conn.execute(
                """INSERT OR REPLACE INTO heirs 
                   (id, user_id, case_id, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?)""",
                (row_id, user_id, case_id, raw_json, created_at)
            )
        elif table == "consents":
            reg = str(row.get("regulator") or "")
            conn.execute(
                """INSERT OR REPLACE INTO consents 
                   (id, user_id, regulator, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?)""",
                (row_id, user_id, reg, raw_json, created_at)
            )
        elif table == "snapshots":
            conn.execute(
                """INSERT OR REPLACE INTO snapshots 
                   (id, user_id, raw_json, created_at) 
                   VALUES (?, ?, ?, ?)""",
                (row_id, user_id, raw_json, created_at)
            )
        elif table == "user_documents":
            case_id = str(row.get("case_id") or row.get("caseId") or "")
            task_id = str(row.get("task_id") or row.get("taskId") or "")
            doc_type = str(row.get("doc_type") or row.get("docType") or "other")
            file_name = str(row.get("file_name") or row.get("fileName") or "")
            file_path = str(row.get("file_path") or row.get("filePath") or "")
            file_size = int(row.get("file_size") or row.get("fileSize") or 0)
            mime_type = str(row.get("mime_type") or row.get("mimeType") or "")
            sha256 = str(row.get("sha256_hash") or row.get("sha256") or row.get("hash") or "")
            extracted = str(row.get("extracted_text") or "")
            status = str(row.get("status") or "ready")
            conn.execute(
                """INSERT OR REPLACE INTO user_documents 
                   (id, user_id, case_id, task_id, doc_type, file_name, file_path, file_size, 
                    mime_type, sha256_hash, extracted_text, status, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (row_id, user_id, case_id, task_id, doc_type, file_name, file_path, file_size,
                 mime_type, sha256, extracted, status, raw_json, created_at)
            )
        elif table == "chat_sessions":
            case_id = str(row.get("case_id") or row.get("caseId") or "")
            title = str(row.get("title") or "New Consultation")
            updated_at = str(row.get("updated_at") or created_at)
            conn.execute(
                """INSERT OR REPLACE INTO chat_sessions 
                   (id, user_id, case_id, title, raw_json, created_at, updated_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (row_id, user_id, case_id, title, raw_json, created_at, updated_at)
            )
        elif table == "chat_messages":
            session_id = str(row.get("session_id") or row.get("sessionId") or "")
            role = str(row.get("role") or "user")
            content = str(row.get("content") or "")
            sources = json.dumps(row.get("sources") or [])
            actions = json.dumps(row.get("actions") or [])
            engine = str(row.get("engine") or "")
            conn.execute(
                """INSERT OR REPLACE INTO chat_messages 
                   (id, session_id, role, content, sources_json, actions_json, engine, raw_json, created_at) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (row_id, session_id, role, content, sources, actions, engine, raw_json, created_at)
            )
        else:
            pass

    def all(self, table: str, pred: Callable[[Dict[str, Any]], bool] = lambda r: True) -> List[Dict[str, Any]]:
        """Retrieve all rows from the specified table matching predicate."""
        if table not in TABLES:
            return []
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT raw_json FROM {table}")
        results = []
        for (raw_json,) in cursor.fetchall():
            try:
                row = json.loads(raw_json)
                if pred(row):
                    results.append(row)
            except Exception:
                continue
        return results

    def find(self, table: str, pred: Callable[[Dict[str, Any]], bool]) -> Optional[Dict[str, Any]]:
        """Find the first row matching predicate in table."""
        if table not in TABLES:
            return None
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(f"SELECT raw_json FROM {table}")
        for (raw_json,) in cursor.fetchall():
            try:
                row = json.loads(raw_json)
                if pred(row):
                    return row
            except Exception:
                continue
        return None

    def insert(self, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a row into the database with automatic primary key generation."""
        if "id" not in row or not row["id"]:
            row["id"] = uid(f"{table[0]}_")
        if "createdAt" not in row and "created_at" not in row:
            row["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        conn = get_connection()
        with transaction():
            self._insert_row_sql(conn, table, row)
        self._sync_to_file()
        return row

    def update(self, table: str, pred: Callable[[Dict[str, Any]], bool], patch: Any) -> Optional[Dict[str, Any]]:
        """Update an existing row matching predicate in table."""
        row = self.find(table, pred)
        if not row:
            return None

        if callable(patch):
            patch(row)
        elif isinstance(patch, dict):
            row.update(patch)

        conn = get_connection()
        with transaction():
            self._insert_row_sql(conn, table, row)
        self._sync_to_file()
        return row

    def remove(self, table: str, pred: Callable[[Dict[str, Any]], bool]) -> int:
        """Remove all rows matching predicate in table."""
        if table not in TABLES:
            return 0
        matches = self.all(table, pred)
        if not matches:
            return 0

        ids = [m["id"] for m in matches if "id" in m]
        conn = get_connection()
        with transaction():
            for row_id in ids:
                conn.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
        self._sync_to_file()
        return len(ids)

    def reset(self):
        """Truncate all tables in SQLite and reset db.json."""
        conn = get_connection()
        with transaction():
            for t in TABLES:
                try:
                    conn.execute(f"DELETE FROM {t}")
                except Exception:
                    pass
        self._sync_to_file()

store = Store()
