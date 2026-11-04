import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from app.config import DB_PATH, DATA_DIR, UPLOADS_DIR

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"
_local = threading.local()

def get_connection() -> sqlite3.Connection:
    """Returns a thread-local SQLite connection with WAL mode and foreign keys enabled."""
    if not hasattr(_local, "conn") or _local.conn is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(
            str(DB_PATH),
            timeout=30.0,
            check_same_thread=False,
            isolation_level=None  # autocommit mode, transactions handled explicitly
        )
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA busy_timeout = 30000;")
        _local.conn = conn
    return _local.conn

@contextmanager
def transaction():
    """Context manager for an atomic database transaction."""
    conn = get_connection()
    conn.execute("BEGIN IMMEDIATE;")
    try:
        yield conn
        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise

def init_db(schema_file: Optional[Path] = None) -> None:
    """Initializes the database schema if tables do not exist."""
    path = schema_file or SCHEMA_PATH
    if not path.exists():
        raise FileNotFoundError(f"Schema file not found at {path}")
    
    conn = get_connection()
    sql_script = path.read_text(encoding="utf-8")
    with conn:
        conn.executescript(sql_script)

def query_all(sql: str, params: Tuple[Any, ...] = ()) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

def query_one(sql: str, params: Tuple[Any, ...] = ()) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    row = cursor.fetchone()
    return dict(row) if row else None

def execute_cmd(sql: str, params: Tuple[Any, ...] = ()) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    return cursor.rowcount
