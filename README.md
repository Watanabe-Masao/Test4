# Test4 - Import & Reporting MVP

## Added components

- `apps/api`: Rust + Axum API with OpenAPI contract.
- `apps/api/db/migrations/001_init.sql`: PostgreSQL schema for stores/suppliers/imports/daily_metrics/reports + audit logs.
- `apps/web/src/api/generated.ts`: Generated API types (OpenAPI-based).
- `apps/web/src/api/client.ts`: Typed API client sample.

## API flow implemented

1. Upload CSV (`date,supplier,amount`) via `POST /v1/imports`.
2. Normalize rows.
3. Aggregate by date and return totals.
4. Persist raw payload, normalized rows, daily metrics, report snapshot, and audit logs.

## Run API

```bash
cd apps/api
cargo run
```

Environment variable:

- `DATABASE_URL=postgres://...`

## Generate front-end API types

```bash
cd apps/web
npm run generate:api
```

If npm registry access is restricted in your environment, `src/api/generated.ts` can be updated manually from `apps/api/openapi.yaml`.
