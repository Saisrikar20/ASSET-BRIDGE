"""
Unit Test Suite for Asset Bridge Regulatory Crawler & Ingestion Pipeline.
Verifies: Phase 1 lightweight poller, Scrapy items & pipelines,
Document Vault FTS5 indexing, deduplication, Redis storage engine with fallback,
and regulatory API endpoints.
"""

import sys
import uuid
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR / "scrapers") not in sys.path:
    sys.path.insert(0, str(ROOT_DIR / "scrapers"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.store import store
from app.ai_bot import (
    ingest_regulation_document,
    list_regulations,
    search_user_documents
)
from scripts.poll_regulations import (
    poll_rbi_notifications,
    poll_sebi_circulars,
    poll_epfo_circulars,
    poll_irdai_circulars,
    poll_all_regulators
)
from scrapers.items import RegulationItem
from scrapers.pipelines import AssetBridgeVaultPipeline, RedisRegulationPipeline
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
        "Under Section 45ZA of the Banking Regulation Act 1949, commercial banks are mandated "
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

    # Verify searchable via FTS5
    search_res = search_user_documents(query=f"{unique_tag} Banking Regulation Act", user_id="SYSTEM", limit=10)
    assert len(search_res) > 0
    found_titles = [m.get("title") for m in search_res]
    assert any(unique_tag in t for t in found_titles)
    print(f"[PASS] Ingested and indexed {circ_title} ({res['chunksIndexed']} chunks in FTS5).")

def test_list_and_search_regulations():
    print("--- 2. Testing Regulatory Listing & Query Filtering ---")
    all_regs = list_regulations(limit=10)
    assert isinstance(all_regs, list)
    assert len(all_regs) > 0

    rbi_regs = list_regulations(regulator="RBI", limit=10)
    for r in rbi_regs:
        assert r["regulator"] == "RBI"

    filtered = list_regulations(q="settle", limit=10)
    assert len(filtered) > 0
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

    item = RegulationItem(
        regulator="SEBI",
        title="SEBI Test Circular for Mutual Fund Unit Transmission",
        circular_no="SEBI/HO/IMD/TEST-99",
        date="May 05, 2026",
        source_url="https://www.sebi.gov.in/test/mf-transmission.html",
        raw_text="Mutual fund units must be transmitted within 15 calendar days upon submission of death certificate and KYC.",
        category="Mutual Funds",
        scraped_at="2026-05-05T00:00:00Z"
    )

    processed = pipeline.process_item(item, DummySpider())
    assert processed["title"] == item["title"]
    print("[PASS] Scrapy pipeline item processed into Document Vault successfully.")

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
    item = RegulationItem(
        regulator="RBI",
        title="RBI Notification on Deceased Claim Interest Penalty",
        circular_no="RBI/TEST/REDIS/01",
        date="June 01, 2026",
        source_url="https://rbi.org.in/test/redis-interest-notice.aspx",
        raw_text="Bank Rate + 4% penal interest applies on delayed settlement.",
        category="Banking",
        scraped_at="2026-06-01T00:00:00Z"
    )

    processed = redis_pipe.process_item(item, DummySpider())
    assert processed["title"] == item["title"]
    assert redis_pipe.jsonl_path.exists()
    
    # Check JSONL contents
    with open(redis_pipe.jsonl_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        assert len(lines) > 0
        assert "RBI/TEST/REDIS/01" in lines[-1]
    
    print("[PASS] Redis pipeline processed item cleanly with JSONL persistence.")

def test_api_endpoints():
    print("--- 6. Testing Regulatory API Endpoints ---")
    # GET /api/documents/regulations
    res = client.get("/api/documents/regulations?regulator=RBI&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "regulations" in data

    # POST /api/documents/ingest-regulation
    post_res = client.post("/api/documents/ingest-regulation", json={
        "regulator": "EPFO",
        "title": "EPFO Form 20 Digital Fast-Track Settlement Notice",
        "sourceUrl": "https://epfindia.gov.in/test/notice-20.html",
        "circularNo": "EPFO/TEST/2026/01",
        "date": "May 10, 2026",
        "text": "Digital settlement for Form 20 and EDLI insurance processed via Aadhaar authentication."
    })
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["ok"] is True
    assert post_data["regulator"] == "EPFO"

    # POST /api/documents/regulations/poll
    poll_res = client.post("/api/documents/regulations/poll?limit=2")
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
    print("[PASS] API endpoints (GET, POST ingest, POST poll, POST crawl) verified 200 OK.")
