import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import psycopg2
from psycopg2.extras import RealDictCursor
from backend.app.config import DATABASE_URL
from backend.app.services.document_service import DocumentService

def test_document_chunks_store_and_retrieval():
    print("=== TEST: DOCUMENT CHUNKS STORE & RETRIEVAL ===")
    conn = psycopg2.connect(DATABASE_URL)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Check table row count
        cur.execute("SELECT COUNT(*) as cnt FROM document_chunks;")
        total_cnt = cur.fetchone()["cnt"]
        assert total_cnt == 331206, f"Expected 331,206 chunks in DB, got {total_cnt}"
        print(f"[PASS] PostgreSQL `document_chunks` row count = {total_cnt:,}")

        # Check unique chunk_id
        cur.execute("SELECT COUNT(chunk_id) - COUNT(DISTINCT chunk_id) as dupes FROM document_chunks;")
        dupes = cur.fetchone()["dupes"]
        assert dupes == 0, f"Expected 0 duplicate chunk_ids, got {dupes}"
        print(f"[PASS] Duplicate chunk_ids = {dupes}")

        # Check no NULL/invalid chunk_ids
        cur.execute("SELECT COUNT(*) as nulls FROM document_chunks WHERE chunk_id IS NULL OR chunk_id = '';")
        nulls = cur.fetchone()["nulls"]
        assert nulls == 0, f"Expected 0 null chunk_ids, got {nulls}"
        print(f"[PASS] NULL/invalid chunk_ids = {nulls}")

    conn.close()

    # Check 3-tier retrieval logic for the 5 projects
    doc_service = DocumentService()
    
    # 1. N26000118 (Metadata Exact Match via JSONB project_codes)
    docs_n26 = doc_service.get_project_documents("N26000118")
    assert len(docs_n26) > 0, "N26000118 should return document chunks"
    assert docs_n26[0]["match_type"] == "METADATA_EXACT", f"Expected METADATA_EXACT for N26000118, got {docs_n26[0]['match_type']}"
    print(f"[PASS] N26000118: {len(docs_n26)} citations via {docs_n26[0]['match_type']}")

    # 2. 020100044 (Metadata Exact Match via direct column & JSONB)
    docs_020 = doc_service.get_project_documents("020100044")
    assert len(docs_020) > 0, "020100044 should return document chunks"
    assert docs_020[0]["match_type"] == "METADATA_EXACT", f"Expected METADATA_EXACT for 020100044, got {docs_020[0]['match_type']}"
    print(f"[PASS] 020100044: {len(docs_020)} citations via {docs_020[0]['match_type']}")

    # 3. 220100262 (Content Fallback Match)
    docs_2202 = doc_service.get_project_documents("220100262")
    assert len(docs_2202) > 0, "220100262 should return content fallback chunks"
    assert docs_2202[0]["match_type"] == "CONTENT_FALLBACK", f"Expected CONTENT_FALLBACK for 220100262, got {docs_2202[0]['match_type']}"
    assert "220100262" in docs_2202[0]["content"], "Content should contain project code 220100262"
    print(f"[PASS] 220100262: {len(docs_2202)} citations via {docs_2202[0]['match_type']}")

    # 4. 220100133 (Content Fallback Match)
    docs_2201 = doc_service.get_project_documents("220100133")
    assert len(docs_2201) > 0, "220100133 should return content fallback chunks"
    assert docs_2201[0]["match_type"] == "CONTENT_FALLBACK", f"Expected CONTENT_FALLBACK for 220100133, got {docs_2201[0]['match_type']}"
    print(f"[PASS] 220100133: {len(docs_2201)} citations via {docs_2201[0]['match_type']}")

    # 5. 020100001 (Honest Zero Match)
    docs_0200 = doc_service.get_project_documents("020100001")
    assert len(docs_0200) == 0, f"Expected 0 citations for 020100001, got {len(docs_0200)}"
    print("[PASS] 020100001: 0 citations (Honest Zero)")

def test_recommendation_contract():
    print("\n=== TEST: RECOMMENDATION BACKEND CONTRACT FIELDS ===")
    from backend.app.services.recommendation_engine import PrescriptiveRecommendationEngine
    engine = PrescriptiveRecommendationEngine()

    # Test golden project 020100044
    res = engine.get_project_recommendations("020100044")
    assert res is not None, "Golden project 020100044 recommendations should not be None"
    recs = res.get("recommendations", [])
    assert len(recs) > 0, "Golden project 020100044 should have active recommendations"
    
    first_rec = recs[0]
    expected_keys = ["recommendation_code", "triggered", "severity", "trigger_conditions", "rationale", "recommended_review"]
    for key in expected_keys:
        assert key in first_rec, f"Missing backend contract field '{key}' in recommendation"
    
    print(f"[PASS] PrescriptiveRecommendationEngine returns contract fields: {expected_keys}")
    print(f"[PASS] Recommendation Code: {first_rec['recommendation_code']}, Severity: {first_rec['severity']}")

if __name__ == "__main__":
    test_document_chunks_store_and_retrieval()
    test_recommendation_contract()
    print("\n=================================================================")
    print("ALL RECOMMENDATION & RAG TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")
