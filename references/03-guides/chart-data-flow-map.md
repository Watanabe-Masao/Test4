# チャート → クエリ データフローマップ

## 目的

各チャートがどの Plan → Handler → Query → DuckDB テーブルを経由するかを
一覧化し、バグ調査時の導線を明確にする。

## 日別売上推移チャート（IntegratedSalesChart）

```
IntegratedSalesChart
  ├─ useIntegratedSalesState
  │    ├─ useIntegratedSalesPlan         ← Screen Query Plan
  │    │    ├─ dailyQuantityPairHandler   → queryDailyQuantity
  │    │    │                              → store_day_summary (total_quantity)
  │    │    └─ useMultiMovingAverage      → useMovingAverageOverlay ×4
  │    │         └─ movingAverageHandler   → queryStoreDaySummary
  │    │              └─ store_day_summary (sales, customers, totalQuantity, discount)
  │    │              └─ computeMovingAverage (domain 純粋関数)
  │    └─ useIntegratedSalesContext       ← 分析文脈構築
  │
  ├─ DailySalesChart (controller)
  │    └─ useDailySalesData               ← buildBaseDayItems + DuckDB qty マージ
  │         └─ buildBaseDayItems           → DailyRecord (StoreResult 由来)
  │
  └─ DailySalesChartBody (renderer)
       ├─ buildWeatherContext              → weatherDaily (ETRN API)
       ├─ buildOption                      → ECharts option 生成
       ├─ buildRightAxisSeries             → 右軸モード別シリーズ
       └─ buildMAOverlay                   → 移動平均 overlay
```

### 右軸モード別のデータソース

| モード | シリーズ | データソース |
|---|---|---|
| 点数 | quantity / prevQuantity | dailyQuantityPairHandler → store_day_summary |
| 客数 | customers / prevCustomers | buildBaseDayItems → DailyRecord.customers |
| 売変 | discount / prevYearDiscount | buildBaseDayItems → DailyRecord.discount |
| 気温 | tempMax / tempMin | weatherDaily → ETRN API |

### 移動平均のデータソース

| シリーズ | metric | policy | ソース |
|---|---|---|---|
| 売上7日MA | sales | strict | movingAverageHandler → store_day_summary.sales |
| 売上7日MA(前年) | sales | partial | 同上（isPrevYear=true） |
| 点数/客数/売変 7日MA | extraMetrics | partial | 同上（extraMetrics パラメータ） |

## GrossProfitHeatmap

```
GrossProfitHeatmap
  └─ useWidgetDataOrchestrator
       ├─ salesFactHandler      → querySalesFactDaily → category_time_sales
       └─ purchaseCostHandler   → queryPurchaseDailyBySupplier → purchase
                                → querySpecialSalesDaily → special_sales
                                → queryTransfersDaily → transfers
```

## TimeSlotChart

```
TimeSlotChart
  └─ useTimeSlotPlan
       └─ timeSlotPairHandler → queryTimeSlotAggregation → time_slots
```

## WeatherCorrelationChart

```
WeatherCorrelationChart
  ├─ weatherDaily              → ETRN API (useWeatherData)
  └─ salesDaily                → ctx.result.daily (StoreResult)
```

## 関連ファイル

| レイヤー | ディレクトリ | 責務 |
|---|---|---|
| Plan | `application/hooks/plans/` | Screen Query Plan（クエリ取得を一元管理） |
| Handler | `application/queries/` | QueryHandler（DuckDB 実行） |
| Query | `infrastructure/duckdb/queries/` | SQL 生成 + 実行 |
| Builder | `features/sales/application/` | 純粋データ変換 |
| Chart | `presentation/components/charts/` | ECharts option 生成 + 描画 |
