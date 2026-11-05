"""
Unit Test Suite for Asset Bridge Regulatory Crawler & Ingestion Pipeline.
Verifies: Phase 1 lightweight poller, Scrapy items & pipelines,
Document Vault FTS5 indexing, deduplication, Redis storage engine with fallback,
and regulatory API endpoints.
"""

import sys
import uuid
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
SCRAPERS_DIR = ROOT_DIR / "scrapers"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SCRAPERS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPERS_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.store import store
from app.ai_bot import (
    ingest_regulation_document,
    list_regulations,
    search_user_documents,
    delete_user_document
)
from scripts.poll_regulations import (
    poll_rbi_notifications,
    poll_sebi_circulars,
    poll_epfo_circulars,
    poll_irdai_circulars,
    poll_all_regulators
)

try:
    from scrapers.items import RegulationItem
except ImportError:
    from scrapers.scrapers.items import RegulationItem

try:
    from scrapers.pipelines import AssetBridgeVaultPipeline, RedisRegulationPipeline
except ImportError:
    from scrapers.scrapers.pipelines import AssetBridgeVaultPipeline, RedisRegulationPipeline

try:
    from scrapers.redis_store import RedisRegulationStore
except ImportError:
    from scrapers.scrapers.redis_store import RedisRegulationStore

client = TestClient(app)

def test_ingest_regulation_document_and_fts5_indexing():
    print("--- 1. Testing Regulation Ingestion, Deduplication & FTS5 Indexing ---")
    unique_tag = uuid.uuid4().hex[:8]
    circ_title = f"Reserve Bank Circular on Mandatory Deceased Depositor Settlement {unique_tag}"
    circ_no = f"RBI/2026-27/{unique_tag}"
    source_url = f"https://rbi.org.in/test/notification-{unique_tag}.aspx"
    sample_text = (
        f"Section 45ZA special directive {unique_tag}. Commercial banks are mandated "
        "to settle all deceased depositor claims within 15 calendar days. Delay attracts penal interest at Bank Rate + 4%."
    )

    # Initial ingestion
    res = ingest_regulation_document(
        regulator="RBI",
        title=circ_title,
        source_url=source_url,
        text=sample_text,
        circular_no=circ_no,
        publication_date="May 01, 2026",
        category="Deceased Depositors"
    )

    assert res["ok"] is True
    assert res["duplicate"] is False
    assert res["chunksIndexed"] > 0
    doc_id = res["docId"]
    assert doc_id.startswith("reg_")

    # Duplicate ingestion
    res_dup = ingest_regulation_document(
        regulator="RBI",
        title=circ_title,
        source_url=source_url,
        text=sample_text,
        circular_no=circ_no,
        publication_date="May 01, 2026"
    )
    assert res_dup["ok"] is True
    assert res_dup["duplicate"] is True
    assert res_dup["chunksIndexed"] == 0

    # Verify searchable via FTS5 using unique tag
    search_res = search_user_documents(query=unique_tag, user_id="SYSTEM", limit=10)
    assert len(search_res) > 0
    found_titles = [m.get("title") for m in search_res]
    assert any(unique_tag in t for t in found_titles)

    # Clean up document to verify cascade FTS5 deletion and avoid disk pollution
    deleted = delete_user_document(doc_id=doc_id, user_id="SYSTEM")
    assert deleted is True

    # Post-deletion verification using unique tag
    post_delete_search = search_user_documents(query=unique_tag, user_id="SYSTEM", limit=10)
    assert len(post_delete_search) == 0
    print(f"[PASS] Ingested, indexed, deduplicated, and clean-deleted {circ_title}.")

def test_list_and_search_regulations():
    print("--- 2. Testing Regulatory Listing & Query Filtering ---")
    unique_tag = uuid.uuid4().hex[:6]
    # Ingest guaranteed test circular
    ingest_res = ingest_regulation_document(
        regulator="RBI",
        title=f"Reserve Bank Master Direction on Deceased Depositor Settlement {unique_tag}",
        source_url=f"https://rbi.org.in/test/baseline-settlement-{unique_tag}.aspx",
        text="Mandates banks to settle claims within 15 days or pay penal interest.",
        circular_no=f"RBI/BASELINE/SETTLE/{unique_tag}",
        publication_date="April 02, 2025",
        category="Banking & Deceased Depositors"
    )
    doc_id = ingest_res.get("docId")

    try:
        all_regs = list_regulations(limit=10)
        assert isinstance(all_regs, list)
        assert len(all_regs) > 0

        rbi_regs = list_regulations(regulator="RBI", limit=10)
        assert len(rbi_regs) > 0
        for r in rbi_regs:
            assert r["regulator"] == "RBI"

        filtered = list_regulations(q="settle", limit=10)
        assert len(filtered) > 0
        assert any("settle" in (r.get("title", "") + r.get("fileName", "")).lower() for r in filtered)
    finally:
        if doc_id:
            delete_user_document(doc_id=doc_id, user_id="SYSTEM")

    print(f"[PASS] Regulatory catalog query returned {len(filtered)} filtered circulars.")

def test_phase1_lightweight_pollers():
    print("--- 3. Testing Phase 1 Lightweight Regulatory Pollers ---")
    rbi_res = poll_rbi_notifications(limit=2)
    assert isinstance(rbi_res, list)

    sebi_res = poll_sebi_circulars(limit=2)
    assert isinstance(sebi_res, list)

    epfo_res = poll_epfo_circulars(limit=2)
    assert isinstance(epfo_res, list)

    irdai_res = poll_irdai_circulars(limit=2)
    assert isinstance(irdai_res, list)

    summary = poll_all_regulators(limit=1, persist=False)
    assert summary["totalPolled"] >= 4
    assert "items" in summary
    print(f"[PASS] Phase 1 poller completed: {summary['totalPolled']} sources polled.")

def test_scrapy_pipeline_processing():
    print("--- 4. Testing Scrapy Item and AssetBridgeVaultPipeline ---")
    pipeline = AssetBridgeVaultPipeline()
    
    class DummySpider:
        name = "test_spider"
        class Logger:
            def info(self, msg): pass
            def warning(self, msg): pass
        logger = Logger()

    unique_tag = uuid.uuid4().hex[:6]
    circ_no = f"SEBI/HO/IMD/TEST-{unique_tag}"
    item = RegulationItem(
        regulator="SEBI",
        title=f"SEBI Test Circular for Mutual Fund Unit Transmission {unique_tag}",
        circular_no=circ_no,
        date="May 05, 2026",
        source_url=f"https://www.sebi.gov.in/test/mf-transmission-{unique_tag}.html",
        raw_text="Mutual fund units must be transmitted within 15 calendar days upon submission of death certificate and KYC.",
        category="Mutual Funds",
        scraped_at="2026-05-05T00:00:00Z"
    )

    try:
        processed = pipeline.process_item(item, DummySpider())
        assert processed["title"] == item["title"]
        assert pipeline.ingested_count == 1

        # Second pass: duplicate verification
        processed_dup = pipeline.process_item(item, DummySpider())
        assert pipeline.duplicate_count == 1
    finally:
        created_doc = store.find("user_documents", lambda d: d.get("circularNo") == circ_no)
        if created_doc:
            delete_user_document(doc_id=created_doc["id"], user_id="SYSTEM")

    print("[PASS] Scrapy pipeline item processed into Document Vault with duplicate detection and clean teardown.")

def test_redis_store_and_pipeline():
    print("--- 5. Testing Redis Storage Engine and Pipeline Fallback ---")
    store_inst = RedisRegulationStore()
    
    class DummySpider:
        name = "redis_test_spider"
        class Logger:
            def info(self, msg): pass
            def warning(self, msg): pass
        logger = Logger()

    redis_pipe = RedisRegulationPipeline()
    unique_tag = uuid.uuid4().hex[:6]
    unique_circ = f"RBI/TEST/REDIS/{unique_tag}"

    # Use isolated test jsonl file to avoid dirtying git-tracked scrapers/data/regulations.jsonl
    test_jsonl = redis_pipe.data_dir / f"test_regulations_{unique_tag}.jsonl"
    redis_pipe.jsonl_path = test_jsonl

    item = RegulationItem(
        regulator="RBI",
        title=f"RBI Notification on Deceased Claim Interest Penalty {unique_tag}",
        circular_no=unique_circ,
        date="June 01, 2026",
        source_url=f"https://rbi.org.in/test/redis-interest-notice-{unique_tag}.aspx",
        raw_text="Bank Rate + 4% penal interest applies on delayed settlement.",
        category="Banking",
        scraped_at="2026-06-01T00:00:00Z"
    )

    try:
        processed = redis_pipe.process_item(item, DummySpider())
        assert processed["title"] == item["title"]
        assert "sha256" in processed
        assert test_jsonl.exists()
        
        # Check JSONL contents contains our unique circular reference
        with open(test_jsonl, "r", encoding="utf-8") as f:
            lines = f.readlines()
            assert len(lines) > 0
            assert any(unique_circ in line for line in lines)
    finally:
        if test_jsonl.exists():
            test_jsonl.unlink()
    
    print("[PASS] Redis pipeline processed item cleanly with isolated JSONL persistence and sha256 checksum.")

def test_api_endpoints():
    print("--- 6. Testing Regulatory API Endpoints ---")
    # GET /api/documents/regulations
    res = client.get("/api/documents/regulations?regulator=RBI&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "regulations" in data

    # POST /api/documents/ingest-regulation
    unique_no = f"EPFO/TEST/2026/{uuid.uuid4().hex[:6]}"
    post_res = client.post("/api/documents/ingest-regulation", json={
        "regulator": "EPFO",
        "title": f"EPFO Form 20 Digital Fast-Track Settlement Notice {unique_no}",
        "sourceUrl": f"https://epfindia.gov.in/test/notice-20-{unique_no}.html",
        "circularNo": unique_no,
        "date": "May 10, 2026",
        "text": "Digital settlement for Form 20 and EDLI insurance processed via Aadhaar authentication."
    })
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["ok"] is True
    assert post_data["regulator"] == "EPFO"
    doc_id = post_data.get("docId")
    if doc_id:
        delete_user_document(doc_id=doc_id, user_id="SYSTEM")

    # POST /api/documents/regulations/poll
    poll_res = client.post("/api/documents/regulations/poll?regulator=rbi&limit=1")
    assert poll_res.status_code == 200
    poll_data = poll_res.json()
    assert poll_data["ok"] is True
    assert "summary" in poll_data

    # POST /api/documents/regulations/crawl
    crawl_res = client.post("/api/documents/regulations/crawl?spider=sebi_circulars&limit=1")
    assert crawl_res.status_code == 200
    crawl_data = crawl_res.json()
    assert crawl_data["ok"] is True
    assert crawl_data["engine"] == "scrapy"
    assert crawl_data["spidersRun"] == 1
    assert "results" in crawl_data
    print("[PASS] API endpoints (GET, POST ingest, POST poll, POST crawl) verified 200 OK.")

if __name__ == "__main__":
    test_ingest_regulation_document_and_fts5_indexing()
    test_list_and_search_regulations()
    test_phase1_lightweight_pollers()
    test_scrapy_pipeline_processing()
    test_redis_store_and_pipeline()
    test_api_endpoints()
    print("\nALL 6 REGULATION CRAWLER & PIPELINE TESTS PASSED!")
