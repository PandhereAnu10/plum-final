-- Plum OPD: core schema (policies, claims, documents, extraction, adjudication)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    effective_from DATE,
    effective_to DATE,
    terms JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID REFERENCES policies (id) ON DELETE SET NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    treatment_date DATE NOT NULL,
    claim_amount NUMERIC(14, 2) NOT NULL CHECK (claim_amount >= 0),
    status TEXT NOT NULL DEFAULT 'draft',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX claims_status_idx ON claims (status);
CREATE INDEX claims_member_id_idx ON claims (member_id);
CREATE INDEX claims_created_at_idx ON claims (created_at DESC);

CREATE TABLE claim_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims (id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX claim_documents_claim_id_idx ON claim_documents (claim_id);

CREATE TABLE extracted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL UNIQUE REFERENCES claims (id) ON DELETE CASCADE,
    raw_ocr_text TEXT,
    structured JSONB NOT NULL DEFAULT '{}'::jsonb,
    model TEXT,
    extraction_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE adjudication_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL UNIQUE REFERENCES claims (id) ON DELETE CASCADE,
    decision TEXT NOT NULL,
    approved_amount NUMERIC(14, 2),
    deductions JSONB NOT NULL DEFAULT '{}'::jsonb,
    rejected_items JSONB,
    rejection_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    confidence_score NUMERIC(5, 4),
    reasoning TEXT,
    notes TEXT,
    step_trace JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX adjudication_results_decision_idx ON adjudication_results (decision);

-- Keep claims.updated_at fresh on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_set_updated_at
BEFORE UPDATE ON claims
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
