-- Decidix RAG Knowledge Store Migration 002
-- pgvector or cosine text search for grounded assistant answers

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not available in standard postgresql image, using JSON/ARRAY fallback for embeddings.';
END $$;

CREATE TABLE IF NOT EXISTS rag_documents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    arabic_title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    arabic_content TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_url TEXT,
    category VARCHAR(64) NOT NULL,
    region_id VARCHAR(64) REFERENCES regions(id) ON DELETE SET NULL,
    access_scope VARCHAR(32) NOT NULL DEFAULT 'public' CHECK (access_scope IN ('public', 'analyst', 'restricted')),
    metadata JSONB,
    embedding JSONB, -- Stored as float array, or vector if extension active
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_documents_category ON rag_documents(category);
CREATE INDEX IF NOT EXISTS idx_rag_documents_region ON rag_documents(region_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_access ON rag_documents(access_scope);

