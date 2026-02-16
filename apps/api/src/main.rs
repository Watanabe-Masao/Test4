use std::{collections::BTreeMap, net::SocketAddr, sync::Arc};

use anyhow::Context;
use axum::{
    extract::{Multipart, State},
    http::{header, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, PgPool, Postgres, Transaction};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    openapi_yaml: Arc<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct NormalizedRow {
    date: NaiveDate,
    supplier_name: String,
    amount: f64,
}

#[derive(Debug, Serialize)]
struct ImportResult {
    import_id: Uuid,
    report_id: Uuid,
    store_id: i64,
    imported_by: String,
    imported_at: chrono::DateTime<Utc>,
    file_sha256: String,
    rows_count: usize,
    total_amount: f64,
    daily_totals: Vec<DailyTotal>,
}

#[derive(Debug, Serialize)]
struct DailyTotal {
    date: NaiveDate,
    total_amount: f64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "imports_api=debug,tower_http=info".to_string()),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL is required")?;
    let openapi_yaml =
        std::fs::read_to_string("openapi.yaml").context("failed to read openapi.yaml")?;

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .context("failed to connect database")?;

    let state = AppState {
        pool,
        openapi_yaml: Arc::new(openapi_yaml),
    };

    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/openapi.yaml", get(get_openapi))
        .route("/v1/imports", post(upload_import))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = "0.0.0.0:8080".parse()?;
    info!(%addr, "starting imports api");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn healthz() -> impl IntoResponse {
    Json(json!({ "ok": true }))
}

async fn get_openapi(State(state): State<AppState>) -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "application/yaml")],
        state.openapi_yaml.as_str().to_owned(),
    )
}

async fn upload_import(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut store_id: Option<i64> = None;
    let mut imported_by: Option<String> = None;
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(internal_error("failed reading multipart field"))?
    {
        let name = field.name().unwrap_or_default().to_string();
        match name.as_str() {
            "store_id" => {
                let value = field
                    .text()
                    .await
                    .map_err(internal_error("failed reading store_id"))?;
                store_id = value.parse::<i64>().ok();
            }
            "imported_by" => {
                imported_by = Some(
                    field
                        .text()
                        .await
                        .map_err(internal_error("failed reading imported_by"))?,
                );
            }
            "file" => {
                file_name = field.file_name().map(ToString::to_string);
                file_bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(internal_error("failed reading uploaded file"))?
                        .to_vec(),
                );
            }
            _ => {}
        }
    }

    let store_id = store_id.ok_or((StatusCode::BAD_REQUEST, "store_id is required".to_string()))?;
    let imported_by = imported_by.ok_or((
        StatusCode::BAD_REQUEST,
        "imported_by is required".to_string(),
    ))?;
    let file_bytes = file_bytes.ok_or((StatusCode::BAD_REQUEST, "file is required".to_string()))?;

    let raw_content = String::from_utf8(file_bytes.clone()).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "file must be UTF-8 text/csv".to_string(),
        )
    })?;
    let normalized_rows = normalize_csv(&raw_content)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("invalid csv: {e}")))?;

    let daily_totals_map = aggregate_daily(&normalized_rows);
    let daily_totals: Vec<DailyTotal> = daily_totals_map
        .iter()
        .map(|(date, total_amount)| DailyTotal {
            date: *date,
            total_amount: *total_amount,
        })
        .collect();
    let total_amount = daily_totals.iter().map(|d| d.total_amount).sum::<f64>();

    let imported_at = Utc::now();
    let file_sha256 = sha256_hex(&file_bytes);

    let mut tx = state
        .pool
        .begin()
        .await
        .map_err(internal_error("failed opening transaction"))?;

    let import_id = persist_import(
        &mut tx,
        store_id,
        &imported_by,
        file_name.as_deref().unwrap_or("upload.csv"),
        &file_sha256,
        &raw_content,
        imported_at,
    )
    .await
    .map_err(internal_error("failed persisting import"))?;

    persist_normalized_and_metrics(&mut tx, import_id, store_id, &normalized_rows)
        .await
        .map_err(internal_error("failed persisting metrics"))?;

    let report_id = persist_report(
        &mut tx,
        import_id,
        store_id,
        &imported_by,
        &daily_totals,
        total_amount,
    )
    .await
    .map_err(internal_error("failed persisting report"))?;

    tx.commit()
        .await
        .map_err(internal_error("failed committing transaction"))?;

    Ok((
        StatusCode::CREATED,
        Json(ImportResult {
            import_id,
            report_id,
            store_id,
            imported_by,
            imported_at,
            file_sha256,
            rows_count: normalized_rows.len(),
            total_amount,
            daily_totals,
        }),
    ))
}

fn normalize_csv(raw_content: &str) -> anyhow::Result<Vec<NormalizedRow>> {
    let mut rows = Vec::new();

    for (idx, line) in raw_content.lines().enumerate() {
        if idx == 0 {
            continue;
        }
        if line.trim().is_empty() {
            continue;
        }
        let cols: Vec<&str> = line.split(',').map(str::trim).collect();
        if cols.len() != 3 {
            anyhow::bail!("row {} must have 3 columns: date,supplier,amount", idx + 1);
        }
        let date = NaiveDate::parse_from_str(cols[0], "%Y-%m-%d")
            .with_context(|| format!("invalid date on row {}", idx + 1))?;
        let supplier_name = cols[1].to_string();
        let amount = cols[2]
            .parse::<f64>()
            .with_context(|| format!("invalid amount on row {}", idx + 1))?;

        rows.push(NormalizedRow {
            date,
            supplier_name,
            amount,
        });
    }

    Ok(rows)
}

fn aggregate_daily(rows: &[NormalizedRow]) -> BTreeMap<NaiveDate, f64> {
    let mut map = BTreeMap::new();
    for row in rows {
        *map.entry(row.date).or_insert(0.0) += row.amount;
    }
    map
}

async fn persist_import(
    tx: &mut Transaction<'_, Postgres>,
    store_id: i64,
    imported_by: &str,
    file_name: &str,
    file_sha256: &str,
    raw_payload: &str,
    imported_at: chrono::DateTime<Utc>,
) -> anyhow::Result<Uuid> {
    let import_id = Uuid::new_v4();

    sqlx::query(
        r#"
        INSERT INTO imports (
            id, store_id, imported_by, source_filename, source_sha256, raw_payload, imported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(import_id)
    .bind(store_id)
    .bind(imported_by)
    .bind(file_name)
    .bind(file_sha256)
    .bind(raw_payload)
    .bind(imported_at)
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO audit_logs (id, actor, action, target_type, target_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(imported_by)
    .bind("IMPORT_CREATED")
    .bind("imports")
    .bind(import_id)
    .bind(json!({ "store_id": store_id, "filename": file_name, "sha256": file_sha256 }))
    .bind(imported_at)
    .execute(&mut **tx)
    .await?;

    Ok(import_id)
}

async fn persist_normalized_and_metrics(
    tx: &mut Transaction<'_, Postgres>,
    import_id: Uuid,
    store_id: i64,
    rows: &[NormalizedRow],
) -> anyhow::Result<()> {
    for row in rows {
        let supplier_id: i64 = sqlx::query_scalar(
            r#"
            INSERT INTO suppliers (name)
            VALUES ($1)
            ON CONFLICT (name)
            DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            "#,
        )
        .bind(&row.supplier_name)
        .fetch_one(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO imports_normalized (id, import_id, store_id, supplier_id, metric_date, amount)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(import_id)
        .bind(store_id)
        .bind(supplier_id)
        .bind(row.date)
        .bind(row.amount)
        .execute(&mut **tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO daily_metrics (id, store_id, metric_date, total_amount, source_import_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (store_id, metric_date, source_import_id)
            DO UPDATE SET total_amount = daily_metrics.total_amount + EXCLUDED.total_amount
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(store_id)
        .bind(row.date)
        .bind(row.amount)
        .bind(import_id)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn persist_report(
    tx: &mut Transaction<'_, Postgres>,
    import_id: Uuid,
    store_id: i64,
    imported_by: &str,
    daily_totals: &[DailyTotal],
    total_amount: f64,
) -> anyhow::Result<Uuid> {
    let report_id = Uuid::new_v4();
    let snapshot = json!({
        "store_id": store_id,
        "generated_from_import_id": import_id,
        "daily_totals": daily_totals,
        "total_amount": total_amount
    });

    sqlx::query(
        r#"
        INSERT INTO reports (id, store_id, generated_from_import_id, generated_by, snapshot_json)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(report_id)
    .bind(store_id)
    .bind(import_id)
    .bind(imported_by)
    .bind(snapshot)
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO audit_logs (id, actor, action, target_type, target_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(imported_by)
    .bind("REPORT_GENERATED")
    .bind("reports")
    .bind(report_id)
    .bind(json!({ "generated_from_import_id": import_id, "total_amount": total_amount }))
    .execute(&mut **tx)
    .await?;

    Ok(report_id)
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

fn internal_error(context: &'static str) -> impl Fn(anyhow::Error) -> (StatusCode, String) {
    move |err| {
        tracing::error!(%err, %context, "request failed");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("{context}: {err}"),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_and_aggregate() {
        let csv =
            "date,supplier,amount\n2026-02-01,ACME,100\n2026-02-01,ACME,50\n2026-02-02,Beta,25";

        let rows = normalize_csv(csv).expect("csv should parse");
        assert_eq!(rows.len(), 3);

        let daily = aggregate_daily(&rows);
        assert_eq!(
            daily.get(&NaiveDate::from_ymd_opt(2026, 2, 1).unwrap()),
            Some(&150.0)
        );
        assert_eq!(
            daily.get(&NaiveDate::from_ymd_opt(2026, 2, 2).unwrap()),
            Some(&25.0)
        );
    }
}
