"""
Asset Bridge Item Pipelines for Scrapy.
Ingests crawled statutory circulars into the SQLite Document Vault and FTS5 search index.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict

import httpx
from itemadapter import ItemAdapter

# Ensure root and backend directories are in sys.path
PIPELINE_FILE = Path(__file__).resolve()
ROOT_DIR = PIPELINE_FILE.parent.parent.parent
BACKEND_DIR = ROOT_DIR / "fastapi-backend"

for _dir in [ROOT_DIR, BACKEND_DIR]:
    _dir_str = str(_dir)
    if _dir.exists() and _dir_str not in sys.path:
        sys.path.insert(0, _dir_str)

try:
    from app.aggregation.documents import ingest_regulation_document
    HAS_LOCAL_BACKEND = True
    BACKEND_IMPORT_ERROR = None
except Exception as _e:
    try:
        import importlib
        _mod = importlib.import_module("app.aggregation.documents")
        ingest_regulation_document = getattr(_mod, "ingest_regulation_document")
        HAS_LOCAL_BACKEND = True
        BACKEND_IMPORT_ERROR = None
    except Exception as _inner_e:
        ingest_regulation_document = None
        HAS_LOCAL_BACKEND = False
        BACKEND_IMPORT_ERROR = str(_inner_e)

import logging

class AssetBridgeVaultPipeline:
    """
    Pipeline that processes each statutory regulation item:
    1. Extracts PDF text if a direct PDF URL is provided.
    2. Ingests and deduplicates the circular in the Asset Bridge Document Vault.
    3. Triggers succession alerts for high-impact legal policy changes.
    """

    def __init__(self):
        self.ingested_count = 0
        self.duplicate_count = 0
        self.api_url = os.getenv("ASSET_BRIDGE_API_URL", "http://127.0.0.1:8000").rstrip("/")
        self.crawler = None

    @classmethod
    def from_crawler(cls, crawler):
        pipeline = cls()
        pipeline.crawler = crawler
        return pipeline

    def process_item(self, item, spider=None):
        spider_inst = spider or (self.crawler and getattr(self.crawler, "spider", None))
        logger = getattr(spider_inst, "logger", None) or logging.getLogger("scrapers.pipelines.vault")
        adapter = ItemAdapter(item)
        regulator = adapter.get("regulator", "GOV")
        title = adapter.get("title", "")
        source_url = adapter.get("source_url", "")
        pdf_url = adapter.get("pdf_url")
        raw_text = adapter.get("raw_text")
        circular_no = adapter.get("circular_no")
        date = adapter.get("date")
        category = adapter.get("category")

        logger.info(f"Processing regulation: [{regulator}] {title[:60]}")

        # Method 1: Direct backend function if running locally inside monorepo
        if HAS_LOCAL_BACKEND:
            try:
                res = ingest_regulation_document(
                    regulator=regulator,
                    title=title,
                    source_url=source_url,
                    text=raw_text,
                    pdf_url=pdf_url,
                    circular_no=circular_no,
                    publication_date=date,
                    category=category
                )
                if res.get("duplicate"):
                    self.duplicate_count += 1
                    logger.info(f"Duplicate circular skipped: {title[:40]}")
                else:
                    self.ingested_count += 1
                    spider.logger.info(f"Successfully ingested and indexed: {title[:40]} (Doc ID: {res.get('docId')})")
                return item
            except Exception as e:
                spider.logger.warning(f"Local ingestion error: {e}. Falling back to HTTP API.")

        # Method 2: HTTP API fallback (for containerized or CI/CD runs)
        try:
            payload = {
                "regulator": regulator,
                "title": title,
                "sourceUrl": source_url,
                "text": raw_text,
                "pdfUrl": pdf_url,
                "circularNo": circular_no,
                "date": date,
                "category": category
            }
            resp = httpx.post(
                f"{self.api_url}/api/documents/ingest-regulation",
                json=payload,
                timeout=20.0
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("duplicate"):
                    self.duplicate_count += 1
                else:
                    self.ingested_count += 1
            else:
                spider.logger.warning(f"HTTP ingestion returned {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            spider.logger.warning(f"HTTP ingestion connection failed: {e}")

        return item

    def close_spider(self, spider=None):
        spider_inst = spider or (self.crawler and getattr(self.crawler, "spider", None))
        logger = getattr(spider_inst, "logger", None) or logging.getLogger("scrapers.pipelines.vault")
        name = getattr(spider_inst, "name", "all_spiders")
        logger.info(
            f"Spider {name} finished. Ingested: {self.ingested_count}, "
            f"Already Present (Deduplicated): {self.duplicate_count}."
        )

