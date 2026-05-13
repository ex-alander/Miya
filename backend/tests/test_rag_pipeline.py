"""Offline tests for RAG chunking and hybrid FAISS + BM25 retrieval."""

from langchain_community.embeddings import FakeEmbeddings

from app.services import rag_pipeline


def test_split_source_documents_splits_long_text():
    long = ("слово " * 8000).strip()
    docs = rag_pipeline.split_source_documents(long)
    assert len(docs) >= 2
    for d in docs:
        assert rag_pipeline._token_len(d.page_content) <= 1100


def test_hybrid_top_chunks_returns_three_unique_with_fake_embeddings():
    text = "\n\n".join(
        [
            "Раздел альфа: фотосинтез происходит в хлоропластах растения.",
            "Раздел бета: митохондрии синтезируют АТФ окислительным фосфорилированием.",
            "Раздел гамма: рибосомы синтезируют белки по матрице мРНК.",
            "Раздел дельта: ядро клетки хранит ДНК в хромосомах.",
            "Раздел эпсилон: аппарат Гольджи модифицирует и сортирует белки.",
        ]
        * 25
    )
    emb = FakeEmbeddings(size=384)
    out = rag_pipeline.hybrid_top_chunks(
        text,
        map_title="Клеточная биология: обзор",
        top_k=3,
        embeddings=emb,
    )
    assert len(out) == 3
    assert len(set(out)) == 3
