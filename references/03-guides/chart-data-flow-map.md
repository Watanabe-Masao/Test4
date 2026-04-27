# チャート → クエリ データフローマップ

> **2026-04-27 acknowledgement**: taxonomy-v2 子 Phase 6a-2 Migration Rollout で
> `app/src/application/hooks/plans/` 配下の Screen Plan に `@responsibility R:unclassified`
> を能動退避（原則 1「未分類は能動タグ」）。本マップの章立て / 経路定義は不変。
> R:unclassified → 具体タグへの promotion は後続 Phase 6 review window 経由で実施予定。

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

## HourlyChart（DayDetailModal）

```
HourlyChart
  ├─ 時間帯集計（amount / quantity）
  │   └─ useDayDetailPlan
  │        └─ useTimeSlotBundle(dayFrame)
  │             └─ storeAggregationHandler → queryStoreAggregation → time_slots
  │   series.entries[i].byHour[h] / byHourQuantity[h] を横断集計
  │   (seriesToHourlyData / buildHourlyDataSets)
  └─ カテゴリ別内訳（hourDetail, leaf-grain）
      └─ useDayDetailPlan
           └─ useCategoryLeafDailyBundle(dayFrame)
                └─ categoryTimeRecordsPairHandler + categoryTimeRecordsHandler (fallback)
      dept|line|klass 粒度。bundle.comparisonSeries.entries が「前年空時の当年同日付救済」
      fallback 反映後の leaf entries を保持する
```

- `timeSlotLane.bundle` は `calendar-modal-bundle-migration` Phase 1 で
  `byHourQuantity` / `totalQuantity` / `grandTotalQuantity` が additive 追加された
- `categoryLeafDaily.bundle` は `category-leaf-daily-series` で新設された。
  `CategoryLeafDailyEntry` は `CategoryTimeSalesRecord` の intersection 型に
  進化中（`category-leaf-daily-entry-shape-break` Phase 1 で flat field
  `deptCode / deptName / lineCode / lineName / klassCode / klassName` を並行提供。
  Phase 4 で alias 解除 → 独立 interface 化予定）
- fallback 意味論は `useCategoryLeafDailyBundle` 内部に畳み込まれており、
  consumer は `bundle.meta.provenance.usedComparisonFallback` で観測のみ可能
- **acquisition 境界の projection**: `useDayDetailPlan` (wow 単発経路) と
  `useYoYWaterfallPlan` (3 query path) は各々の query 結果に対して
  `toCategoryLeafDailyEntries` を適用し、下流には flat field 付き entry を
  配布する。plan 以外の consumer が手動で projection を組まない
- **「全店」モード (空 storeIds Set) の扱い**: `useDayDetailPlan` の
  `dayLeafFrame` / `cumLeafFrame` / `timeSlotFrame` は frame を null にせず
  `storeIds: []` で構築する。bundle 側 (`useCategoryLeafDailyBundle` /
  `useTimeSlotBundle`) が `sortedStoreIds.length > 0 ? sortedStoreIds : undefined`
  で undefined (全店フィルタなし) に変換する。frame を null にすると
  `absentBundle()` が返り全 CTS / TimeSlot クエリが未実行になるため (summary 系
  は動作するがこの 2 系統だけ死ぬ)、早期 null return は禁止。
  詳細: `projects/completed/day-detail-modal-prev-year-investigation/HANDOFF.md` §1.4

## YoYChart (unify-period-analysis Phase 5 見本実装)

```
YoYChart (presentation/components/charts/YoYChart.tsx)
  ├─ buildYoyDailyInput(scope, prevYearScope, selectedStoreIds)  ← pure builder (application)
  │    └─ application/hooks/plans/buildYoyDailyInput.ts
  │         入力: ComparisonScope / PrevYearScope / storeIds
  │         出力: YoyDailyInput { curDateFrom/To, prevDateFrom/To, storeIds, compareMode }
  ├─ useYoYChartPlan (application/hooks/plans/useYoYChartPlan.ts)   ← Screen Query Plan
  │    └─ yoyDailyHandler → queryYoyDaily                          → classified_sales
  └─ buildYoYChartData / buildYoYWaterfallData / computeYoYSummary  ← YoYChartLogic.ts (pure)
```

本 chart は Phase 5 の **Chart Input Builder Pattern** の見本実装:

- scope 内部フィールド (`effectivePeriod1 / effectivePeriod2 / alignmentMode`) の
  参照は application 層の `buildYoyDailyInput` に集約
- chart 本体は builder pass-through と描画のみ
- 強制 guard: `chartInputBuilderGuard` (chart 配下での `dateRangeToKeys` 直接
  呼び出しを禁止、**Phase 5 横展開完了時点で baseline 0**)
- 詳細: `references/03-guides/chart-input-builder-pattern.md`

## Chart Input Builder 共通レジストリ (Phase 5 横展開完了)

`application/hooks/plans/` に配置されている chart input pure builder の一覧。
chart / widget / hook が query input を組み立てる際は必ずここから選ぶ。

| Builder | 役割 | 消費 chart (例) |
|---|---|---|
| `buildBaseQueryInput` | `BaseQueryInput` (`{dateFrom, dateTo, storeIds?}`) | WeatherAnalysisPanel / DowPatternChart / CumulativeChart / FeatureChart / StoreHourlyChart / useDeptHourlyChartData (第1軸) |
| `buildPairedQueryInput` | `PairedQueryInput` (当期 + optional 比較期) | FactorDecompositionPanel / useDeptHourlyChartData (第2軸 pair) / useCategoryHierarchyData (level / hourly) |
| `buildYoyDailyInput` | `YoyDailyInput` (ComparisonScope + PrevYearScope → YoY 専用) | YoYChart |

**追加フィールド拡張**: `StoreAggregationInput.deptCode` や
`LevelAggregationInput.level` など chart 固有の拡張フィールドは、共通 builder
の戻り値に caller 側で spread して乗せる:

```ts
const base = buildPairedQueryInput(cur, prev, storeIds)
if (!base) return null
const input: PairedInput<HourlyAggregationInput> = { ...base, level, deptCode }
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

## 削除済み Plan の履歴

duplicate-orphan-retirement ADR-C-003 PR3b (2026-04-25) で以下の chain を削除:

- `useConditionMatrixPlan` (Plan) — 唯一 consumer の `ConditionMatrixTable.tsx` widget が
  17a Option A 拡張 scope で orphan として削除されたため、cascade で削除
- `conditionMatrixHandler` (Handler) — 同上
- `useDuckDBConditionMatrix` (legacy hook、Plan 経由前の旧経路) — 同上
- `queryConditionMatrix` (Query) — 同上

詳細: `projects/completed/duplicate-orphan-retirement/checklist.md` Phase 3 +
`projects/completed/architecture-debt-recovery/inquiry/17a-orphan-scope-extension.md`
