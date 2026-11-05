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
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import httpx
from itemadapter import ItemAdapter

# Ensure backend and scraper roots are accessible
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "fastapi-backend"
SCRAPERS_DIR = ROOT_DIR / "scrapers"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SCRAPERS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPERS_DIR))

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
    from .redis_store import redis_store
except (ImportError, ValueError):
    try:
        from scrapers.redis_store import redis_store
    except ImportError:
        try:
            from scrapers.scrapers.redis_store import redis_store
        except ImportError:
            redis_store = None


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
        self.cached_count = 0
        self.crawler = None

    @classmethod
    def from_crawler(cls, crawler):
        pipeline = cls()
        pipeline.crawler = crawler
        return pipeline

    def process_item(self, item, spider=None):
        spider_inst = spider or (self.crawler and getattr(self.crawler, "spider", None))
        logger = getattr(spider_inst, "logger", None) or logging.getLogger("scrapers.pipelines.redis")
        adapter = ItemAdapter(item)
        
        reg_clean = (adapter.get("regulator") or "GOV").strip().upper()
        circular_no = (adapter.get("circular_no") or "").strip()
        source_url = (adapter.get("source_url") or "").strip()
        title_clean = (adapter.get("title") or "Regulatory Circular").strip()

        # Aligned deduplication hash consistent with SQLite Document Vault and rag.py
        dedup_input = f"{reg_clean}|{circular_no}|{source_url}|{title_clean}".encode("utf-8")
        sha256 = hashlib.sha256(dedup_input).hexdigest()

        try:
            adapter["sha256"] = sha256
        except (KeyError, TypeError):
            pass

        reg_dict = dict(adapter)
        reg_dict["sha256"] = sha256

        # 1. Store in Redis (if online / enabled)
        if redis_store and redis_store.is_connected():
            res = redis_store.store_regulation(reg_dict)
            if res.get("stored_in_redis"):
                self.cached_count += 1
                logger.info(f"[Redis] Cached regulation {circular_no or title_clean[:30]} ({sha256[:10]})")
        else:
            # Standby mode: Redis offline/disabled
            pass

        # 2. Append to local JSONL archive
        try:
            with open(self.jsonl_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(reg_dict, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.warning(f"Failed to append to JSONL: {e}")

        return item

    def close_spider(self, spider=None):
        spider_inst = spider or (self.crawler and getattr(self.crawler, "spider", None))
        logger = getattr(spider_inst, "logger", None) or logging.getLogger("scrapers.pipelines.redis")
        name = getattr(spider_inst, "name", "all_spiders")
        logger.info(f"[RedisPipeline] Spider {name} finished. Total cached in Redis: {self.cached_count}")


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

        # Skip empty items lacking title and source_url
        if not title and not source_url:
            logger.warning("Skipping empty regulation item missing title and source_url")
            return item

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
                    logger.info(f"Successfully ingested and indexed: {title[:40]} (Doc ID: {res.get('docId')})")
                return item
            except Exception as e:
                logger.warning(f"Local ingestion error: {e}. Falling back to HTTP API.")

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
                logger.warning(f"HTTP ingestion returned {resp.status_code}: {resp.text[:100]}")
        except Exception as e:
            logger.warning(f"Failed to post regulation to Asset Bridge API: {e}")

        return item

    def close_spider(self, spider=None):
        spider_inst = spider or (self.crawler and getattr(self.crawler, "spider", None))
        logger = getattr(spider_inst, "logger", None) or logging.getLogger("scrapers.pipelines.vault")
        name = getattr(spider_inst, "name", "all_spiders")
        logger.info(
            f"[VaultPipeline] Spider {name} finished. Ingested: {self.ingested_count}, Duplicates skipped: {self.duplicate_count}"
        )
