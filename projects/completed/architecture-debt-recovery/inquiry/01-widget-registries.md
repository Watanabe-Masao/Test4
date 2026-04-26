# inquiry/01 — widget registries 棚卸し台帳

> 役割: Phase 1 inquiry 成果物 #1。9 registry × 全 widget の網羅台帳。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12、checklist Phase 1）。
>
> Phase 2 以降で参照する不可変台帳。追加情報が判明しても本ファイルは書き換えず、`01a-*.md` として addend する（plan.md §3 Phase 1 次 Phase への渡し方）。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `d32d57b`（scaffold fix 直後。widget-related コード変更は無し。計測基準としては前コミット `0c866fc` と同値） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 採取対象 | `app/src/presentation/pages/Dashboard/widgets/registry*.tsx`、`app/src/presentation/pages/*/widgets.tsx`、`app/src/features/*/ui/widgets.tsx`、`app/src/presentation/components/widgets/{unifiedRegistry.ts,types.ts}`、`app/src/presentation/pages/Dashboard/widgets/types.ts` |
| 収集方法 | `grep -n "export const .*_WIDGETS"` + 手動 `Read` によるソース読解 + `diff` による重複判定 |

## Registry 数の計測結果

plan.md §3 Phase 1 成果物表は「**9 registry**」と記載する（`plan.md:101`）。実測:

| 計測軸 | 数 | 内訳 |
|---|---|---|
| **独立に export された `readonly WidgetDef[]` 定数の数** | **10** | Dashboard sub 5（KPI / CHART / EXEC / ANALYSIS / DUCKDB）+ page-level 5（DAILY / INSIGHT / CATEGORY / COST_DETAIL / REPORTS） |
| **合成 registry 定数の数** | **2** | `WIDGET_REGISTRY`（Dashboard main, `registry.tsx:21`）、`UNIFIED_WIDGET_REGISTRY`（`unifiedRegistry.ts:45`） |
| **`features/*/ui/widgets.tsx` による page-level の byte-identical 複製** | **3** | `features/category/ui/widgets.tsx`、`features/cost-detail/ui/widgets.tsx`、`features/reports/ui/widgets.tsx`（いずれも page 版と `diff` exit 0） |
| **widget 総数（10 個の独立 registry の合算、重複除去前）** | **44** | 下位節の各 Registry 小計の合算 |

本台帳は **独立 registry 10 件 + 合成 registry 2 件 + byte-identical 複製 3 件**を区別して記録する。「9」という plan 表現とは一致しないが、後段 Phase で解釈する事実としてそのまま記載する（Phase 1 は事実列挙のみ）。

## サマリ表（独立 registry 10 件）

| # | 定数名 | 種別 | ファイル | widget 数 | 合成先 |
|---|---|---|---|---|---|
| 1 | `WIDGETS_KPI` | Dashboard sub | `presentation/pages/Dashboard/widgets/registryKpiWidgets.tsx:16` | 1 | `WIDGET_REGISTRY` (Dashboard) |
| 2 | `WIDGETS_CHART` | Dashboard sub | `presentation/pages/Dashboard/widgets/registryChartWidgets.tsx:30` | 6 | `WIDGET_REGISTRY` (Dashboard) |
| 3 | `WIDGETS_EXEC` | Dashboard sub | `presentation/pages/Dashboard/widgets/registryExecWidgets.tsx:18` | 7 | `WIDGET_REGISTRY` (Dashboard) |
| 4 | `WIDGETS_ANALYSIS` | Dashboard sub | `presentation/pages/Dashboard/widgets/registryAnalysisWidgets.tsx:18` | 10 | `WIDGET_REGISTRY` (Dashboard) |
| 5 | `WIDGETS_DUCKDB` | Dashboard sub | `presentation/pages/Dashboard/widgets/registryDuckDBWidgets.tsx:11` | 5 | `WIDGET_REGISTRY` (Dashboard) |
| 6 | `DAILY_WIDGETS` | Page-level | `presentation/pages/Daily/widgets.tsx:11` | 2 | `UNIFIED_WIDGET_REGISTRY` |
| 7 | `INSIGHT_WIDGETS` | Page-level | `presentation/pages/Insight/widgets.tsx:13` | 6 | `UNIFIED_WIDGET_REGISTRY` |
| 8 | `CATEGORY_WIDGETS` | Page-level | `presentation/pages/Category/widgets.tsx:12` | 2 | `UNIFIED_WIDGET_REGISTRY` |
| 9 | `COST_DETAIL_WIDGETS` | Page-level | `presentation/pages/CostDetail/widgets.tsx:15` | 4 | `UNIFIED_WIDGET_REGISTRY` |
| 10 | `REPORTS_WIDGETS` | Page-level | `presentation/pages/Reports/widgets.tsx:11` | 2 | `UNIFIED_WIDGET_REGISTRY` |
| — | **合計** | | | **45** | |

> 合計 45（本台帳の表上位）と「独立 registry 合算 44」（計測結果表）との 1 件差異について: Explore 初期集計では `WIDGETS_ANALYSIS` を 9 widget としていたが、Registry 4 の詳細節で 10 widget（内 `analysis-category-pi` は `() => false` で常時非可視）であることが追跡ソース `registryAnalysisWidgets.tsx:88-107` の確認で判明。本台帳では **10 件のまま記録**。総数は本表の 45 を正とする。

---

## Registry 1: `WIDGETS_KPI`

- ファイル: `app/src/presentation/pages/Dashboard/widgets/registryKpiWidgets.tsx`
- 定義行: `:16`（`export const WIDGETS_KPI: readonly WidgetDef[] = [`）
- `WidgetDef` 型: `presentation/pages/Dashboard/widgets/types.ts:101`（Dashboard-local variant）
- 合成先: `WIDGET_REGISTRY`（`registry.tsx:22`）
- widget 数: 1

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `widget-budget-achievement` | 店別予算達成状況 | 予算進捗 | `full` | `({ allStoreResults }) => allStoreResults.size > 0` | `allStoreResults`（predicate）／`ConditionSummaryEnhanced` に full ctx を渡す | `registryKpiWidgets.tsx:19-25` |

---

## Registry 2: `WIDGETS_CHART`

- ファイル: `app/src/presentation/pages/Dashboard/widgets/registryChartWidgets.tsx`
- 定義行: `:30`（`export const WIDGETS_CHART: readonly WidgetDef[] = [`）
- `WidgetDef` 型: `presentation/pages/Dashboard/widgets/types.ts:101`
- 合成先: `WIDGET_REGISTRY`（`registry.tsx:23,25,29`。slice / 順序入替ありで他 registry と interleave）
- widget 数: 6

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `chart-daily-sales` | 日別売上チャート | トレンド分析 | `full` | 未指定（常時可視） | `result.daily` / `daysInMonth` / `year` / `month` / `prevYear.hasPrevYear` / `prevYear.daily` / `result.budgetDaily` / `queryExecutor` / `currentDateRange` / `selectedStoreIds` / `prevYearScope` / `weatherDaily` / `prevYearWeatherDaily` / `comparisonScope` / `result.discountEntries` / `result.grossSales` / `weatherPersist` | `registryChartWidgets.tsx:32-58` |
| `chart-gross-profit-amount` | 粗利推移チャート | 収益概況 | `full` | 未指定（常時可視） | `result.daily` / `daysInMonth` / `year` / `month` / `result.grossProfitBudget` / `targetRate` / `warningRate` / `prevYear` / `chartPeriodProps` | `registryChartWidgets.tsx:62-82` |
| `chart-timeslot-heatmap` | 時間帯×曜日ヒートマップ | 構造分析 | `full` | `isTimeSeriesVisible`（関数参照、`widgetVisibility.ts` に実装。predicate 本体は本台帳では未追跡 — ambiguity §a 参照） | `UnifiedHeatmapWidget` に full ctx を渡す（渡し先のフィールド touch は component 側に閉じる） | `registryChartWidgets.tsx:92-98` |
| `chart-store-timeslot-comparison` | 店舗別時間帯比較 | 構造分析 | `full` | `isStoreComparisonVisible`（同上） | `UnifiedStoreHourlyWidget` に full ctx | `registryChartWidgets.tsx:101-107` |
| `chart-sales-purchase-comparison` | 売上・仕入 店舗比較 | 構造分析 | `full` | 未指定（常時可視） | `allStoreResults` / `stores` / `daysInMonth` / `storeDailyLane` / `chartPeriodProps` | `registryChartWidgets.tsx:111-130` |
| `chart-weather-correlation` | 天気-売上 相関分析 | 外部データ | `full` | 未指定（常時可視） | `WeatherWidget` に full ctx | `registryChartWidgets.tsx:133-138` |

---

## Registry 3: `WIDGETS_EXEC`

- ファイル: `app/src/presentation/pages/Dashboard/widgets/registryExecWidgets.tsx`
- 定義行: `:18`
- `WidgetDef` 型: `presentation/pages/Dashboard/widgets/types.ts:101`
- 合成先: `WIDGET_REGISTRY`（`registry.tsx:24,26`。`WIDGETS_CHART` と slice で interleave）
- widget 数: 7

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `analysis-alert-panel` | アラート | モニタリング | `full` | 未指定 | `storeKey`（React key）／ `AlertPanelWidget` に full ctx | `registryExecWidgets.tsx:20-25` |
| `exec-dow-average` | 曜日平均 | トレンド分析 | `full` | 未指定 | `renderDowAverage`（`SalesAnalysisWidgets` re-export）に委譲 | `registryExecWidgets.tsx:28-33` |
| `exec-weekly-summary` | 週別サマリー | トレンド分析 | `full` | 未指定 | `renderWeeklySummary`（同上）に委譲 | `registryExecWidgets.tsx:35-40` |
| `exec-daily-store-sales` | 売上・売変・客数（日別×店舗） | トレンド分析 | `full` | 未指定 | `renderDailyStoreSalesTable`（`TableWidgets`）に委譲 | `registryExecWidgets.tsx:42-48` |
| `exec-daily-inventory` | 日別推定在庫 | トレンド分析 | `full` | 未指定 | `renderDailyInventoryTable`（同上）に委譲 | `registryExecWidgets.tsx:50-55` |
| `exec-store-kpi` | 店舗別KPI一覧 | 構造分析 | `full` | 未指定 | `renderStoreKpiTable`（同上）に委譲 | `registryExecWidgets.tsx:58-64` |
| `exec-forecast-tools` | 着地予測・ゴールシーク | 予測・シミュレーション | `full` | 未指定 | `storeKey`／ `ForecastToolsWidget` に full ctx | `registryExecWidgets.tsx:68-74` |

---

## Registry 4: `WIDGETS_ANALYSIS`

- ファイル: `app/src/presentation/pages/Dashboard/widgets/registryAnalysisWidgets.tsx`
- 定義行: `:18`
- `WidgetDef` 型: `presentation/pages/Dashboard/widgets/types.ts:101`
- 合成先: `WIDGET_REGISTRY`（`registry.tsx:27`）
- widget 数: 10

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `analysis-waterfall` | 粗利ウォーターフォール | 要因分析 | `full` | 未指定 | `storeKey`／ `WaterfallChartWidget` に full ctx | `registryAnalysisWidgets.tsx:20-26` |
| `analysis-gp-heatmap` | 粗利率ヒートマップ | 要因分析 | `full` | 未指定 | `storeKey`／ `GrossProfitHeatmapWidget` に full ctx | `registryAnalysisWidgets.tsx:29-34` |
| `analysis-customer-scatter` | 客数×客単価 効率分析 | トレンド分析 | `full` | 未指定 | `result.daily` / `daysInMonth` / `year` / `month` / `prevYear` | `registryAnalysisWidgets.tsx:40-53` |
| `analysis-performance-index` | PI値・偏差値・Zスコア | トレンド分析 | `full` | 未指定 | `result` / `daysInMonth` / `year` / `month` / `prevYear` / `queryExecutor` / `currentDateRange` / `prevYearScope` / `selectedStoreIds` / `allStoreResults` / `stores` / `currentCtsQuantity` / `readModels` | `registryAnalysisWidgets.tsx:55-85` |
| `analysis-category-pi` | カテゴリPI値・偏差値 | トレンド分析 | `full` | `() => false`（常時非可視。コメント上「PerformanceIndexChart に統合済み」と示唆） | `prevYearScope` / `readModels.customerFact` / `result.totalCustomers`（非可視のため実質 0） | `registryAnalysisWidgets.tsx:88-107` |
| `analysis-causal-chain` | 因果チェーン分析 | 要因分析 | `full` | 未指定 | `result` / `prevYear` | `registryAnalysisWidgets.tsx:110-133` |
| `analysis-sensitivity` | 感度分析ダッシュボード | 予測・シミュレーション | `full` | 未指定 | `result` / `readModels.customerFact` | `registryAnalysisWidgets.tsx:135-148` |
| `analysis-regression-insight` | 回帰分析インサイト | トレンド分析 | `full` | 未指定 | `result` / `year` / `month` | `registryAnalysisWidgets.tsx:150-157` |
| `analysis-seasonal-benchmark` | 季節性ベンチマーク | トレンド分析 | `full` | 未指定 | `month` / `monthlyHistory` | `registryAnalysisWidgets.tsx:159-166` |
| `analysis-duckdb-features` | 売上トレンド分析 | トレンド分析 | `full` | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` | `registryAnalysisWidgets.tsx:168-180` |

---

## Registry 5: `WIDGETS_DUCKDB`

- ファイル: `app/src/presentation/pages/Dashboard/widgets/registryDuckDBWidgets.tsx`
- 定義行: `:11`
- `WidgetDef` 型: `presentation/pages/Dashboard/widgets/types.ts:101`
- 合成先: `WIDGET_REGISTRY`（`registry.tsx:28,30`）
- widget 数: 5

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `duckdb-dow-pattern` | 曜日パターン分析 | トレンド分析 | `half` | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` | `registryDuckDBWidgets.tsx:13-25` |
| `duckdb-category-mix` | カテゴリ構成比推移 | トレンド分析 | `full` | `(ctx) => ctx.queryExecutor?.isReady === true && ctx.loadedMonthCount >= 2` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` / `loadedMonthCount` | `registryDuckDBWidgets.tsx:29-41` |
| `duckdb-category-benchmark` | カテゴリベンチマーク | トレンド分析 | `full` | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` | `registryDuckDBWidgets.tsx:43-55` |
| `duckdb-category-boxplot` | カテゴリ箱ひげ図 | トレンド分析 | `full` | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` | `registryDuckDBWidgets.tsx:57-68` |
| `duckdb-cv-timeseries` | CV時系列分析 | 構造分析 | `full` | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` | `registryDuckDBWidgets.tsx:72-84` |

---

## Registry 6: `DAILY_WIDGETS`

- ファイル: `app/src/presentation/pages/Daily/widgets.tsx`
- 定義行: `:11`（`export const DAILY_WIDGETS: readonly WidgetDef[] = [`）
- `WidgetDef` 型: `presentation/components/widgets/types.ts:225`（Unified variant。Dashboard 版とは別型）
- 合成先: `UNIFIED_WIDGET_REGISTRY`（`unifiedRegistry.ts:47`）
- widget 数: 2

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `daily-chart-gp-rate` | 粗利率トレンド | 日別トレンド | `half` | 未指定 | `result.daily` / `daysInMonth` / `targetRate` / `warningRate` / `chartPeriodProps` | `Daily/widgets.tsx:13-27` |
| `daily-chart-shapley` | シャープリー時系列 | 日別トレンド | `half` | `(ctx) => ctx.prevYear.hasPrevYear` | `result.daily` / `daysInMonth` / `year` / `month` / `prevYear.hasPrevYear` / `prevYear.daily` / `chartPeriodProps` | `Daily/widgets.tsx:29-46` |

---

## Registry 7: `INSIGHT_WIDGETS`

- ファイル: `app/src/presentation/pages/Insight/widgets.tsx`
- 定義行: `:13`
- `WidgetDef` 型: `presentation/components/widgets/types.ts:225`
- 合成先: `UNIFIED_WIDGET_REGISTRY`（`unifiedRegistry.ts:48`）
- widget 数: 6

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `insight-budget` | 予算と実績 | インサイト | `full` | `(ctx) => ctx.insightData != null` | `insightData` / `result` / `onExplain` | `Insight/widgets.tsx:14-24` |
| `insight-budget-simulator` | 予算達成シミュレーター | インサイト | `full` | `(ctx) => ctx.result != null` | `result`（UnifiedWidgetContext の core field のみ） | `Insight/widgets.tsx:26-38` |
| `insight-gross-profit` | 損益構造 | インサイト | `full` | `(ctx) => ctx.insightData != null` | `insightData` / `result` / `onExplain` | `Insight/widgets.tsx:40-49` |
| `insight-forecast` | 予測・パターン | インサイト | `full` | `(ctx) => ctx.insightData?.forecastData != null` | `insightData.forecastData` / `insightData` / `result` / `onExplain` | `Insight/widgets.tsx:51-60` |
| `insight-decomposition` | 売上要因分解 | インサイト | `full` | `(ctx) => ctx.insightData?.customerData != null && ctx.insightData?.forecastData != null` | `insightData.customerData` / `insightData.forecastData` / `insightData` | `Insight/widgets.tsx:62-72` |
| `insight-pi-cv-map` | カテゴリベンチマーク | 構造分析 | `full` | `(ctx) => ctx.queryExecutor?.isReady === true` | `queryExecutor` / `currentDateRange` / `selectedStoreIds` | `Insight/widgets.tsx:74-89` |

---

## Registry 8: `CATEGORY_WIDGETS`

- ファイル: `app/src/presentation/pages/Category/widgets.tsx`
- 定義行: `:12`
- `WidgetDef` 型: `presentation/components/widgets/types.ts:225`
- 合成先: `UNIFIED_WIDGET_REGISTRY`（`unifiedRegistry.ts:49`）
- widget 数: 2

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `category-total-view` | カテゴリ合計分析 | カテゴリ分析 | `full` | 未指定 | `result` / `selectedResults` / `stores` / `settings` / `onExplain` / `onCustomCategoryChange` | `Category/widgets.tsx:14-28` |
| `category-comparison-view` | 店舗間比較 | カテゴリ分析 | `full` | `(ctx) => (ctx.selectedResults?.length ?? 0) > 1` | `selectedResults` / `storeNames` | `Category/widgets.tsx:30-41` |

---

## Registry 9: `COST_DETAIL_WIDGETS`

- ファイル: `app/src/presentation/pages/CostDetail/widgets.tsx`
- 定義行: `:15`
- `WidgetDef` 型: `presentation/components/widgets/types.ts:225`
- 合成先: `UNIFIED_WIDGET_REGISTRY`（`unifiedRegistry.ts:50`）
- widget 数: 4

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `costdetail-kpi-summary` | サマリーKPI | 原価明細 | `full` | `(ctx) => ctx.costDetailData != null` | `costDetailData` / `fmtCurrency` / `onExplain` | `CostDetail/widgets.tsx:17-56` |
| `costdetail-purchase` | 仕入明細 | 原価明細 | `full` | `(ctx) => ctx.costDetailData != null` | `costDetailData` | `CostDetail/widgets.tsx:58-67` |
| `costdetail-transfer` | 移動明細 | 原価明細 | `full` | `(ctx) => ctx.costDetailData != null` | `costDetailData` | `CostDetail/widgets.tsx:69-78` |
| `costdetail-cost-inclusion` | 消耗品明細 | 原価明細 | `full` | `(ctx) => ctx.costDetailData != null` | `costDetailData` / `onExplain` | `CostDetail/widgets.tsx:80-89` |

---

## Registry 10: `REPORTS_WIDGETS`

- ファイル: `app/src/presentation/pages/Reports/widgets.tsx`
- 定義行: `:11`
- `WidgetDef` 型: `presentation/components/widgets/types.ts:225`
- 合成先: `UNIFIED_WIDGET_REGISTRY`（`unifiedRegistry.ts:51`）
- widget 数: 2

| id | label | group | size | isVisible | render が触る ctx field | 定義位置 |
|---|---|---|---|---|---|---|
| `reports-summary-grid` | レポートサマリー | レポート | `full` | 未指定 | `result` / `settings` / `daysInMonth` / `onExplain` | `Reports/widgets.tsx:12-25` |
| `reports-dept-table` | 部門別KPI | レポート | `full` | 未指定 | `departmentKpi` / `onExplain` | `Reports/widgets.tsx:27-32` |

---

## 合成 registry

### `WIDGET_REGISTRY`（Dashboard main）

- ファイル: `app/src/presentation/pages/Dashboard/widgets/registry.tsx`
- 定義行: `:21`
- 合成内容（`registry.tsx:22-30` のスプレッド順）:
  - `WIDGETS_KPI`（L22）
  - `WIDGETS_CHART` の一部（L23, L25, L29）と `WIDGETS_EXEC` の一部（L24, L26）を slice / 順序入替で interleave
  - `WIDGETS_ANALYSIS`（L27）
  - `WIDGETS_DUCKDB` の一部（L28, L30）
- 合成対象型: `readonly WidgetDef[]`（Dashboard-local `WidgetDef`）

### `UNIFIED_WIDGET_REGISTRY`

- ファイル: `app/src/presentation/components/widgets/unifiedRegistry.ts`
- 定義行: `:45`
- 合成内容（`unifiedRegistry.ts:46-52` のスプレッド順）:
  - Dashboard 版を Unified WidgetDef に適合させた adapted 集合（L46、`WIDGET_REGISTRY` の adapter）
  - `DAILY_WIDGETS`（L47）
  - `INSIGHT_WIDGETS`（L48）
  - `CATEGORY_WIDGETS`（L49）
  - `COST_DETAIL_WIDGETS`（L50）
  - `REPORTS_WIDGETS`（L51）
- 合成対象型: `readonly WidgetDef[]`（Unified `WidgetDef`）

---

## `features/*/ui/widgets.tsx` の byte-identical 複製

以下の 3 ペアは `diff` 実測で **byte-identical**（exit code 0、出力空）。かつ `unifiedRegistry.ts` の import 先は `@/presentation/pages/...` 側であり（`unifiedRegistry.ts:17-19`）、`features/*/ui/widgets.tsx` を import する箇所は見つからない（`grep -rn "CATEGORY_WIDGETS\|COST_DETAIL_WIDGETS\|REPORTS_WIDGETS" app/src --include="*.ts" --include="*.tsx"` の結果、`presentation/pages/` と `features/` 以外から参照するファイル 0）。

| 複製ペア | 比較コマンド | 結果 |
|---|---|---|
| `presentation/pages/Category/widgets.tsx` ↔ `features/category/ui/widgets.tsx` | `diff <page> <feature>` | 相違なし（exit 0） |
| `presentation/pages/CostDetail/widgets.tsx` ↔ `features/cost-detail/ui/widgets.tsx` | 同上 | 相違なし（exit 0） |
| `presentation/pages/Reports/widgets.tsx` ↔ `features/reports/ui/widgets.tsx` | 同上 | 相違なし（exit 0） |

- `Daily` / `Insight` / `StoreAnalysis` については `features/<slice>/ui/widgets.tsx` は存在せず、複製ペアは発生しない（本 commit 時点。`find app/src/features -name widgets.tsx` で確認）
- 同じ export 名（`CATEGORY_WIDGETS` 等）が 2 ファイルに存在するが TypeScript コンパイルは通っている（pre-push `tsc -b --noEmit` PASS 実績あり、本 branch `d32d57b`）ため、import 経路が排他的（page 側のみが consumer 到達可能なグラフに存在）であることは事実として確認される

---

## `WidgetDef` の 2 型

同一名 `WidgetDef` の interface が **2 ファイルに独立に定義**されている。両者は構造が類似するが、`render` / `isVisible` の ctx 引数型が異なる。

### 型 A: Dashboard-local `WidgetDef`

- ファイル: `app/src/presentation/pages/Dashboard/widgets/types.ts`
- 定義行: `:101-111`

```typescript
export interface WidgetDef {
  readonly id: WidgetId                                          // Dashboard 固有の literal union 型
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode             // ctx = Dashboard-specific WidgetContext
  readonly isVisible?: (ctx: WidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}
```

ctx 引数型は `WidgetContext`（`types.ts:73-99`）。`UnifiedWidgetContext` を extends し、Dashboard が保証する 19 フィールドを required に昇格させた variant（詳細は下記「Dashboard `WidgetContext` 昇格フィールド」節）。

### 型 B: Unified `WidgetDef`

- ファイル: `app/src/presentation/components/widgets/types.ts`
- 定義行: `:225-235`

```typescript
export interface WidgetDef {
  readonly id: string                                            // 型 A と異なり literal union ではなく単なる string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: UnifiedWidgetContext) => ReactNode      // ctx = UnifiedWidgetContext（多くが optional）
  readonly isVisible?: (ctx: UnifiedWidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}
```

ctx 引数型は `UnifiedWidgetContext`（`types.ts:64-220`）。全ページの全 widget が参照しうるデータの上位集合。ページごとに提供できないフィールドは optional。

### 2 型が触れる登録 registry 対応

| registry | 使用する `WidgetDef` 型 | ctx 引数型 |
|---|---|---|
| Registry 1-5（Dashboard sub） | 型 A (Dashboard-local) | `WidgetContext`（required 多） |
| Registry 6-10（page-level） | 型 B (Unified) | `UnifiedWidgetContext`（optional 多） |

---

## `UnifiedWidgetContext` フィールド棚卸し

- ファイル: `app/src/presentation/components/widgets/types.ts`
- 定義行: `:64-220`

ソース内コメント（`types.ts:58-63`）:
> 全ページの全ウィジェットが参照しうるデータの上位集合。
> ページによっては提供できないフィールドは optional。
> ウィジェットの isVisible で利用可能性を判定する。

### A. コア（全ページ必須。ソース注記「全ページ必須」`types.ts:65`）

| # | フィールド | 型 | 行 |
|---|---|---|---|
| 1 | `result` | `StoreResult` | `:66` |
| 2 | `daysInMonth` | `number` | `:67` |
| 3 | `targetRate` | `number` | `:68` |
| 4 | `warningRate` | `number` | `:69` |
| 5 | `year` | `number` | `:70` |
| 6 | `month` | `number` | `:71` |
| 7 | `settings` | `AppSettings` | `:72` |
| 8 | `prevYear` | `PrevYearData` | `:73` |
| 9 | `stores` | `ReadonlyMap<string, Store>` | `:74` |
| 10 | `selectedStoreIds` | `ReadonlySet<string>` | `:75` |
| 11 | `explanations` | `StoreExplanations` | `:76` |
| 12 | `onExplain` | `(metricId: MetricId) => void` | `:77` |
| 13 | `observationStatus` | `ObservationStatus` | `:79` |
| 14 | `departmentKpi` | `DepartmentKpiIndex` | `:80` |
| 15 | `fmtCurrency` | `CurrencyFormatter` | `:82` |

### B. 期間選択（ソース注記「期間選択（新モデル）」`:84`）

| # | フィールド | 型 | 行 |
|---|---|---|---|
| 16 | `periodSelection?` | `PeriodSelection` | `:86` |

### C. Dashboard 固有（ソース注記「Dashboard 固有（他ページではオプション）」`:88`）

| # | フィールド | 型 | 行 |
|---|---|---|---|
| 17 | `storeKey?` | `string` | `:89` |
| 18 | `allStoreResults?` | `ReadonlyMap<string, StoreResult>` | `:90` |
| 19 | `currentDateRange?` | `DateRange` | `:91` |
| 20 | `prevYearScope?` | `PrevYearScope` | `:92` |
| 21 | `dataEndDay?` | `number \| null` | `:93` |
| 22 | `dataMaxDay?` | `number` | `:94` |
| 23 | `elapsedDays?` | `number \| undefined` | `:95` |
| 24 | `monthlyHistory?` | `readonly MonthlyDataPoint[]` | `:96` |
| 25 | `queryExecutor?` | `QueryExecutor \| null` | `:98` |
| 26 | `duckDataVersion?` | `number` | `:100` |
| 27 | `loadedMonthCount?` | `number` | `:102` |
| 28 | `weatherPersist?` | `WeatherPersister \| null` | `:104` |
| 29 | `prevYearMonthlyKpi?` | `PrevYearMonthlyKpi` | `:105` |
| 30 | `comparisonScope?` | `ComparisonScope \| null` | `:106` |
| 31 | `dowGap?` | `DowGapAnalysis` | `:107` |
| 32 | `onPrevYearDetail?` | `(type: 'sameDow' \| 'sameDate') => void` | `:108` |
| 33 | `prevYearStoreCostPrice?` | `ReadonlyMap<string, { cost: number; price: number }>` | `:110` |
| 34 | `weatherDaily?` | `readonly DailyWeatherSummary[]` | `:112` |
| 35 | `prevYearWeatherDaily?` | `readonly DailyWeatherSummary[]` | `:114` |
| 36 | `currentCtsQuantity?` | `CurrentCtsQuantity` | `:120` |

### D. 正本化 readModels（ソース注記「正本化 readModels（orchestrator 経由）」`:122`）

| # | フィールド | 型 | 行 |
|---|---|---|---|
| 37 | `readModels?` | `WidgetDataOrchestratorResult` | `:124` |

### E. 分析レーン（ソース注記「unify-period-analysis Phase 1 / 6 / 6.5」`:126-203`）

| # | フィールド | 型 | 行 |
|---|---|---|---|
| 38 | `freePeriodLane?` | `Readonly<{ frame: FreePeriodAnalysisFrame \| null; bundle: FreePeriodAnalysisBundle }> \| null` | `:141-144` |
| 39 | `timeSlotLane?` | `Readonly<{ frame: TimeSlotFrame \| null; bundle: TimeSlotBundle }> \| null` | `:160-163` |
| 40 | `storeDailyLane?` | `Readonly<{ frame: StoreDailyFrame \| null; bundle: StoreDailyBundle }> \| null` | `:180-183` |
| 41 | `categoryDailyLane?` | `Readonly<{ frame: CategoryDailyFrame \| null; bundle: CategoryDailyBundle }> \| null` | `:201-204` |

### F. 比較期間入力（ソース注記「比較期間入力（ページレベル DualPeriodSlider から）」`:206`）

| # | フィールド | 型 | 行 |
|---|---|---|---|
| 42 | `chartPeriodProps?` | `import('@/presentation/hooks/dualPeriod').ChartPeriodProps` | `:208` |

### G. ページ固有 optional（ソース注記で page 名明示）

| # | フィールド | 型 | 行 | ソース注記 |
|---|---|---|---|---|
| 43 | `insightData?` | `InsightData` | `:211` | `:210` 「Insight 固有」 |
| 44 | `costDetailData?` | `CostDetailData` | `:214` | `:213` 「CostDetail 固有」 |
| 45 | `selectedResults?` | `readonly StoreResult[]` | `:217` | `:216` 「Category 固有」 |
| 46 | `storeNames?` | `ReadonlyMap<string, string>` | `:218` | `:216` 「Category 固有」 |
| 47 | `onCustomCategoryChange?` | `(supplierCode: string, value: string) => void` | `:219` | `:216` 「Category 固有」 |

**総フィールド数**: 47（コア 15 + 期間選択 1 + Dashboard 固有 20 + readModels 1 + レーン 4 + 比較期間 1 + ページ固有 5）

---

## Dashboard `WidgetContext` 昇格フィールド

- ファイル: `app/src/presentation/pages/Dashboard/widgets/types.ts`
- 定義行: `:73-99`

`UnifiedWidgetContext` を `extends` し（`:73`）、以下のフィールドを **optional → required へ昇格**。

| # | フィールド | Unified 側の状態 | Dashboard 側 |
|---|---|---|---|
| 1 | `storeKey` | optional (`types.ts:89`) | required (`Dashboard/types.ts:74`) |
| 2 | `allStoreResults` | optional (`:90`) | required (`:75`) |
| 3 | `currentDateRange` | optional (`:91`) | required (`:76`) |
| 4 | `prevYearScope` | optional (`:92`) | required (`:77`、型は `PrevYearScope \| undefined`) |
| 5 | `selectedStoreIds` | required (`:75`) | required 再宣言 (`:78`) |
| 6 | `dataEndDay` | optional (`:93`) | required (`:79`) |
| 7 | `dataMaxDay` | optional (`:94`) | required (`:80`) |
| 8 | `elapsedDays` | optional (`:95`) | required (`:81`、型は `number \| undefined`) |
| 9 | `departmentKpi` | required (`:80`) | required 再宣言 (`:82`) |
| 10 | `explanations` | required (`:76`) | required 再宣言 (`:83`) |
| 11 | `onExplain` | required (`:77`) | required 再宣言 (`:84`) |
| 12 | `monthlyHistory` | optional (`:96`) | required (`:85`) |
| 13 | `queryExecutor` | `QueryExecutor \| null` optional (`:98`) | `QueryExecutor`（非 null）required (`:86`) |
| 14 | `duckDataVersion` | optional (`:100`) | required (`:87`) |
| 15 | `loadedMonthCount` | optional (`:102`) | required (`:88`) |
| 16 | `weatherPersist` | optional (`:104`) | required (`:89`、null 許容) |
| 17 | `prevYearMonthlyKpi` | optional (`:105`) | required (`:90`) |
| 18 | `comparisonScope` | optional (`:106`) | required (`:91`、null 許容) |
| 19 | `dowGap` | optional (`:107`) | required (`:92`) |
| 20 | `onPrevYearDetail` | optional (`:108`) | required (`:93`) |
| 21 | `fmtCurrency` | required (`:82`) | required 再宣言 (`:94`) |
| 22 | `prevYearStoreCostPrice` | optional (`:110`) | optional 継続 (`:95`) |
| 23 | `weatherDaily` | optional (`:112`) | optional 継続 (`:96`) |
| 24 | `prevYearWeatherDaily` | optional (`:114`) | optional 継続 (`:97`) |
| 25 | `currentCtsQuantity` | optional (`:120`) | required (`:98`) |

ソースコメント（`types.ts:70-71`）:
> Dashboard が保証するフィールドを required に昇格する。
> useUnifiedWidgetContext が全フィールドを設定するため、ランタイムでは常に全フィールドが存在する。

---

## ambiguity / 未追跡項目

### §a. `widgetVisibility.ts` の predicate 本体は本台帳で未追跡

`chart-timeslot-heatmap` と `chart-store-timeslot-comparison` の `isVisible` は関数参照（`isTimeSeriesVisible` / `isStoreComparisonVisible`）で、本体は `widgetVisibility.ts`（`registryChartWidgets.tsx:92,101` 付近の import。本 commit では該当ファイル未読）に実装されている。predicate 本体の分岐条件は本台帳では未追跡。

### §b. 子コンポーネントが触る ctx フィールド

多数の widget が full ctx を子 component に渡している（例: `UnifiedHeatmapWidget` / `AlertPanelWidget` / `WeatherWidget` / `ForecastToolsWidget` / `WaterfallChartWidget` / `GrossProfitHeatmapWidget`）。その場合、本台帳の「render が触る ctx field」列には **登録 registry の JSX から直接参照される props のみ**を記載している。子 component 内部で touch される field は本台帳では未追跡（別途 `inquiry/02-widget-ctx-dependency.md` で手動 trace する想定、checklist 記載）。

### §c. `analysis-category-pi` の表示状態

Registry 4（ANALYSIS）の `analysis-category-pi` は `isVisible: () => false`（`registryAnalysisWidgets.tsx` の該当箇所）で常時非可視。render 関数本体は存在するが実行経路に入らない。

### §d. registry.tsx の合成順序

`WIDGET_REGISTRY`（`registry.tsx:21-31`）は `WIDGETS_KPI` → `WIDGETS_CHART` slice → `WIDGETS_EXEC` slice → `WIDGETS_CHART` slice → `WIDGETS_ANALYSIS` → `WIDGETS_DUCKDB` slice → `WIDGETS_CHART` slice → `WIDGETS_DUCKDB` slice の形で interleave される。正確な slice 範囲と挿入順は `registry.tsx:22-30` を直読のこと（本台帳では概況のみ記録）。

### §e. `WidgetId` 型の literal union 実態

Dashboard-local `WidgetDef.id` の型は `WidgetId`（`Dashboard/widgets/types.ts:101` で利用、型定義自体は同ファイル上部。本 commit では literal union の全メンバーは未追跡）。Unified `WidgetDef.id` は単なる `string`（`components/widgets/types.ts:226`）。

### §f. `StoreAnalysis` ページ

`presentation/pages/StoreAnalysis/widgets.tsx` は `DEFAULT_STORE_ANALYSIS_WIDGET_IDS`（widget ID の配列。widget 定義自体は他 registry 参照）を export しているのみで、`readonly WidgetDef[]` を export しない（`grep -n "export const .*_WIDGETS" app/src/presentation/pages/StoreAnalysis/widgets.tsx` で実測）。本台帳の registry カウント 10 件には含めていない。

### §g. `Daily` / `Insight` ページの `features/*/ui/widgets.tsx`

`features/daily/ui/widgets.tsx` / `features/insight/ui/widgets.tsx` は本 commit 時点で存在しない（`find app/src/features -name widgets.tsx`）。本台帳の「byte-identical 複製」は `category` / `cost-detail` / `reports` の 3 件のみ。

---

## 付記: 本台帳の書き換え規則

plan.md §3 Phase 1 次 Phase への渡し方（`plan.md:121-125`）:

- 本ファイルは immutable。Phase 2 以降で追加情報が判明しても**書き換えず**、`01a-<slug>.md` / `01b-<slug>.md` として addend する
- 台帳の不備（事実の欠落）が Phase 2 レビューで判明した場合は Phase 1 に戻る（台帳再作成）


