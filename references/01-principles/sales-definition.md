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

## 6. 推奨実施順序

1. `useDataPreview.ts` の潜在バグ修正
2. 販売点数の正本方針決定（A or B）
3. 方針に応じた Zod 契約 + 実装
4. ガードテスト追加
5. ドキュメント更新

## 7. 関連ファイル

- `domain/models/StoreResult.ts` — 売上の正本（totalSales 等）
- `domain/models/DailyRecord.ts` — 日別レコード（totalQuantity なし）
- `infrastructure/duckdb/schemas.ts` — store_day_summary VIEW 定義
- `infrastructure/duckdb/queries/storeDaySummary.ts` — StoreDaySummaryRow
- `infrastructure/duckdb/queries/categoryTimeSales.ts` — CTS クエリ
- `infrastructure/duckdb/queries/ctsHourlyQueries.ts` — 時間帯集計
- `infrastructure/duckdb/queries/ctsHierarchyQueries.ts` — 階層集計
- `application/hooks/useDataPreview.ts` — 潜在バグ箇所
