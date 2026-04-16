# 05 — Phase 6 widget ctx consumers

> 役割: `checklist.md` Phase 6 「段階的画面載せ替え」の対象 6 widget について、
> 現在 `WidgetContext` から何を読んでいるか、および `ctx.freePeriodLane.bundle.fact`
> (`FreePeriodReadModel`) への載せ替え可否を箇所単位で固定する。
>
> 本棚卸しは Phase 6a / 6b (legacy caller 0 件到達) 完了後、widget 単位の
> 移行計画を立てる前段として作成された。

## 前提

### FreePeriodReadModel の提供面

`app/src/application/readModels/freePeriod/FreePeriodTypes.ts`

| フィールド | 粒度 | presentation 消費可否 |
|---|---|---|
| `currentRows` / `comparisonRows` | 日×店舗 raw row 配列 | **禁止** (G3-2) |
| `currentSummary` / `comparisonSummary` | 期間サマリー (totalSales / totalCustomers / totalPurchaseCost / totalDiscount / averageDailySales / transactionValue / discountRate / proratedBudget / budgetAchievementRate) | 可 |
| `meta.usedFallback` | boolean | 可 |

**制約**: `freePeriodHandlerOnlyGuard.test.ts` G3-2 が `FreePeriodDailyRow[]` の
presentation 層直接参照を禁止。widget / chart は summary しか消費できない。

### 現状

`ctx.freePeriodLane = { frame, bundle }` は `useUnifiedWidgetContext` で配布済みだが、
**Phase 6 対象 6 widget 全てで未使用**（grep で 0 件）。

## 箇所単位一覧

| Path | Lines | 種別 | 現在 ctx 依存 | 載せ替え可否 | リスク | Done |
|---|---|---|---|---|---|---|
| `presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx` + `.vm.ts` | 全体 | 比較ヘッダ | `result` (daily rollup) / `prevYearMonthlyKpi` / `prevYear.{daily,totalCtsQuantity,totalSales}` / `dowGap` / `comparisonScope` / `prevYearStoreCostPrice` / `currentCtsQuantity` / `readModels.customerFact` | **部分のみ**: `prevYearMonthlyKpi.{prevYearMonthlySales}` と `prevYear.totalSales` は `comparisonSummary.totalSales` に差し替え可。ただし 7 日 trend 計算 / store-level cost / dowGap 再構築は G3-2 で daily row が取れないため残る | HIGH | ✅ Step A (`dbf9aee` / `afdabb4`) — `selectPrevYearSummaryFromFreePeriod` + regression freeze guard で summary 部分を完全移行。legacy trend / dowGap / inventory 依存は Phase 6 scope 外として意図的に残る |
| `presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx` | 全体 | 期間サマリー | `result` (多数の daily 導出値) / `prevYear.{hasPrevYear,totalSales,totalCustomers}` / `observationStatus` / `readModels.customerFact` | **部分のみ**: `prevYear.{totalSales,totalCustomers}` → `comparisonSummary.{totalSales,totalCustomers}`。ただし `result.dailyCumulative` ベースの予算達成率 / inventory / markup rate はそのまま | HIGH | ✅ Step A (`dbf9aee` / `afdabb4`) — composer pattern (`preferFreePeriodPrevYearSummary`) 経由。`phase6SummarySwapGuard` baseline 2 で固定 |
| `presentation/components/charts/SalesPurchaseComparisonChart.tsx` (widget 経路: `registryChartWidgets.tsx`) | 全体 | 売上比較 chart | `allStoreResults` (StoreResult×store) / `stores` / `daysInMonth` / `chartPeriodProps` | **部分のみ** (Step B で対応): sales / purchaseCost per (store, day) は `StoreDailySeries` で代替可。推定在庫線は markup / discount rate + 仕入内訳が必要なので不可 | MEDIUM | ✅ **Phase 6.5-5a** (`fbcc023`) — `storeDailySeries` prop 経由で sales/purchase 抽出を移行。`storeDailyLaneSurfaceGuard` baseline **2 → 1 (permanent floor: `computeEstimatedInventory`)** |
| `presentation/pages/Dashboard/widgets/UnifiedAnalyticsWidgets.tsx` → `StoreHourlyChart.tsx` | 全体 | 時間帯比較 | ctx からは `queryExecutor` / `currentDateRange` / `selectedStoreIds` / `stores` のみ。実データは `useStoreHourlyChartPlan()` (独自 query plan) | **別レーン**: FreePeriodReadModel に時間帯次元なし。Phase 5 で既に Screen Plan 経由に抽象化済み。Phase 6 「載せ替え」対象として再解釈が必要 (時間帯用の別 bundle を作るか、対象外にする) | LOW | ✅ Step C (`ee11528`) — 別 sibling lane (`timeSlotLane`) として切り出し、`StoreHourlyChartLogic.ts` は `TimeSlotSeries` 経由に refactor。`timeSlotLaneSurfaceGuard` baseline 1 → 0 |
| `presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx` | 全体 | 仕入/原価比較 (Shapley waterfall) | `result.daily` / `prevYear.daily` / `comparisonScope` / `prevYearScope` / `queryExecutor` / CTS (category×time slot) raw records via `useYoYWaterfallPlan()` | **部分のみ** (Step B で対応): dept-only ウォーターフォールと qty 合計は `CategoryDailySeries` で代替可。Shapley 5-factor (`decompose5` / `decomposePriceMix`) は `dept\|line\|klass` leaf-grain 必須で不可 | HIGH | ✅ **Phase 6.5-5b** (`2ca6394`) — `buildCategoryData` / `aggregateTotalQuantity` を lane 経由に。`categoryDailyLaneSurfaceGuard` baseline **13 → 6 (permanent floor: Shapley 5-factor leaf-grain)** |
| `presentation/pages/Dashboard/widgets/WeatherWidget.tsx` / `WeatherAnalysisPanel.tsx` | 全体 | 天気連動 | `weatherDaily` (別 slice) / `result.daily` (correlation chart 用) / `comparisonScope.alignmentMode` | **部分のみ**: weather は直交。`result.daily` → `currentRows` は G3-2 で不可。`sales by dateKey` のような domain-level projection が必要 | MEDIUM | ✅ Step D (`c758dff`) — `buildDailySalesProjection` pure helper を `features/weather/application/projections/` に新設、`WeatherAnalysisPanel` を helper 呼び替え。`weatherCorrelationProjectionGuard` baseline 0 |

## 発見

1. **6 widget 中 HIGH 2 / MEDIUM 3 / LOW 1** — 現状の FreePeriodReadModel surface
   では「summary 値の差し替え」以上の載せ替えは成立しない
2. **FreePeriodReadModel に足りない次元** (全体) :
   - 店舗別日次シリーズ (SalesPurchaseComparisonChart)
   - category / department 次元の日次 (YoYWaterfallChart の Shapley waterfall)
   - dateKey→sales の daily projection (WeatherWidget correlation)
3. **時間帯比較** は FreePeriodReadModel の対象外 (時刻次元なし)。Phase 6 の 6 項目
   にそのまま入れるのは誤分類で、別レーン (time-slot 専用 bundle) として切り出すか
   Phase 6 対象から除外するのが正しい
4. **既に Screen Plan 経由で抽象化済みの widget** (StoreHourlyChart / YoYWaterfallPlan)
   は presentation 層から見ると既に「ctx fat reader」ではない。載せ替えは「Screen Plan
   が内部で何を叩くか」を FreePeriodHandler 系に寄せる話になり、presentation 層の
   touch は発生しない

## 結論 — Phase 6 全体クローズ (2026-04-15)

初版棚卸し時の「現状の `FreePeriodReadModel` surface では summary 差し替えの
みが成立する」という評価から、Step A-D の再構成を経て、Phase 6 / Phase 6.5
全体で以下の sibling lane 2 本が追加された:

- `ctx.timeSlotLane` (Step C): 時間帯比較を独立 lane 化
- `ctx.storeDailyLane` (Phase 6.5 Step B): 店舗別日次 projection
- `ctx.categoryDailyLane` (Phase 6.5 Step B): 部門×日次 projection

これに `buildDailySalesProjection` (Step D) を加え、6 widget 全てが
sibling lane / pure helper 経由で消費する構造に収束した。

## Permanent floor — 2 系統の intentional な残存

契約境界を守るために意図的に残した `result.daily` / `CategoryTimeSalesRecord`
参照が 2 系統存在する。いずれも「リファクタ不足」ではなく、各 projection
契約の最小面を超える計算のために必要な意図的 floor。

### 1. `storeDailyLaneSurfaceGuard` baseline = 1 (`computeEstimatedInventory`)

- **ファイル**: `presentation/components/charts/SalesPurchaseComparisonChart.tsx`
- **箇所**: `computeEstimatedInventory(s.result.daily, ...)` 1 箇所
- **必要な次元**: `DailyRecord` の `markup` / `discount rate` / 仕入内訳
  (interStoreIn/Out, interDeptIn/Out, flowers, directProduce)
- **なぜ `StoreDailySeries` で代替不能か**: Phase 6.5 Step B 設計時に
  `sales / customers / purchaseCost / grossSales` の最小面で閉じたため、
  在庫推定に必要な markup / discount / 仕入内訳を持たない
- **将来の選択肢**: Phase 7 以降で inventory projection (`StoreDailyInventorySeries`
  等) を別 phase として起こすことは可能。判断は保留

### 2. `categoryDailyLaneSurfaceGuard` baseline = 6 (Shapley 5-factor leaf-grain)

- **ファイル**:
  - `presentation/pages/Dashboard/widgets/YoYWaterfallChart.data.ts` = 3 refs
    (import + `buildFactorData` の `periodCTS` / `periodPrevCTS` interface field)
  - `presentation/pages/Dashboard/widgets/YoYWaterfallChart.builders.ts` = 3 refs
    (import + `PeriodAggregatesInput` の `periodCTS` / `periodPrevCTS` interface field)
- **呼び出される関数**:
  - `decompose5(..., recordsToCategoryQtyAmt(periodCTS), recordsToCategoryQtyAmt(periodPrevCTS))`
  - `decomposePriceMix(periodCTS, periodPrevCTS)`
- **key 粒度**: `recordsToCategoryQtyAmt` が `${dept.code}|${line.code}|${klass.code}`
  で category key を生成
- **なぜ `CategoryDailySeries` で代替不能か**: Shapley 5-factor は leaf category
  ごとの価格効果 / 構成比変化効果を積算する計算で、dept-only の
  `CategoryDailySeries` では line / klass を畳み込めない
- **将来の選択肢**: Phase 7 以降で `CategoryLeafDailySeries` のような
  leaf-grain contract を別 phase として起こすことは可能。ただし Step B 設計
  (§6 リスク #3) で明示的に scope 外としたため、当面は permanent floor

## 運用

- 本ファイルは Phase 6 全体の Done 記録。Phase 6 / Phase 6.5 は全 step 完了
  (上表の Done 列参照)
- 2 系統の permanent floor は後任者向けに HANDOFF.md Phase 6 全景ブロックにも
  再掲されている。guard baseline をそれ以下に縮退させる PR は原則拒否し、
  別 phase で leaf-grain / inventory contract を設計する判断として扱う
