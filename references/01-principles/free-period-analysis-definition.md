# 自由期間分析の定義

## 概要

自由期間分析は、任意の日付範囲に対して売上・仕入・客数・売変を
日別×店舗の粒度で取得し、期間サマリーと比較分析を提供する。

StoreResult（単月確定値）とは別系統で、DuckDB を取得正本とする。

## 正本構造

### 取得正本: `readFreePeriodFact()`

| フィールド | 型 | 説明 |
|-----------|-----|------|
| storeId | string | 店舗ID |
| dateKey | string | YYYY-MM-DD |
| day | number | 日 |
| dow | number | 曜日（0=日曜） |
| sales | number | 売上金額 |
| customers | number | 客数 |
| purchaseCost | number | 仕入原価 |
| purchasePrice | number | 仕入売価 |
| discount | number | 売変合計 |
| isPrevYear | boolean | 比較期間フラグ |

取得元: DuckDB `classified_sales` + `purchase` LEFT JOIN

### 計算正本: `computeFreePeriodSummary()`

| フィールド | 型 | 導出方法 |
|-----------|-----|---------|
| storeCount | number | ユニーク storeId 数 |
| dayCount | number | ユニーク dateKey 数 |
| totalSales | number | Σ sales |
| totalCustomers | number | Σ customers |
| totalPurchaseCost | number | Σ purchaseCost |
| totalDiscount | number | Σ discount |
| averageDailySales | number | totalSales / dayCount |
| transactionValue | number | totalSales / totalCustomers |
| discountRate | number | totalDiscount / (totalSales + totalDiscount) |

## ReadModel

```typescript
FreePeriodReadModel {
  currentRows: FreePeriodDailyRow[]      // 当期日別行
  comparisonRows: FreePeriodDailyRow[]   // 比較期日別行
  currentSummary: FreePeriodSummary      // 当期サマリー
  comparisonSummary: FreePeriodSummary?  // 比較期サマリー
}
```

## パイプライン（唯一経路）

```
PeriodSelection + storeIds
  ↓ buildFreePeriodFrame()                                     [domain/models]
FreePeriodAnalysisFrame { anchorRange, storeIds, comparison }
  ↓ useFreePeriodAnalysisBundle(executor, frame)               [application/hooks]
    ↓ FreePeriodQueryInput (dateFrom/dateTo/storeIds/comparison)
    ↓ freePeriodHandler                                         [application/queries]
      ↓ queryFreePeriodDaily()                                  [infrastructure/duckdb/queries/freePeriodFactQueries]
      ↓ buildFreePeriodReadModel(currentRows, comparisonRows)   [application/readModels/freePeriod/readFreePeriodFact]
        ↓ computeFreePeriodSummary (pure JS)                    [同上]
FreePeriodReadModel
  ↓ ctx.freePeriodLane.bundle（unify-period-analysis Phase 1 以降）
  ↓ widget / chart が消費
```

## 唯一経路ルール（Phase 3 で明文化）

自由期間データの各責務は **1 ファイル 1 関数** に正本化されており、他の経路で
同じ責務を果たすことを禁止する:

| 責務 | 唯一の実装 | 禁止 |
|------|-----------|------|
| 取得 orchestration | `application/queries/freePeriodHandler.ts` | hook / vm / chart / plan が自前で `queryFreePeriodDaily` を呼ぶ |
| infra query | `infrastructure/duckdb/queries/freePeriodFactQueries.ts` (`queryFreePeriodDaily`) | `freePeriodHandler.ts` 以外から import する |
| read model 構築 | `application/readModels/freePeriod/readFreePeriodFact.ts` (`buildFreePeriodReadModel`) | 同一シグネチャの並行 builder を別所に置く |
| 期間サマリー計算 | `application/readModels/freePeriod/readFreePeriodFact.ts` (`computeFreePeriodSummary`) | presentation / VM / chart が raw rows を再集約する |
| 入力 frame 構築 | `domain/models/buildFreePeriodFrame.ts` | presentation で `FreePeriodAnalysisFrame` を手組みする |

chart / widget の **共通入力**は `FreePeriodReadModel` であり、raw 行
(`FreePeriodDailyRow[]`) を presentation / chart に直接渡してはならない。
`presentation/` は `ctx.freePeriodLane.bundle.fact`（= `FreePeriodReadModel`）を
読むことで取得・集計・比較・メタデータを一式で受け取る。

関連ガード（G3 群）:

- `freePeriodPathGuard.test.ts` — presentation 層からの `readFreePeriodFact` /
  `freePeriodHandler` / `freePeriodFactQueries` 直接 import を禁止
- `freePeriodHandlerOnlyGuard.test.ts`（Phase 3 で追加）— `queryFreePeriodDaily`
  は `freePeriodHandler.ts` + test/audit allowlist 以外から呼ばせない。
  `FreePeriodDailyRow` の直接 import も presentation では禁止（raw rows の漏出防止）

## 入力契約

### AnalysisFrame

```typescript
interface FreePeriodAnalysisFrame extends BaseAnalysisFrame {
  readonly kind: 'free-period'
  readonly comparison: ComparisonScope | null
}
```

- `anchorRange`: 分析対象期間（DateRange）
- `storeIds`: 対象店舗集合
- `granularity`: 集計粒度（現在は 'day' のみ）
- `comparison`: 比較条件（ComparisonScope 経由 — 唯一入口）

### CalculationFrame（単月確定値用 — 別系統）

```typescript
interface CalculationFrame {
  readonly targetYear: number
  readonly targetMonth: number
  readonly daysInMonth: number
  readonly dataEndDay: number | null
  readonly effectiveDays: number
}
```

## engine 責務

| 責務 | 担当 |
|------|------|
| 日別×店舗のデータ取得 | DuckDB（readFreePeriodFact） |
| 期間サマリー計算 | JS（computeFreePeriodSummary） |
| 比較先日付解決 | ComparisonScope（buildComparisonScope） |
| 集計粒度変換 | 将来拡張（現在は day 固定） |

**禁止事項:**
- SQL と JS で同一集約の二重実装
- presentation 層での比較先独自計算
- readFreePeriodFact 以外の取得経路

## cache 方針

| データ種別 | cache key | invalidation |
|-----------|----------|-------------|
| FreePeriodReadModel | AnalysisFrame hash（将来実装） | frame 変更時 |
| StoreResult | authoritativeDataVersion（別系統） | currentMonthData 変更時 |

## 将来拡張

- 集計粒度: week / month
- 派生計算: 粗利率、前年差、累積、異常値
- Budget fact の自由期間版
- Department KPI の自由期間版
