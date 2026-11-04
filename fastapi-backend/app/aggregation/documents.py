"""
Backward compatibility bridge for app.aggregation.documents.
Re-exports Document Vault and RAG indexing from app.ai_bot.rag.
"""
from app.ai_bot.rag import (
    sanitize_filename,
    compute_sha256,
    extract_text_from_pdf,
    chunk_text,
    clean_fts_query,
    ingest_document,
    search_user_documents,
    delete_user_document,
    ingest_regulation_document,
    list_regulations,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
)

__all__ = [
    "sanitize_filename",
    "compute_sha256",
    "extract_text_from_pdf",
    "chunk_text",
    "clean_fts_query",
    "ingest_document",
    "search_user_documents",
    "delete_user_document",
    "ingest_regulation_document",
    "list_regulations",
    "MAX_FILE_SIZE",
    "ALLOWED_MIME_TYPES",
]
