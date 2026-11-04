"""
Unit Test Suite for Asset Bridge Regulatory Crawler & Ingestion Pipeline.
Verifies: Phase 1 lightweight poller, Scrapy items & pipelines,
Document Vault FTS5 indexing, deduplication, and regulatory API endpoints.
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
from app.aggregation.documents import (
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
from scrapers.pipelines import AssetBridgeVaultPipeline

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
    assert res["regulator"] == "RBI"
    assert res["circularNo"] == circ_no
    assert res["chunksIndexed"] > 0
    doc_id = res["docId"]
    assert doc_id.startswith("reg_")

    # Verify FTS5 search index finds it
    matches = search_user_documents(query="45ZA Banking Regulation", user_id="SYSTEM")
    assert len(matches) > 0
    assert any(m["documentId"] == doc_id for m in matches)

    # Deduplication test: re-ingesting same circular must return duplicate=True
    dup_res = ingest_regulation_document(
        regulator="RBI",
        title=circ_title,
        source_url=source_url,
        text=sample_text,
        circular_no=circ_no,
        publication_date="May 01, 2026"
    )
    assert dup_res["ok"] is True
    assert dup_res["duplicate"] is True
    assert dup_res["docId"] == doc_id
    print(f"[PASS] Ingestion and FTS5 indexing verified for doc {doc_id} with deduplication.")

def test_list_and_search_regulations():
    print("--- 2. Testing Regulation Querying & Filtering ---")
    all_regs = list_regulations(limit=20)
    assert len(all_regs) > 0

    rbi_regs = list_regulations(regulator="RBI", limit=10)
    assert len(rbi_regs) > 0
    assert all(r.get("regulator") == "RBI" for r in rbi_regs)

    search_regs = list_regulations(q="settlement", limit=10)
    assert len(search_regs) > 0
    print(f"[PASS] Successfully retrieved {len(all_regs)} circulars with regulator filtering.")

def test_phase1_lightweight_pollers():
    print("--- 3. Testing Phase 1 Lightweight Pollers (RBI, SEBI, EPFO, IRDAI) ---")
    rbi_items = poll_rbi_notifications(limit=2)
    assert len(rbi_items) > 0
    assert rbi_items[0]["regulator"] == "RBI"
    assert "sourceUrl" in rbi_items[0]

    sebi_items = poll_sebi_circulars(limit=2)
    assert len(sebi_items) > 0
    assert sebi_items[0]["regulator"] == "SEBI"

    epfo_items = poll_epfo_circulars(limit=1)
    assert len(epfo_items) > 0
    assert epfo_items[0]["regulator"] == "EPFO"

    irdai_items = poll_irdai_circulars(limit=1)
    assert len(irdai_items) > 0
    assert irdai_items[0]["regulator"] == "IRDAI"

    summary = poll_all_regulators(target_regulator="all", limit=2, persist=True)
    assert summary["ok"] is True
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
    pipeline.close_spider(DummySpider())
    print("[PASS] Scrapy pipeline item processed into Document Vault successfully.")

def test_api_endpoints():
    print("--- 5. Testing Regulatory API Endpoints ---")
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
    print("[PASS] API endpoints (GET, POST ingest, POST poll) verified 200 OK.")
