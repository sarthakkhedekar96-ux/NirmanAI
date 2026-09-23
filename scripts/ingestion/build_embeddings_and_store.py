import sys
import json
from pathlib import Path
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch, Json
try:
    from tqdm import tqdm
except ImportError:
    def tqdm(iterable, **kwargs):
        return iterable

# Add parent directory to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.app.config import DATABASE_URL
from backend.app.services.embedding_service import EmbeddingService

CHUNKS_PATH = Path("processed/documents/chunks.parquet")


def init_db(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id SERIAL PRIMARY KEY,
                chunk_id VARCHAR(150) UNIQUE NOT NULL,
                content TEXT NOT NULL,
                embedding REAL[],
                source_file VARCHAR(255) NOT NULL,
                relative_path VARCHAR(500),
                page_number INT NOT NULL,
                reporting_month VARCHAR(10) NOT NULL,
                reporting_year VARCHAR(20),
                project_code VARCHAR(50),
                document_type VARCHAR(50),
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_doc_chunks_project_code ON document_chunks(project_code);
            CREATE INDEX IF NOT EXISTS idx_doc_chunks_rep_month ON document_chunks(reporting_month);
            CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_type ON document_chunks(document_type);
            CREATE INDEX IF NOT EXISTS idx_doc_chunks_project_codes ON document_chunks ((metadata->>'project_codes'));
        """)
    conn.commit()
    print("[Database] Verified document_chunks table schema and indexes.")


def process_and_store():
    print("=== BUILDING EMBEDDINGS & POPULATING POSTGRESQL DOCUMENT STORE ===")
    
    if not CHUNKS_PATH.exists():
        raise FileNotFoundError(f"Chunks parquet file not found at {CHUNKS_PATH}. Run extract_and_chunk_documents.py first.")

    chunks_df = pd.read_parquet(CHUNKS_PATH)
    print(f"Loaded {len(chunks_df):,} chunks from {CHUNKS_PATH}")

    # Initialize Embedding Service
    embedder = EmbeddingService()
    
    if embedder.mode == "unfitted_tfidf_svd":
        print("Fitting TF-IDF SVD encoder on chunk contents...")
        embedder.fit_fallback(chunks_df["content"].tolist())

    # Generate Embeddings in Batches if fitted model is active
    if embedder.mode in ["sentence_transformer", "tfidf_svd"]:
        print("Generating dense vector embeddings...")
        batch_size = 5000
        all_embeddings = []
        for i in tqdm(range(0, len(chunks_df), batch_size), desc="Encoding batches"):
            batch_texts = chunks_df["content"].iloc[i:i + batch_size].tolist()
            batch_embeds = embedder.encode(batch_texts)
            all_embeddings.extend(batch_embeds.tolist())
        chunks_df["embedding"] = all_embeddings
    else:
        print("[EmbeddingService] Skipping dense embedding calculation (dummy mode). Setting embedding column to NULL.")
        chunks_df["embedding"] = [None] * len(chunks_df)

    # Connect to PostgreSQL
    print(f"Connecting to PostgreSQL: {DATABASE_URL}")
    conn = psycopg2.connect(DATABASE_URL)
    init_db(conn)

    # Insert / Upsert Chunks into PostgreSQL using ON CONFLICT DO NOTHING
    insert_sql = """
        INSERT INTO document_chunks (
            chunk_id, content, embedding, source_file, relative_path,
            page_number, reporting_month, reporting_year, project_code,
            document_type, metadata
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (chunk_id) DO NOTHING;
    """

    records_to_insert = []
    print("Preparing tuples for database insertion...")
    for row in chunks_df.itertuples(index=False):
        cleaned_content = str(row.content).replace("\x00", "").replace("\u0000", "")
        p_codes_str = str(row.project_codes).replace("\x00", "") if getattr(row, "project_codes", None) else ""
        meta = {
            "char_count": int(getattr(row, "char_count", len(cleaned_content))),
            "word_count": int(getattr(row, "word_count", len(cleaned_content.split()))),
            "project_codes": p_codes_str
        }
        raw_pcode = str(row.project_code).replace("\x00", "").strip() if getattr(row, "project_code", None) else ""
        p_code = raw_pcode if raw_pcode not in ["None", "nan", ""] else None
        
        rel_path = str(row.relative_path).replace("\x00", "") if getattr(row, "relative_path", None) else ""

        records_to_insert.append((
            str(row.chunk_id).replace("\x00", ""),
            cleaned_content,
            row.embedding,  # List of floats or None
            str(row.source_file).replace("\x00", ""),
            rel_path,
            int(row.page_number),
            str(row.reporting_month).replace("\x00", ""),
            str(row.reporting_year).replace("\x00", ""),
            p_code,
            str(row.document_type).replace("\x00", ""),
            Json(meta)
        ))

    print(f"Upserting {len(records_to_insert):,} chunks into PostgreSQL...")
    db_batch_size = 10000
    with conn.cursor() as cur:
        for i in tqdm(range(0, len(records_to_insert), db_batch_size), desc="Database batch insert"):
            batch = records_to_insert[i:i + db_batch_size]
            execute_batch(cur, insert_sql, batch)
            conn.commit()
            print(f"Committed batch {i // db_batch_size + 1}/{(len(records_to_insert) + db_batch_size - 1) // db_batch_size} ({min(i + db_batch_size, len(records_to_insert)):,}/{len(records_to_insert):,} rows)")

    conn.close()

    print("\n" + "=" * 90)
    print("DOCUMENT STORE EMBEDDINGS & POSTGRES POPULATION COMPLETE")
    print("=" * 90)
    print(f"Total Stored Document Chunks: {len(chunks_df):,}")
    print("PostgreSQL Table `document_chunks` is ready for hybrid retrieval queries.")


if __name__ == "__main__":
    process_and_store()
