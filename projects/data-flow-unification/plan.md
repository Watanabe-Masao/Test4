# plan — data-flow-unification

## 不可侵原則

1. **load 境界の冪等性を壊さない** — `data-load-idempotency-hardening` で確立した `loadMonth` の replace セマンティクス・`purgeLoadTarget` 一本化・`deletePrevYearRowsAt` の意味論を維持する
2. **取得経路の正本を増やさない** — 前年データの DuckDB ロード経路は統合後の単一機構のみとする。legacy と new の二重経路を残さない
3. **UI は取得元を知らない** — presentation 層がデータの取得元（IndexedDB / DuckDB / キャッシュ）やロードタイミングを意識する実装を新規追加しない（CLAUDE.md 層境界ルール準拠）
4. **`store_day_summary` VIEW を直接操作しない** — 前年データの欠落は基礎テーブル（`classified_sales`, `flowers` 等）へのロードで解決する。VIEW 定義の変更で対処しない
5. **診断ログは一時的** — Phase 1 で追加する診断ログは Phase 5 で必ず除去する。本番コードに残さない

## Phase 構造

### Phase 1: 診断・整理

2 つの auto-load 機構（`useAutoLoadPrevYear` legacy + `useLoadComparisonData` new）の
責務範囲を棚卸しし、`is_prev_year=true` データの欠落箇所を特定する。
診断ログを追加してデータフロー各段階の状態を可視化する。

完了条件: 全 consumer と欠落テーブルが一覧化されている。
`useAutoLoadPrevYear` の要否判定が完了している。

### Phase 2: Auto-Load 統合

`useAutoLoadPrevYear` と `useLoadComparisonData` を単一の前年データロード機構に統合する。
統合後の機構は `ComparisonScope`（新システム）と連携して動作し、
全データスライス（classifiedSales, categoryTimeSales, flowers, purchase, transfers）を
前年分ロードする。

完了条件: 前年データロードの経路が 1 つに集約されている。旧 auto-load の呼び出し元が
全て統合後の機構に切り替わっている。

### Phase 3: DuckDB ロード保証

`loadMonth(prevYear, isPrevYear=true)` の網羅性を検証し、
全テーブルに `is_prev_year=true` 行が正しく挿入されることを保証する。
特に `time_slots` と `store_day_summary`（基礎テーブル経由）に注目する。

完了条件: ロード完了後のデータ整合性チェックが存在し、
全対象テーブルで `is_prev_year=true` 行が確認できる。

### Phase 4: キャッシュ戦略

fingerprint ベースのキャッシュ無効化が前年データの変更を正しく検知し、
適切なリロードをトリガーすることを保証する。
部分データ・stale キャッシュ・並行ロードのエッジケースを処理する。

完了条件: 前年データ変更時にキャッシュが正しく無効化される。
エッジケースの処理方針が実装されている。

### Phase 5: 検証・ガード

データフロー整合性のガードテストを追加し、
全比較チャート widget が前年データを正しく表示することを検証する。
診断ログを除去し、関連ドキュメントを更新する。

完了条件: ガードテストが CI で通過する。診断ログが除去されている。
関連ドキュメントが最新状態に更新されている。

## やってはいけないこと

- `loadMonth` を呼ぶ前に `deleteMonth` で手動 purge する運用ルールに戻す → `data-load-idempotency-hardening` で構造的に解決済み。逆戻りしない
- `useAutoLoadPrevYear` と `useLoadComparisonData` の両方を残したまま分担を明文化する → 二重経路は drift の温床。統合が目的
- `store_day_summary` VIEW の定義を変更して前年データ問題を解決する → VIEW は基礎テーブルの集約。基礎テーブルのロードで解決する
- presentation 層に前年データの有無判定ロジックを追加する → application 層の hook で完結させる
- 診断ログを `console.log` で雑に追加する → 構造化されたロギング（対象テーブル名・行数・タイミング）で追加し、Phase 5 で確実に除去する
- DuckDB WASM の `UPSERT` / `UNIQUE` 制約を採用する → ランタイムエラーになる（`data-load-idempotency-hardening` で文書化済み）

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/useAutoLoadPrevYear.ts` | legacy 前年データ auto-load 機構 |
| `app/src/application/hooks/useLoadComparisonData.ts` | 新 ComparisonScope 対応のデータロード機構 |
| `app/src/infrastructure/duckdb/dataLoader.ts` | `loadMonth`（replace 正本）+ `purgeLoadTarget` |
| `app/src/infrastructure/duckdb/deletePolicy.ts` | `deleteMonth` / `deletePrevYearMonth` / `deletePrevYearRowsAt` |
| `app/src/infrastructure/duckdb/schemas.ts` | テーブル定義 + `store_day_summary` VIEW |
| `app/src/application/stores/dataStore.ts` | IndexedDB → DuckDB 中間の状態管理 |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性の設計思想 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane の 2 系統経路 |
| `projects/completed/data-load-idempotency-hardening/plan.md` | 冪等性保証の先行 project（archived） |
