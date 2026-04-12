# plan — data-load-idempotency-hardening

## 不可侵原則

1. **load 境界の冪等性は構造で守る** — 「気をつける」運用ルールに依存しない
2. **read-path の防御は機械的に検証する** — JSDoc 注意書きだけに依存しない
3. **FRAGILE クエリの分類はコード上で grep 可能にする** — `@risk` JSDoc タグを必須にする
4. **defense-in-depth を勝手に剥がさない** — `MAX(customers)` を SUM に戻さない、`deletePrevYearMonth` の意味論を変えない

## Phase 構造

Phase 0-3 + PR A-E は完了済み（HANDOFF.md §1 参照）。
本 project に残る Phase は 1 つだけ。

### Phase F: FRAGILE 3/4/5 の恒久方針確定

audit 推奨事項上「JSDoc only mitigation」分類になっている FRAGILE 3, 4, 5
について、回帰テストの永続 `.fails` ロックで負債を可視化したまま据え置く
方針を最終確認する。レビュー後に本 project を completed として archive する。

判断材料:
- audit 推奨事項 §4 (`read-path-duplicate-audit.md`)
- pre-aggregate refactor のコスト試算（PR D/E から類推可能、各 15 分）
- load contract の信頼性（Phase 0-3 で機械的に保証済み）

## やってはいけないこと

- `loadMonth` を呼ぶ前に `deleteMonth` を呼ぶ運用ルールで解決する
  → Phase 1 で構造的に保証済み。逆戻りしない
- `store_day_summary` VIEW の `MAX(customers)` を SUM に戻す
  → Phase F の判断とは独立に永続維持
- DuckDB WASM の `UPSERT` / `UNIQUE` 制約を採用する
  → ランタイムエラーになる
- audit FRAGILE 6 件の refactor を 1 PR で一括実施する
  → Phase 3.b の `.fails` パターンに従い、テスト先行 → refactor の順序を守る

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/infrastructure/duckdb/dataLoader.ts` | `loadMonth`（replace 正本）+ `purgeLoadTarget` |
| `app/src/infrastructure/duckdb/deletePolicy.ts` | `deleteMonth` / `deletePrevYearMonth` / `deletePrevYearRowsAt` |
| `app/src/infrastructure/duckdb/schemas.ts` | `store_day_summary` VIEW + `@defense customers=MAX` |
| `app/src/infrastructure/duckdb/queries/purchaseComparison.ts` | FRAGILE 1/2 refactored |
| `app/src/infrastructure/duckdb/queries/freePeriodFactQueries.ts` | FRAGILE 6 refactored |
| `app/src/infrastructure/duckdb/__tests__/helpers/duplicateInjectedMockConn.ts` | 共有テスト helper |
| `app/src/infrastructure/duckdb/__tests__/readPathDuplicateResistance.test.ts` | FRAGILE 6 件の構造的回帰テスト |
| `app/src/infrastructure/duckdb/__tests__/dataLoaderPureFunctions.test.ts` | 冪等性契約テスト 4 件 |
