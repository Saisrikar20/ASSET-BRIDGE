"""
Asset Bridge Item Pipelines for Scrapy.
Ingests crawled statutory circulars into:
1. Redis Storage Engine (assetbridge:regulation:* hashes, seen_urls set, queue)
2. SQLite Document Vault and FTS5 search index
3. Local JSONL archive (data/regulations.jsonl)
"""

import os
import sys
import json
import hashlib
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
    from app.ai_bot import ingest_regulation_document
    HAS_LOCAL_BACKEND = True
except Exception:
    try:
        from app.aggregation.documents import ingest_regulation_document
        HAS_LOCAL_BACKEND = True
    except Exception:
        HAS_LOCAL_BACKEND = False

try:
    from scrapers.redis_store import redis_store
except ImportError:
    from scrapers.scrapers.redis_store import redis_store

class RedisRegulationPipeline:
    """
    Pipeline that persists scraped circulars into Redis and appends to local JSONL:
    - Redis Hash: assetbridge:regulation:<sha256>
    - Redis Set: assetbridge:regulations:seen_urls (O(1) deduplication)
    - Redis Queue: assetbridge:regulations:queue
    - Local JSONL: scrapers/data/regulations.jsonl
    """

    def __init__(self):
        self.data_dir = ROOT_DIR / "scrapers" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.jsonl_path = self.data_dir / "regulations.jsonl"

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        reg_dict = dict(adapter)
        
        # Calculate SHA256 checksum
        raw_key = f"{reg_dict.get('regulator')}|{reg_dict.get('circular_no')}|{reg_dict.get('source_url')}"
        sha256 = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        reg_dict["sha256"] = sha256

        # 1. Store in Redis (if online / enabled)
        if redis_store.is_connected():
            res = redis_store.store_regulation(reg_dict)
            if res.get("stored_in_redis"):
                spider.logger.info(f"[Redis] Cached regulation {reg_dict.get('circular_no') or reg_dict.get('title')[:30]}")
        else:
            # Standby mode: Redis offline/disabled, logging failover notice once
            pass

        # 2. Append to local JSONL archive
        try:
            with open(self.jsonl_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(reg_dict, ensure_ascii=False) + "\n")
        except Exception as e:
            spider.logger.warning(f"Failed to append to JSONL: {e}")

        return item

class AssetBridgeVaultPipeline:
    """
    Pipeline that processes each statutory regulation item into SQLite Document Vault:
    1. Ingests and deduplicates the circular in the Asset Bridge Document Vault.
    2. Chunks and indexes the circular into SQLite FTS5 for AI RAG retrieval.
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
            spider.logger.warning(f"Failed to post regulation to Asset Bridge API: {e}")

        return item
