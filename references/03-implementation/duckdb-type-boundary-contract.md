# DuckDB 型境界契約

> **2026-04-27 acknowledgement**: taxonomy-v2 子 Phase 6a-2 Migration Rollout で
> `infrastructure/duckdb/schemas.ts` に `@responsibility R:unclassified` を能動退避
> （原則 1「未分類は能動タグ」）。型変換契約 / スキーマ定義は不変。
> R:unclassified → 具体タグへの promotion は後続 Phase 6 review window 経由で実施予定。

## 目的

DuckDB WASM → JavaScript → ReadModel の型変換で発生しうる
不整合を防ぐための契約を定義する。

## 型変換チェーン

```
DuckDB テーブル (INTEGER/DOUBLE/VARCHAR/BOOLEAN)
  ↓ conn.query(sql)
Arrow StructRow (BigInt/number/string/boolean)
  ↓ structRowToObject()  ← BigInt → number 変換
JS Object (camelCase keys, number/string/boolean)
  ↓ queryToObjects()     ← DEV 環境のみ schema validation
readonly T[]
  ↓ builder              ← pure 関数で ReadModel 構築
  ↓ ReadModel.parse()    ← Zod runtime 検証（全環境）
ReadModel（型安全）
```

## 契約

### C1: store_day_summary VIEW の全数値カラムは COALESCE 済み

LEFT JOIN で NULL が発生する可能性があるカラムは全て `COALESCE(..., 0)` で保護する。

**対象:** `schemas.ts` の `STORE_DAY_SUMMARY_VIEW_DDL`

| カラム | COALESCE | ソース |
|---|---|---|
| sales | 不要（cs 基準、NOT NULL） | classified_sales |
| purchase_cost | `COALESCE(p.total_cost, 0)` | purchase |
| customers | `COALESCE(ss_f.customers, 0)` | special_sales (flowers) |
| total_quantity | `COALESCE(qty.total_quantity, 0)` | category_time_sales |
| inter_store_*_cost/price | `COALESCE(t_si.cost, 0)` | transfers |

### C2: ReadModel の Zod スキーマは防御的に定義する

DuckDB → JS の型変換は常に信頼できるわけではない。
特に以下のケースで `null` / `undefined` / `BigInt` が漏れる可能性がある:

- VIEW 未 materialize 時のクエリ
- LEFT JOIN の NULL 伝播
- INTEGER → BigInt 変換の失敗

**推奨パターン:**

```typescript
// NG: strict（DuckDB の型変換を暗黙に信頼）
customers: z.number()

// OK: 防御的（null/undefined/BigInt を安全に変換）
customers: z.coerce.number().default(0)
```

**適用基準:**
- `store_day_summary` 由来の数値 → `z.coerce.number().default(0)` 推奨
- `category_time_sales` / `classified_sales` の NOT NULL カラム → `z.number()` で可
- 集計値（SUM/COUNT） → `z.coerce.number().default(0)` 推奨

### C3: structRowToObject は BigInt → number を変換する

`infrastructure/duckdb/rowConversion.ts` の `structRowToObject` が
`typeof val === 'bigint' ? Number(val) : val` で変換する。
この変換を削除・変更してはならない。

### C4: queryToObjects の DEV 検証は補助的

`queryToObjects` の Zod schema 引数は DEV 環境のみで検証される。
本番環境での型安全は ReadModel の `.parse()` が担う。
DEV 検証が通っても本番で失敗する可能性がある（データ依存の問題）。

## 既知の問題と修正

- **CustomerFact customers null**: `store_day_summary.customers` が
  `COALESCE` 済みにもかかわらず `null` で返るケースがあった。
  修正: `z.number()` → `z.coerce.number().default(0)` に変更。

- **store_day_summary.customers = MAX(customers) の意味論**:
  `schemas.ts` の `STORE_DAY_SUMMARY_VIEW_DDL` 内 `ss_f` subquery で
  `flowers` の `customers` のみ `SUM` ではなく `MAX` で集約している。これは
  ロード境界が壊れたとき（過去の `1.56e+17` 事件）に customers が暴発する経路を
  塞ぐ defense-in-depth であり、idempotent load contract が機能している間は
  `MAX = SUM` だが、ロード層が壊れたときの保険として残してある。
  該当 SQL 直上に `@defense customers=MAX` コメントで意図を明示済み。
  詳細: [data-load-idempotency-handoff.md §3.2](./data-load-idempotency-handoff.md)

## 関連ファイル

| ファイル | 責務 |
|---|---|
| `infrastructure/duckdb/rowConversion.ts` | BigInt → number 変換 |
| `infrastructure/duckdb/queryRunner.ts` | queryToObjects（DEV 検証） |
| `infrastructure/duckdb/schemas.ts` | VIEW DDL（COALESCE 定義） |
| `application/readModels/*/Types.ts` | Zod スキーマ（本番検証） |
