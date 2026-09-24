import math
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from typing import List, Optional, Dict, Any

from backend.app.config import DATABASE_URL
from backend.app.services.embedding_service import EmbeddingService
from backend.app.schemas.document import DocumentChunkResponse, SearchResponse


class RetrievalService:
    def __init__(self, embedder: Optional[EmbeddingService] = None):
        self.embedder = embedder or EmbeddingService()

    def _get_connection(self):
        return psycopg2.connect(DATABASE_URL)

    def search(
        self,
        query: str,
        project_code: Optional[str] = None,
        reporting_month: Optional[str] = None,
        document_type: Optional[str] = None,
        top_k: int = 5
    ) -> SearchResponse:
        """Perform hybrid retrieval over document_chunks combining pre-filtering, vector search, lexical ranking, and RRF."""
        
        # 1. Fetch Candidate Chunks matching metadata pre-filters
        rows = []
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if project_code:
                    # Strategy A: Fast indexed query on exact project_code (<10ms)
                    sql_exact = """
                        SELECT chunk_id, content, embedding, source_file, relative_path,
                               page_number, reporting_month, reporting_year, project_code,
                               document_type, metadata
                        FROM document_chunks
                        WHERE project_code = %s
                        ORDER BY reporting_year DESC, reporting_month DESC
                        LIMIT 150;
                    """
                    cur.execute(sql_exact, [project_code])
                    rows = cur.fetchall()

                    # Strategy B: Fallback to metadata JSON lookup if exact project_code produced 0 matches
                    if not rows:
                        sql_meta = """
                            SELECT chunk_id, content, embedding, source_file, relative_path,
                                   page_number, reporting_month, reporting_year, project_code,
                                   document_type, metadata
                            FROM document_chunks
                            WHERE (project_code = %s OR metadata->>'project_codes' LIKE %s)
                            LIMIT 200;
                        """
                        cur.execute(sql_meta, [project_code, f"%{project_code}%"])
                        rows = cur.fetchall()

                    # Strategy C: Fallback to content text search if metadata produced 0 matches
                    if not rows:
                        sql_content = """
                            SELECT chunk_id, content, embedding, source_file, relative_path,
                                   page_number, reporting_month, reporting_year, project_code,
                                   document_type, metadata
                            FROM document_chunks
                            WHERE content LIKE %s
                            LIMIT 150;
                        """
                        cur.execute(sql_content, [f"%{project_code}%"])
                        rows = cur.fetchall()
                else:
                    # Generic query: bounded candidate pool for high performance
                    where_clauses = []
                    params = []
                    if reporting_month:
                        where_clauses.append("reporting_month = %s")
                        params.append(reporting_month)
                    if document_type:
                        where_clauses.append("document_type = %s")
                        params.append(document_type)

                    where_str = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
                    sql_generic = f"""
                        SELECT chunk_id, content, embedding, source_file, relative_path,
                               page_number, reporting_month, reporting_year, project_code,
                               document_type, metadata
                        FROM document_chunks
                        {where_str}
                        LIMIT 250;
                    """
                    cur.execute(sql_generic, params)
                    rows = cur.fetchall()
        except Exception as err:
            print(f"[RetrievalService] DB query exception: {err}")
            rows = []
        finally:
            conn.close()

        if not rows:
            return SearchResponse(
                query=query,
                total_matches=0,
                retrieved_chunks=[],
                retrieval_method="hybrid_rrf"
            )

        # 2. Vector Similarity Scoring
        query_vector = self.embedder.encode(query)  # float array, 384 dims
        query_norm = np.linalg.norm(query_vector)
        query_norm = query_norm if query_norm > 0 else 1.0

        vector_scores = []
        lexical_scores = []
        
        query_terms = set(query.lower().split())
        # Remove common stop words for lexical match
        stop_words = {"the", "a", "an", "is", "in", "of", "to", "for", "on", "and", "or", "what", "which", "show", "tell", "report"}
        keywords = [w for w in query_terms if w not in stop_words and len(w) > 1]

        for r in rows:
            # Dense Cosine Similarity
            chunk_embed = np.array(r["embedding"], dtype=np.float32) if r["embedding"] else np.zeros(384, dtype=np.float32)
            c_norm = np.linalg.norm(chunk_embed)
            c_norm = c_norm if c_norm > 0 else 1.0
            cos_sim = float(np.dot(query_vector, chunk_embed) / (query_norm * c_norm))
            vector_scores.append(cos_sim)

            # Lexical BM25-style term frequency score
            content_lower = r["content"].lower()
            lex_score = 0.0
            for kw in keywords:
                count = content_lower.count(kw)
                if count > 0:
                    lex_score += (1.0 + math.log(count))
            
            # Exact project code match boost
            if project_code and (r["project_code"] == project_code or (r["metadata"] and project_code in str(r["metadata"]))):
                lex_score += 5.0
                
            lexical_scores.append(lex_score)

        # 3. Reciprocal Rank Fusion (RRF)
        # Rank by vector similarity (descending)
        v_ranked_indices = np.argsort(vector_scores)[::-1]
        v_ranks = {idx: rank + 1 for rank, idx in enumerate(v_ranked_indices)}

        # Rank by lexical score (descending)
        l_ranked_indices = np.argsort(lexical_scores)[::-1]
        l_ranks = {idx: rank + 1 for rank, idx in enumerate(l_ranked_indices)}

        k_rrf = 60.0
        rrf_scores = []
        for i in range(len(rows)):
            score = (1.0 / (k_rrf + v_ranks[i])) + (1.0 / (k_rrf + l_ranks[i]))
            rrf_scores.append(score)

        # Sort by RRF score
        top_indices = np.argsort(rrf_scores)[::-1][:top_k]

        retrieved_chunks = []
        for idx in top_indices:
            r = rows[idx]
            p_code_str = f" - Project {r['project_code']}" if r["project_code"] else ""
            citation = f"PAIMANA Report ({r['reporting_month']}), File: {r['source_file']}, Page {r['page_number']}{p_code_str}"
            
            meta_dict = r["metadata"] if isinstance(r["metadata"], dict) else {}

            retrieved_chunks.append(DocumentChunkResponse(
                chunk_id=r["chunk_id"],
                content=r["content"],
                source_file=r["source_file"],
                relative_path=r["relative_path"],
                page_number=r["page_number"],
                reporting_month=r["reporting_month"],
                reporting_year=r["reporting_year"],
                project_code=r["project_code"],
                document_type=r["document_type"],
                similarity_score=round(float(vector_scores[idx]), 4),
                lexical_score=round(float(lexical_scores[idx]), 4),
                combined_score=round(float(rrf_scores[idx]), 6),
                citation=citation,
                metadata=meta_dict
            ))

        return SearchResponse(
            query=query,
            total_matches=len(rows),
            retrieved_chunks=retrieved_chunks,
            retrieval_method="hybrid_rrf"
        )
