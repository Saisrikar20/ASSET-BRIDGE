-- Asset Bridge Production SQLite Schema with FTS5 and Dual Persistence
PRAGMA foreign_keys = ON;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Consents
CREATE TABLE IF NOT EXISTS consents (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    regulator TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);

-- 3. Holdings
CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    regulator TEXT,
    institution TEXT,
    type TEXT,
    value REAL DEFAULT 0,
    is_duplicate INTEGER DEFAULT 0,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_reg ON holdings(regulator);

-- 4. Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    holding_id TEXT,
    severity TEXT,
    kind TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);

-- 5. Cases
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    owner_id TEXT,
    deceased_name TEXT,
    state TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cases_owner ON cases(owner_id);

-- 6. Heirs
CREATE TABLE IF NOT EXISTS heirs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    case_id TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_heirs_user ON heirs(user_id);

-- 7. Snapshots
CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_snapshots_user ON snapshots(user_id);

-- 8. User Documents Vault
CREATE TABLE IF NOT EXISTS user_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    case_id TEXT,
    task_id TEXT,
    doc_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    extracted_text TEXT,
    status TEXT NOT NULL DEFAULT 'ready',
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_docs_user ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_docs_case ON user_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_docs_hash ON user_documents(sha256_hash);

-- 9. Document Chunks for Semantic Search
CREATE TABLE IF NOT EXISTS doc_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    doc_type TEXT NOT NULL,
    source_name TEXT NOT NULL,
    title TEXT NOT NULL,
    section TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES user_documents(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chunks_user ON doc_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON doc_chunks(document_id);

-- 10. FTS5 Virtual Table for BM25 Search
CREATE VIRTUAL TABLE IF NOT EXISTS doc_chunks_fts USING fts5(
    chunk_id UNINDEXED,
    user_id UNINDEXED,
    document_id UNINDEXED,
    doc_type UNINDEXED,
    source_name,
    title,
    section,
    content,
    tokenize = 'porter'
);

-- 11. Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    case_id TEXT,
    title TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_sess_user ON chat_sessions(user_id);

-- 12. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources_json TEXT,
    actions_json TEXT,
    engine TEXT,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_msg_sess ON chat_messages(session_id);
