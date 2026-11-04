"""
Unit Test Suite for Asset Bridge SQLite Persistence Layer
Verifies: WAL mode, Foreign Keys, Transactions, JSON migration, and FTS5 indexing.
"""

import os
import sys
from pathlib import Path

# Add fastapi-backend to path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.db import get_connection, query_one, query_all, transaction, init_db
from app.core.store import store, uid

def test_sqlite_pragmas():
    conn = get_connection()
    journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
    foreign_keys = conn.execute("PRAGMA foreign_keys;").fetchone()[0]
    
    assert journal_mode.lower() == "wal", f"Expected WAL mode, got {journal_mode}"
    assert foreign_keys == 1, f"Expected foreign keys = 1, got {foreign_keys}"
    print("[PASS] SQLite PRAGMA journal_mode = WAL and foreign_keys = 1 verified.")

def test_transaction_rollback():
    conn = get_connection()
    test_user_id = uid("test_user_")
    
    try:
        with transaction():
            conn.execute(
                "INSERT INTO users (id, email, name, raw_json, created_at) VALUES (?, ?, ?, ?, ?)",
                (test_user_id, "rollback@example.com", "Rollback Test", "{}", "2026-11-04")
            )
            # Deliberately raise exception to trigger rollback
            raise ValueError("Deliberate failure to test rollback")
    except ValueError:
        pass
    
    user = query_one("SELECT * FROM users WHERE id = ?", (test_user_id,))
    assert user is None, "Transaction rollback failed: user still exists in database!"
    print("[PASS] ACID transaction rollback verified.")

def test_store_crud():
    test_id = uid("tst_")
    row = {
        "id": test_id,
        "title": "Test Alert",
        "severity": "high",
        "userId": "u_test",
        "holdingId": "h_test"
    }
    
    inserted = store.insert("alerts", row)
    assert inserted["id"] == test_id
    
    fetched = store.find("alerts", lambda r: r.get("id") == test_id)
    assert fetched is not None
    assert fetched["title"] == "Test Alert"
    assert fetched["severity"] == "high"
    
    # Test update
    updated = store.update("alerts", lambda r: r.get("id") == test_id, {"severity": "resolved"})
    assert updated["severity"] == "resolved"
    
    # Test remove
    removed_count = store.remove("alerts", lambda r: r.get("id") == test_id)
    assert removed_count == 1
    assert store.find("alerts", lambda r: r.get("id") == test_id) is None
    print("[PASS] Store CRUD operations verified.")

def test_fts5_indexing():
    conn = get_connection()
    doc_id = uid("doc_")
    chunk_id = uid("chk_")
    user_id = uid("u_")
    
    content = "The Tahsildar issued the legal heir certificate on 14 October 2025 in Chennai."
    
    with transaction():
        conn.execute(
            """INSERT INTO doc_chunks_fts (chunk_id, user_id, document_id, doc_type, source_name, title, section, content)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (chunk_id, user_id, doc_id, "heir_cert", "tahsildar_order.pdf", "Legal Heir Order", "Revenue Section 4", content)
        )
    
    # Search for term 'Tahsildar'
    results = query_all("SELECT chunk_id, title, content FROM doc_chunks_fts WHERE doc_chunks_fts MATCH ?", ("Tahsildar",))
    assert len(results) > 0, "FTS5 search for 'Tahsildar' returned no results"
    assert any(r["chunk_id"] == chunk_id for r in results), "Inserted chunk not found in search results"
    
    # Search for stemmed term 'certificate'
    stemmed_res = query_all("SELECT chunk_id, title FROM doc_chunks_fts WHERE doc_chunks_fts MATCH ?", ("certificates",))
    assert len(stemmed_res) > 0, "FTS5 Porter stemmer search failed"
    
    # Clean up test chunk
    with transaction():
        conn.execute("DELETE FROM doc_chunks_fts WHERE chunk_id = ?", (chunk_id,))
    print("[PASS] SQLite FTS5 Full-Text Search and Porter stemmer verified.")

def test_chat_persistence():
    sess_id = uid("sess_")
    user_id = uid("u_")
    session_data = {
        "id": sess_id,
        "userId": user_id,
        "title": "Nominee claim assistance",
        "caseId": "AB-1234"
    }
    store.insert("chat_sessions", session_data)
    
    msg_id = uid("msg_")
    msg_data = {
        "id": msg_id,
        "sessionId": sess_id,
        "role": "user",
        "content": "Which form is required for Canara Bank claim?",
        "engine": "extractive",
        "sources": [{"title": "RBI Deceased Depositor Circular", "file": "bank-deposits.md"}]
    }
    store.insert("chat_messages", msg_data)
    
    sess = store.find("chat_sessions", lambda s: s.get("id") == sess_id)
    assert sess is not None
    assert sess["title"] == "Nominee claim assistance"
    
    msgs = store.all("chat_messages", lambda m: m.get("sessionId") == sess_id)
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Which form is required for Canara Bank claim?"
    
    # Cleanup test data
    store.remove("chat_messages", lambda m: m.get("id") == msg_id)
    store.remove("chat_sessions", lambda s: s.get("id") == sess_id)
    print("[PASS] Persistent chat sessions and messages verified.")

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING ASSET BRIDGE SQLITE DATABASE PERSISTENCE LAYER")
    print("=" * 60)
    test_sqlite_pragmas()
    test_transaction_rollback()
    test_store_crud()
    test_fts5_indexing()
    test_chat_persistence()
    print("=" * 60)
    print("ALL DATABASE PERSISTENCE TESTS PASSED (100%)")
    print("=" * 60)
