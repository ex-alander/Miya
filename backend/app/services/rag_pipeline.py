"""
Hybrid RAG for document-grounded prompts: chunking, FAISS + BM25, LangChain.

Indexes are built in-memory per request (no persistent vector DB).
"""

from __future__ import annotations

import logging

from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.retrievers.ensemble import EnsembleRetriever

from app.core.config import settings

logger = logging.getLogger(__name__)

# cl100k_base — same family as GPT-4* tokenization; good heuristic for chunk budgets
_CHUNK_ENCODER = None


def _encoding():
    global _CHUNK_ENCODER
    if _CHUNK_ENCODER is None:
        import tiktoken

        _CHUNK_ENCODER = tiktoken.get_encoding("cl100k_base")
    return _CHUNK_ENCODER


def _token_len(text: str) -> int:
    return len(_encoding().encode(text))


def _llm_api_key() -> str:
    return (settings.PROXY_API_KEY or settings.GROQ_API_KEY or "").strip()


def is_rag_embedding_configured() -> bool:
    """Embeddings use the same OpenAI-compatible key as chat."""
    return bool(_llm_api_key() and settings.OPENAI_COMPAT_BASE_URL)


def build_openai_embeddings() -> OpenAIEmbeddings:
    return OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        openai_api_key=_llm_api_key(),
        openai_api_base=settings.OPENAI_COMPAT_BASE_URL,
    )


def split_source_documents(full_text: str) -> list[Document]:
    """Chunk document text (~1000 tokens, overlap ~200) using LangChain splitter."""
    text = (full_text or "").strip()
    if not text:
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=_token_len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    return [Document(page_content=c, metadata={"chunk_index": i}) for i, c in enumerate(chunks) if c.strip()]


def hybrid_top_chunks(
    full_text: str,
    *,
    map_title: str | None = None,
    top_k: int = 3,
    embeddings: Embeddings | None = None,
) -> list[str]:
    """
    Build in-memory FAISS + BM25 and return up to `top_k` unique chunk texts.

    `embeddings` is injectable for tests (FakeEmbeddings); production passes None.
    """
    docs = split_source_documents(full_text)
    if not docs:
        return []

    if len(docs) <= top_k:
        return [d.page_content for d in docs[:top_k]]

    emb = embeddings if embeddings is not None else build_openai_embeddings()

    vectorstore = FAISS.from_documents(docs, emb)
    vector_retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})

    bm25 = BM25Retriever.from_documents(docs)
    bm25.k = top_k

    hybrid = EnsembleRetriever(
        retrievers=[vector_retriever, bm25],
        weights=[0.5, 0.5],
    )

    title = (map_title or "").strip()
    head = full_text.strip()[:12000]
    retrieval_query = f"{title}\n\n{head}".strip() if title else head

    try:
        ranked = hybrid.invoke(retrieval_query)
    except Exception:
        logger.exception("Hybrid retrieval failed; falling back to first chunks")
        return [d.page_content for d in docs[:top_k]]

    seen: set[str] = set()
    out: list[str] = []
    for doc in ranked:
        key = doc.page_content.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(doc.page_content)
        if len(out) >= top_k:
            break

    if len(out) < top_k:
        for d in docs:
            k = d.page_content.strip()
            if k and k not in seen:
                seen.add(k)
                out.append(d.page_content)
            if len(out) >= top_k:
                break

    return out[:top_k]
