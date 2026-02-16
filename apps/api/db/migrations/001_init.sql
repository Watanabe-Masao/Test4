CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS stores (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imports (
    id UUID PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES stores(id),
    imported_by TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    source_sha256 TEXT NOT NULL,
    raw_payload TEXT NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imports_normalized (
    id UUID PRIMARY KEY,
    import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES stores(id),
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    metric_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_metrics (
    id UUID PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES stores(id),
    metric_date DATE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    source_import_id UUID NOT NULL REFERENCES imports(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (store_id, metric_date, source_import_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY,
    store_id BIGINT NOT NULL REFERENCES stores(id),
    generated_from_import_id UUID NOT NULL REFERENCES imports(id),
    generated_by TEXT NOT NULL,
    snapshot_json JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imports_store_id ON imports(store_id);
CREATE INDEX IF NOT EXISTS idx_imports_imported_at ON imports(imported_at);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_store_date ON daily_metrics(store_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_reports_generated_import_id ON reports(generated_from_import_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

INSERT INTO stores (code, name)
VALUES ('TOKYO-001', 'Tokyo Main Store')
ON CONFLICT (code) DO NOTHING;
