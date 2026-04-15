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

| Path | Lines | 種別 | 現在 ctx 依存 | 載せ替え可否 | リスク |
|---|---|---|---|---|---|
| `presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx` + `.vm.ts` | 全体 | 比較ヘッダ | `result` (daily rollup) / `prevYearMonthlyKpi` / `prevYear.{daily,totalCtsQuantity,totalSales}` / `dowGap` / `comparisonScope` / `prevYearStoreCostPrice` / `currentCtsQuantity` / `readModels.customerFact` | **部分のみ**: `prevYearMonthlyKpi.{prevYearMonthlySales}` と `prevYear.totalSales` は `comparisonSummary.totalSales` に差し替え可。ただし 7 日 trend 計算 / store-level cost / dowGap 再構築は G3-2 で daily row が取れないため残る | HIGH |
| `presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx` | 全体 | 期間サマリー | `result` (多数の daily 導出値) / `prevYear.{hasPrevYear,totalSales,totalCustomers}` / `observationStatus` / `readModels.customerFact` | **部分のみ**: `prevYear.{totalSales,totalCustomers}` → `comparisonSummary.{totalSales,totalCustomers}`。ただし `result.dailyCumulative` ベースの予算達成率 / inventory / markup rate はそのまま | HIGH |
| `presentation/components/charts/SalesPurchaseComparisonChart.tsx` (widget 経路: `registryChartWidgets.tsx`) | 全体 | 売上比較 chart | `allStoreResults` (StoreResult×store) / `stores` / `daysInMonth` / `chartPeriodProps` | **不可** (現状): chart が per-store × per-day timeseries を plot する。FreePeriodReadModel は summary のみで店×日次列を取れない。移行するには domain 層に「店舗別日次シリーズ builder」を新設する必要あり | MEDIUM |
| `presentation/pages/Dashboard/widgets/UnifiedAnalyticsWidgets.tsx` → `StoreHourlyChart.tsx` | 全体 | 時間帯比較 | ctx からは `queryExecutor` / `currentDateRange` / `selectedStoreIds` / `stores` のみ。実データは `useStoreHourlyChartPlan()` (独自 query plan) | **別レーン**: FreePeriodReadModel に時間帯次元なし。Phase 5 で既に Screen Plan 経由に抽象化済み。Phase 6 「載せ替え」対象として再解釈が必要 (時間帯用の別 bundle を作るか、対象外にする) | LOW (現状放置でも問題なし) |
| `presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx` | 全体 | 仕入/原価比較 (Shapley waterfall) | `result.daily` / `prevYear.daily` / `comparisonScope` / `prevYearScope` / `queryExecutor` / CTS (category×time slot) raw records via `useYoYWaterfallPlan()` | **不可** (現状): Shapley 分解は category×time slot×day 粒度が必要。FreePeriodReadModel に category 次元なし。移行するには FreePeriodDeptKPI bundle + daily category rollup の新設が必要 | HIGH |
| `presentation/pages/Dashboard/widgets/WeatherWidget.tsx` | 全体 | 天気連動 | `weatherDaily` (別 slice) / `result.daily` (correlation chart 用) / `comparisonScope.alignmentMode` | **部分のみ**: weather は直交。`result.daily` → `currentRows` は G3-2 で不可。`sales by dateKey` のような domain-level projection が必要 | MEDIUM |

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

## 結論 — Phase 6 スコープ再定義が必要

現状の checklist Phase 6 (6 checkbox) をそのまま実行すると以下の問題が起きる:

- HIGH リスク widget を闇雲に差し替えると summary 値だけで済まない部分が
  presentation 層で再集計される形になり、G3-2 違反または partial 差し替えの
  片手落ちになる
- LOW リスク (時間帯) は既に抽象化済みで「載せ替え」の意味が薄い

### 推奨する再構成

| 新 scope | 作業 | 優先度 |
|---|---|---|
| **Step A: summary 差し替え** | `prevYearMonthlyKpi.prevYearMonthlySales` / `prevYear.{totalSales,totalCustomers}` のような summary 読み出しだけを `comparisonSummary` 経由に付け替える (ConditionSummaryEnhanced / ExecSummaryBar 対象) | 先行 (低リスク、型で保証できる) |
| **Step B: FreePeriodReadModel 次元拡張** | 店舗別日次シリーズ / category 次元を bundle に足す (Sales 比較 / YoYWaterfall の前提条件) | 中 (readModel 変更 + 定義書更新を伴う) |
| **Step C: 時間帯比較 scope 整理** | Phase 6 から除外するか、`ctx.freePeriodLane.timeSlotBundle` のような別レーンを定義する | 低 |
| **Step D: 天気 correlation 用 domain projection** | `buildDailySalesProjection(currentRows)` のような domain-layer helper を作り、widget はそれを消費 | 低 |

### 次アクション候補

1. Step A (summary swap 2 widget 分) を小 PR で先行。既存値との parity test を
   付けて差分が出ないことを確認してから merge
2. Step B を別 design session として立ち上げる。`FreePeriodReadModel` に新フィールド
   を追加する意思決定 (定義書 + guard 更新) は Phase 6 と切り離した単独 phase
   (Phase 6.5 等) の方が見通しが良い
3. checklist.md Phase 6 のチェック項目を本棚卸し結果で置き換える (6 項目 → 4
   項目 + 再分類)

## 運用

- 本ファイルは Phase 6 着手前の planning artifact。PR を積むたびに「Done: `<commit>`」
  列を追加する運用は他 inventory と同じ
- HIGH リスク項目は Step B の readModel 拡張が入るまでは `[ ]` のまま置く
