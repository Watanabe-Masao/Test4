# inventory 03 — 自由期間系 SQL 内 rate 計算

> 対応 checklist: Phase 0 #3
> 剥がす Phase: Phase 4（率計算・集約責務整理）
> 完了条件: 全行が Phase 4 で domain/calculations 側に移管されている

## 棚卸し対象

以下のパターンを対象とする:

- `(price - cost) / price` のような gpRate 計算
- `discount / (sales + discount)` のような discountRate 計算
- `price / cost - 1` のような markupRate 計算
- `... / NULLIF(...)` を用いた率計算
- `CASE WHEN sales > 0 THEN ... / sales` のような率計算

## 検出方法

```
Grep: /\s*NULLIF|/\s*CASE\s+WHEN
  glob: app/src/**/*.ts
  glob: app/src/**/*.sql
Grep: discount\s*/|cost\s*/|sales\s*/
  glob: app/src/infrastructure/duckdb/**/*.ts
  glob: app/src/application/queries/**/*.ts
```

## 棚卸し結果

### 自由期間コンテキストの SQL（本棚卸しの対象）

| Path | Lines | 計算式 | 出力カラム名 | メモ | Done |
|---|---|---|---|---|---|
| `app/src/infrastructure/duckdb/queries/freePeriodDeptKPI.ts` | L32 | `SUM(gp_rate_budget * sales_actual) / NULLIF(SUM(sales_actual), 0)` | `gpRateBudget` | 加重平均 gp 率。source (`department_kpi`) に格納済みの率を売上で加重している | |
| `app/src/infrastructure/duckdb/queries/freePeriodDeptKPI.ts` | L33 | `SUM(gp_rate_actual * sales_actual) / NULLIF(SUM(sales_actual), 0)` | `gpRateActual` | 同上 | |
| `app/src/infrastructure/duckdb/queries/freePeriodDeptKPI.ts` | L34 | `SUM(markup_rate * sales_actual) / NULLIF(SUM(sales_actual), 0)` | `markupRate` | 同上 | |
| `app/src/infrastructure/duckdb/queries/freePeriodDeptKPI.ts` | L35 | `SUM(discount_rate * sales_actual) / NULLIF(SUM(sales_actual), 0)` | `discountRate` | 同上 | |

### 自由期間スコープ外（参考情報 — 本 project では剥がさない）

| Path | Lines | 計算式 | メモ |
|---|---|---|---|
| `app/src/infrastructure/duckdb/queries/aggregates/departmentAggregation.ts` | L139-L141, L175-L177 | `CASE WHEN sales_budget > 0 THEN sales_actual / sales_budget ELSE 0 END` | 単月 preset。StoreResult 系で本 project のスコープ外 |
| `app/src/infrastructure/duckdb/queries/features.ts` | — | `/ NULLIF(SUM(...), 0)` | 探索クエリ。自由期間レーンではない |
| `app/src/infrastructure/duckdb/queries/advancedAnalytics.ts` | — | `CASE WHEN / NULLIF` | 探索クエリ。自由期間レーンではない |
| `app/src/infrastructure/duckdb/queries/conditionMatrix.ts` | — | `CASE WHEN ... COALESCE(...) / COALESCE(...)` | 条件集計。自由期間レーンではない |
| `app/src/infrastructure/duckdb/queries/storeDaySummary.ts` | — | `SUM(discount_absolute) / SUM(sales)` | Day Detail 用。自由期間レーンではない |

## 集計

- 自由期間スコープ内件数: **4 箇所**（1 ファイル: `freePeriodDeptKPI.ts`）
- 影響ファイル数: 1（スコープ内）
- 種別内訳:
  - 加重平均 gp 率: 2 件
  - 加重平均 markup 率: 1 件
  - 加重平均 discount 率: 1 件

## 観察と Phase 4 での扱い

- 残り 2 本の自由期間 SQL (`freePeriodFactQueries.ts` / `freePeriodBudget.ts`) には rate 計算は **0 件**。額のみ返している
- `freePeriodDeptKPI.ts` が唯一の violation。ただし source table `department_kpi` には集計済みの率（`gp_rate_budget` / `gp_rate_actual` / `markup_rate` / `discount_rate`）が保存されており、**SQL 側で額に戻して運び、TS 側で加重平均を取る**ことが Phase 4 の正しい終着点
- 代案: `SUM(gp_rate_budget * sales_actual)` を `SUM("gpWeighted")` のようなそのままの合計として運び出し、`domain/calculations/` 側で `weightedSum / NULLIF(totalSales)` を計算する。SQL は `NULLIF` による除算を行わない形に落とす
- 依存する read model (`readFreePeriodDeptKPI.ts`) と types (`FreePeriodDeptKPITypes.ts`) も合わせて Phase 4 でシグネチャ変更が必要
