# 売上・販売点数の正本定義

## 1. 背景

仕入原価の正本化（`readPurchaseCost`）に続き、売上・販売点数についても
取得経路を整理し、同じ条件なら同じ値が得られる状態を確保する。

棚卸しの結果:
- **売上（sales）は既に well-unified** — StoreResult.totalSales が正本
- **販売点数（quantity）は fragmented** — StoreResult に totalQuantity フィールドがなく、CTS / time_slots / hourly aggregation から別々に取得されている

## 2. 現状の構造

### 売上（統一済み ✅）

```
classifiedSales → dailyBuilder.buildDailyRecords() → MonthlyAccumulator
  → storeAssembler() → StoreResult.totalSales
```

- **正本:** `StoreResult.totalSales`（classified_sales ベース）
- **派生:** `totalCoreSales`（花・産直除外）、`grossSales`（売変前）、`averageDailySales`
- **DuckDB 探索:** `store_day_summary.sales`（同じデータの別経路、グラフ用）

### 販売点数（分散 ⚠️）

| 取得経路 | ソース | 粒度 | 用途 |
|---------|--------|------|------|
| `store_day_summary.total_quantity` | category_time_sales の GROUP BY | store × day | StoreDaySummaryRow |
| `queryHourlyAggregation()` | time_slots の GROUP BY | hour | 時間帯チャート |
| `queryLevelAggregation()` | category_time_sales の GROUP BY | dept/line/klass | カテゴリ分析 |
| `queryCategoryDailyTrend()` | category_time_sales の GROUP BY | category × day | カテゴリ日次推移 |

- **StoreResult に totalQuantity がない** — 月間の販売点数合計を StoreResult から取れない
- `DailyRecord` にも totalQuantity がない
- `useDataPreview.ts` が `r.totalQuantity` を参照 — **潜在バグ**

## 3. 正本化方針

### 売上: 現状維持

StoreResult.totalSales が正本として機能している。追加の正本化は不要。

### 販売点数: StoreResult への昇格 + DuckDB 正本の整備

**方針A（推奨）:** `totalQuantity` を StoreResult に追加し、DuckDB の `category_time_sales` から月合計を取得してアセンブル時に設定。

理由:
- 販売点数は PI 値（1人あたり買上点数 = quantity / customers）の算出に必要
- KPI テーブル、カテゴリ分析、時間帯分析の全てで使用される
- StoreResult に入れれば、他の指標と同じ信頼階層で管理できる

**方針B（DuckDB 正本のみ）:** StoreResult には追加せず、DuckDB クエリの正本を `readSalesFact()` として統一。

方針A は変更面積が大きい（StoreResult 型変更 + dailyBuilder + storeAssembler）が、
方針B は販売点数だけ異なる管理体系になる。

## 4. 販売点数の正本ファクト粒度

DuckDB 側の正本として `readSalesFact()` を新設する場合の推奨粒度:

```
storeId × date × deptCode × lineCode × klassCode × hour
```

この粒度から:
- 店舗別合計
- 日別合計
- 曜日別合計
- 時間帯別合計
- 階層別合計（部門/ライン/クラス）
- ドリルダウン

を全て導出可能。

ただし `category_time_sales + time_slots` の JOIN が必要で、
既存の `queryCategoryTimeRecords()` と重複する。

## 5. useDataPreview.ts の totalQuantity

~~潜在バグ~~ → 調査の結果、問題なし。
`useDataPreview.ts` の `RawCtsRecord` は `CategoryTimeSalesRecord` と互換であり、
`totalQuantity` フィールドは CTS レコードに正しく存在する。

## 6. 正本化状態（実装済み）

- **正本関数:** `readSalesFact()` — `application/readModels/salesFact/readSalesFact.ts`
- **Zod 契約:** `SalesFactReadModel` / `SalesFactDailyRow` / `SalesFactHourlyRow` — `SalesFactTypes.ts`
- **QueryHandler:** `salesFactHandler` — useQueryWithHandler 連携用
- **導出ヘルパー:** `toStoreSalesRows()` / `toDailySalesRows()` / `toHourlySalesRows()` / `toDeptSalesRows()`
- **ガードテスト:** `salesFactPathGuard.test.ts` (5テスト)
- **一貫性テスト:** `readSalesFact.test.ts` (8テスト)
- **widget orchestrator:** `useWidgetDataOrchestrator` 経由で `UnifiedWidgetContext.readModels.salesFact` として配布

## 7. 関連ファイル

- `application/readModels/salesFact/` — 正本実装
- `domain/models/StoreResult.ts` — 売上の集計済み正本（totalSales 等）
- `infrastructure/duckdb/queries/categoryTimeSales.ts` — CTS クエリ（readSalesFact 内部で使用）
- `infrastructure/duckdb/queries/ctsHourlyQueries.ts` — 時間帯集計（readSalesFact 内部で使用）

## 8. 販売系基礎正本群における位置づけ

### 概念モデル

販売系基礎正本群は以下の **4 つの概念的に独立した正本** から構成される:

| 正本 | 責務 | 時間帯 | 正本入口 |
|------|------|--------|----------|
| **SalesFact** (売上金額) | 売上金額 | ✅ あり | `readSalesFact()` |
| **QuantityFact** (販売点数) | 販売点数 | ✅ あり | `readSalesFact()` |
| **CustomerFact** (来店客数) | 来店客数 | ❌ なし | `readCustomerFact()` |
| **DiscountFact** (値引き) | 値引き 4 種別 (71/72/73/74) | ❌ なし | `readDiscountFact()` |

### 物理実装

SalesFact と QuantityFact は **概念的には独立** だが、以下の理由により
**物理 ReadModel (`readSalesFact()`) は統合したまま維持**:

1. **ソースが同一**: DuckDB `category_time_sales` テーブルの同一行に `total_amount` と `total_quantity` が共存
2. **粒度が完全一致**: storeId × date × dept/line/klass × hour
3. **消費者の 60% が両方を同時に使用**: PI値・客数GAP・客単価の計算
4. **分割するとクエリが 2 倍**: 同一テーブルへの同一 WHERE 句のクエリを 2 回実行することになる

```
概念モデル:               物理実装:
SalesFact (金額)  ─┐      readSalesFact()
                   ├──→   { grandTotalAmount, grandTotalQuantity,
QuantityFact (点数) ─┘       daily[].totalAmount, daily[].totalQuantity }
```

### 指標計算との関係

- PI値: **QuantityFact** (readSalesFact.grandTotalQuantity) + CustomerFact → `calculateQuantityPI`
- 金額PI値: **SalesFact** (readSalesFact.grandTotalAmount) + CustomerFact → `calculateAmountPI`
- 客数GAP: **SalesFact** + **QuantityFact** + CustomerFact → `calculateCustomerGap`
- 値引率: **SalesFact** + DiscountFact → `calculateDiscountRate`
- 粗利: **SalesFact** + PurchaseCost → `calculateGrossProfit`
- 詳細は `canonical-input-sets.md` を参照
