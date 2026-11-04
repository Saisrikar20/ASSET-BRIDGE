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

# Ensure backend root is accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "fastapi-backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.aggregation.documents import ingest_regulation_document
    HAS_LOCAL_BACKEND = True
except Exception:
    HAS_LOCAL_BACKEND = False

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
        self.api_url = os.getenv("ASSET_BRIDGE_API_URL", "http://127.0.0.1:8000")

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        regulator = adapter.get("regulator", "GOV")
        title = adapter.get("title", "")
        source_url = adapter.get("source_url", "")
        pdf_url = adapter.get("pdf_url")
        raw_text = adapter.get("raw_text")
        circular_no = adapter.get("circular_no")
        date = adapter.get("date")
        category = adapter.get("category")

        spider.logger.info(f"Processing regulation: [{regulator}] {title[:60]}")

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
                    spider.logger.info(f"Duplicate circular skipped: {title[:40]}")
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

    def close_spider(self, spider):
        spider.logger.info(
            f"Spider {spider.name} finished. Ingested: {self.ingested_count}, "
            f"Already Present (Deduplicated): {self.duplicate_count}."
        )
