# inquiry/03 — registry 未登録 UI component 列挙

> 役割: Phase 1 inquiry 成果物 #3。`features/*/ui/` と `pages/*/widgets/` 配下の全 UI component（`.tsx`）を、widget registry からの到達可能性で分類する。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`03a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `a05c162`（inquiry/04 push 直後。UI コード変更なし） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `app/src/presentation/pages/*/widgets/` および `app/src/features/*/ui/` の全 `.tsx`（除: `__tests__/` / `.test.tsx` / `.stories.tsx` / `.styles.ts` / `.vm.ts` / `types.ts` / `index.ts` barrel） |
| 方法 | Explore agent による import graph 走査 + 本台帳作成者による追加 grep 検証 |

## Tier 定義

widget registry（10 件の `readonly WidgetDef[]` constants、および合成 `WIDGET_REGISTRY` / `UNIFIED_WIDGET_REGISTRY`）からの到達可能性で UI component を 5 階層に分類:

| Tier | 定義 |
|---|---|
| A | registry `.tsx` が直接 import している component（widget の render 関数の直接 child）|
| B | Tier A component から（推移的に）import される component（widget 内部の subtree）|
| C | page component（非 registry）や presentation 層 infrastructure から import される component（widget tree 外）|
| D | **orphan** — registry / page / feature entry point のいずれからも到達不可 |
| E | test-only — `*.test.tsx` / `.stories.tsx` / `__tests__/` からのみ参照（本台帳集計対象外）|

## 集計

| 指標 | 値 |
|---|---|
| Dashboard/widgets 配下 `.tsx`（テスト等除く） | 55 |
| features/\*/ui 配下 `.tsx`（テスト等除く） | 59 |
| 合計 candidate 数 | 114 |
| Tier A（registry 直接 child） | 13 |
| Tier B（widget 内部 subtree） | 60+（厳密数は未確定、後 Phase に送る）|
| Tier C（widget tree 外）| 25+（同上）|
| **Tier D（orphan）** | **3** |
| Tier E（test-only） | 台帳集計対象外 |

## Tier D（orphan）完全列挙

以下の 3 component は、registry / page / feature entry point のいずれからも import されていないことを `grep -rn` で確認済み:

### D-1. `app/src/presentation/pages/Dashboard/widgets/DowGapKpiCard.tsx`

- export: `DowGapKpiCard`（function component、`:10`）
- import 元: **なし**（self 以外の `app/src` 全域で import 行 0 件）
- 関連 sidecar: なし（.styles.ts / .vm.ts 無し）

### D-2. `app/src/presentation/pages/Dashboard/widgets/PlanActualForecast.tsx`

- export: `renderPlanActualForecast`（render helper function、`:44`）
- import 元: **なし**（self 以外の `app/src` 全域で import 行 0 件。ただし `__tests__/PlanActualForecast.test.tsx` からは参照あり → Tier E 扱いで orphan 判定成立）
- 関連 sidecar: なし

### D-3. `app/src/presentation/pages/Dashboard/widgets/RangeComparison.tsx`

- export: `RangeComparisonPanel`（function component、`:53`）
- import 元: **なし**（self 以外の `app/src` 全域で import 行 0 件）
- 関連 sidecar: `RangeComparison.styles.ts` が存在し、`DashboardPage.styles.ts:16` で `export * from './RangeComparison.styles'` として barrel 経由 re-export されている。ただし `.tsx` component 本体は参照されていない

## Tier A（registry 直接 child）列挙

registry 10 ファイル（`registryKpiWidgets.tsx` / `registryChartWidgets.tsx` / `registryExecWidgets.tsx` / `registryAnalysisWidgets.tsx` / `registryDuckDBWidgets.tsx` / `Daily/widgets.tsx` / `Insight/widgets.tsx` / `Category/widgets.tsx` / `CostDetail/widgets.tsx` / `Reports/widgets.tsx`）の import 宣言から抽出。

| component | 所属 registry | WID |
|---|---|---|
| `ConditionSummaryEnhanced` | WIDGETS_KPI | WID-001 |
| `IntegratedSalesChart` | WIDGETS_CHART | WID-002（`@/presentation/components/charts/advanced` 経由）|
| `UnifiedHeatmapWidget` | WIDGETS_CHART | WID-004 |
| `UnifiedStoreHourlyWidget` | WIDGETS_CHART | WID-005 |
| `WeatherWidget` | WIDGETS_CHART | WID-007 |
| `AlertPanelWidget` | WIDGETS_EXEC | WID-008 |
| `ForecastToolsWidget` | WIDGETS_EXEC | WID-014 |
| `WaterfallChartWidget` | WIDGETS_ANALYSIS | WID-015 |
| `GrossProfitHeatmapWidget` | WIDGETS_ANALYSIS | WID-016 |
| `BudgetSimulatorWidget` | INSIGHT_WIDGETS | WID-033 |
| `CategoryTotalView` | CATEGORY_WIDGETS | WID-038 |
| `CategoryComparisonView` | CATEGORY_WIDGETS | WID-039 |
| その他 inline JSX 展開 render の Tier A（`KpiCard` / `KpiGrid` / `ReportSummaryGrid` / `ReportDeptTable` / `PurchaseTab` / `TransferTab` / `CostInclusionTab` / chart registry 内の個別 `registerChart` 等）| 各 page widgets.tsx | WID-040〜045 + chart 展開 |

事実: 渡される child component には 2 種がある。(1) 固有の `*Widget` suffix を持つ Dashboard widget adapter（8 件、`*Widget` = `ConditionSummaryEnhanced` / `IntegratedSalesChart` 経由含む）、(2) page-level registry の render 内で inline JSX 展開される汎用 component（`KpiCard` / `KpiGrid` 等）。

## Tier B / C の近似列挙（完全ではない）

**Tier B（widget 内部 subtree）** の代表例:

- Budget feature 内部（`BudgetSimulatorWidget` の subtree）:
  - `BudgetSimulatorView` / `DailyBarChart` / `DayCalendarCell` / `DayCalendarInput` / `DowAverageRow` / `DrillCalendar` / `DrilldownPanel` / `ProjectionBarChart` / `RemainingInputPanel` / `StripChart` / `TimelineSlider`（11 component）
- Category feature 内部（`CategoryTotalView` / `CategoryComparisonView` の subtree）:
  - `CategoryBoxPlotView` / `CategoryBenchmarkSubViews` / `CategoryDiscountTable` / `CategoryExplorerTable` / `CategoryHeatmapPanel` / `CategoryBoxPlotBreakdownCharts` + 他
- Dashboard/widgets 内部（`ConditionSummaryEnhanced` / `YoYWaterfallChart` 等の subtree）:
  - `ConditionSummaryBudgetDrill` / `ConditionSummaryDailyChart` / `ConditionSummaryDailyModal` / `ConditionSummaryEnhancedRows` / `ConditionSummaryYoYDrill` / `ConditionScrollableCardRow` / `ConditionSettingsPanel` / `ConditionCardShell` / `ConditionDetailPanels` / `conditionPanel*.tsx`（7 件）/ `YoYWaterfallChart.subcomponents`

**Tier C（widget tree 外から使われる）** の代表例:

- `CategoryHierarchyContext` / `CategoryHierarchyProvider`: `DashboardPage.tsx:14,178,266` から page レベルで使用（registry 未経由）
- `InsightTabDecomposition` / `DecompositionTabContent`: `Insight/widgets.tsx:68`（WID-036 `insight-decomposition` の render 内）で使用。ただし registry export ではなく registry 定義内で inline import された形 → 分類判定上は **Tier A/B 中間**。本台帳では Tier B（registry 定義行が直接触れているが widget adapter でなく内部 helper）
- `InsightTabBudget` / `BudgetTabContent` / `GrossProfitTabContent` / `ForecastTabContent` 系: `Insight/widgets.tsx` から inline import → Tier A 寄り Tier B
- `SalesAnalysisWidgets` barrel re-export（`Dashboard/widgets/SalesAnalysisWidgets.tsx` → `@/features/sales/ui/SalesAnalysisWidgets`）: `renderDowAverage` / `renderWeeklySummary` を `registryExecWidgets.tsx` が使用
- `StoreKpiTableInner` / `KpiTableWidgets` / `TableWidgets` / `DataTableWidgets`: Dashboard/widgets 内 table helper 群。registry 定義の render helper 委譲先
- Storage-admin feature の全 UI（`BackupSection` / `ClearAllDataSection` / `DeviceSyncSection` / `DuckDbCacheSection` / `MonthDataSection` / `StorageDataViewers` / `StorageStatusSection`）: registry 経由ではなく page `StorageAdmin` から直接使用
- Purchase feature の `PurchaseDailyPivot` / `PurchaseTables` / `PurchaseVsSalesChart`: Dashboard page から直接使用

> 注記: Tier B / C の完全列挙は未実施（厳密な transitive closure に時間を要するため）。本台帳は Tier D（orphan）の確定列挙を主目的とする。Tier B/C の個別分類は Phase 6 の frontmatter generator が AST で自動生成する想定。

## Tier E（test-only、本台帳集計対象外）

以下は本台帳の集計から除外した:

- `app/src/presentation/pages/Dashboard/widgets/__tests__/*.test.tsx`（5 件）
- `app/src/presentation/pages/Dashboard/widgets/__tests__/widgetTestHelpers.tsx`
- その他 `.test.tsx` / `.stories.tsx` suffix を持つ全 `.tsx` ファイル

## 特殊事例

### 特殊 1: `features/{category,cost-detail,reports}/ui/widgets.tsx` の 3 ファイル byte-identical 複製

`inquiry/01-widget-registries.md §「features/\*/ui/widgets.tsx の byte-identical 複製」` で記録済みの事実:

- `features/category/ui/widgets.tsx` ≡（diff 0）= `pages/Category/widgets.tsx`
- `features/cost-detail/ui/widgets.tsx` ≡ `pages/CostDetail/widgets.tsx`
- `features/reports/ui/widgets.tsx` ≡ `pages/Reports/widgets.tsx`

本台帳での分類: **Tier C 相当の状態で複製されているが、`unifiedRegistry.ts` は pages 版のみを import（inquiry/01 より）**。features 版は事実上 dead code だが、同じ export 名で再宣言されており import 経路が排他的（TypeScript コンパイルは通っている）。**orphan（Tier D）ではなく Tier C 相当の複製**として扱う。

### 特殊 2: `ConditionSummaryEnhanced.tsx` が `useSettingsStore` を直接 import

`ConditionSummaryEnhanced.tsx:24` が `@/application/stores/settingsStore` を直接 import している（WID-001 spec Section 9 参照）。widget 本体から presentation store を直接触る形。本節の Tier 分類には関係しないが、inquiry 台帳の事実として記録。

### 特殊 3: `SalesAnalysisWidgets` barrel re-export

`Dashboard/widgets/SalesAnalysisWidgets.tsx` は実装ではなく barrel re-export（`@/features/sales/ui/SalesAnalysisWidgets`）。`renderDowAverage` / `renderWeeklySummary` を `registryExecWidgets.tsx` が使用（WID-009 / WID-010）。Dashboard 側の barrel が features の内部実装を間に中継している。

### 特殊 4: Explore agent の誤検出訂正

本台帳作成時、`inquiry/03` 用 Explore agent 出力に **2 件の誤検出**があり、grep 検証で Tier D を 5 件 → 3 件に訂正:

| agent が orphan と判定 | 実際は | 参照経路 |
|---|---|---|
| `CategoryHierarchyContext.tsx` | **使用中（Tier B 〜 C）** | `CategoryHierarchyProvider` を `DashboardPage.tsx:14,178,266` が instantiate |
| `InsightTabDecomposition.tsx` | **使用中（Tier B）** | `DecompositionTabContent` を `Insight/widgets.tsx:68`（WID-036）が使用 |

訂正後の確定 Tier D = 3 件（DowGapKpiCard / PlanActualForecast / RangeComparison）。

## Ambiguity / 未追跡項目

- **Tier B / C の境界** — 「widget 内部 subtree」と「widget tree 外」の区別は、transitive closure の計算深度次第で変わる。本台帳は代表例のみを列挙し、完全分類は Phase 6 の generator に委ねる
- **barrel 経由 re-export の tier 判定** — `features/<slice>/ui/index.ts` / `features/<slice>/index.ts` のような barrel を経由する多段 re-export がある場合、import グラフ上は reachable だが「直接 import」の tier 判定には揺れがある
- **`RangeComparison.styles.ts` の barrel re-export** — `.tsx` 本体は orphan だが、`.styles.ts` 側は `DashboardPage.styles.ts:16` から `export *` で再エクスポートされている。style 定義が残存している事実
- **test-only（Tier E）の判定** — `*.test.tsx` / `.stories.tsx` からのみ参照される component は本台帳で集計対象外としたが、product code で使われていない事実は、別の観点（`PlanActualForecast.tsx` のように test はあるが本番 import 0）で Tier D と重なる可能性がある

## 付記

- 本台帳は immutable。Phase 2 以降の追加情報は `03a-*.md` として addend する
- 関連: `inquiry/01-widget-registries.md`（registry 10 件と widget 45 件の起点情報）、`inquiry/02-widget-ctx-dependency.md`（per-widget ctx touch 列挙）
