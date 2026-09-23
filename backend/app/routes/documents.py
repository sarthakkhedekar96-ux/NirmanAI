from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from backend.app.schemas.document import SearchResponse
from backend.app.services.retrieval_service import RetrievalService
from backend.app.services.document_service import DocumentService
from backend.app.core.auth_dependencies import get_current_user

router = APIRouter(prefix="/api/documents", tags=["PAIMANA Knowledge & RAG Retrieval"], dependencies=[Depends(get_current_user)])

retrieval_service = RetrievalService()
document_service = DocumentService()


from backend.app.services.cache_service import cache_service

@router.get("/search", response_model=SearchResponse)
def search_documents(
    q: Optional[str] = Query(None, description="Query search string"),
    query: Optional[str] = Query(None, description="Query search string alias"),
    project_code: Optional[str] = Query(None, description="Optional 9-digit PAIMANA project code pre-filter"),
    reporting_month: Optional[str] = Query(None, description="Optional reporting month pre-filter (YYYY-MM)"),
    document_type: Optional[str] = Query(None, description="Optional document type filter"),
    top_k: int = Query(5, ge=1, le=50, description="Number of top chunks to retrieve")
):
    """Search PAIMANA document corpus using hybrid lexical + vector dense similarity RRF retrieval."""
    search_term = q or query or ""
    if not search_term.strip():
        raise HTTPException(status_code=400, detail="Query search string cannot be empty.")
        
    cache_key = f"rag:search:{search_term}:{project_code}:{reporting_month}:{document_type}:{top_k}"
    cached = cache_service.get(cache_key)
    if cached:
        return cached

    try:
        results = retrieval_service.search(
            query=search_term,
            project_code=project_code,
            reporting_month=reporting_month,
            document_type=document_type,
            top_k=top_k
        )
        cache_service.set(cache_key, results, ttl_seconds=300)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval search error: {str(e)}")



from backend.app.services.project_service import get_project_details

@router.get("/project/{project_code}")
def get_project_documents(project_code: str, limit: int = Query(10, ge=1, le=100)):
    """Retrieve historical PAIMANA document chunks referencing a specific project code."""
    proj = get_project_details(project_code)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project code '{project_code}' not found.")

    limit_val = limit.default if hasattr(limit, 'default') else int(limit)
    docs = document_service.get_project_documents(project_code=project_code, limit=limit_val) or []
    return {
        "project_code": project_code,
        "total_documents": len(docs),
        "document_chunks": docs
    }


@router.get("/stats")
def get_corpus_statistics():
    """Retrieve PAIMANA corpus metadata and document chunk statistics."""
    try:
        return document_service.get_corpus_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch document stats: {str(e)}")
