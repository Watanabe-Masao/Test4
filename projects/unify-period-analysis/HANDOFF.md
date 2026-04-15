# HANDOFF — unify-period-analysis

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

project ディレクトリを bootstrap し、運用切替まで完了した段階。
`AI_CONTEXT.md` / `plan.md` / `checklist.md` / `pr-breakdown.md` /
`review-checklist.md` / `acceptance-suite.md` / `test-plan.md` /
`config/project.json` を作成済み。`CURRENT_PROJECT.md` を本 project に切替済み
（commit `152f421`）。`aag/execution-overlay.ts` を pure-calculation-reorg から
コピーして配置済み（案件固有の調整は overlay レベルで Phase 7 以降に行う）。

**Phase 0 棚卸し + 実体確定完了**（`inventory/01〜04.md` に結果記入済み）。結果サマリ:

| Inventory | 対応 Phase | 件数 | 主要な発見 |
|---|---|---|---|
| 01 比較先日付独自計算 | Phase 2 | **4 件 / 3 ファイル** | `YoYWaterfallChart.logic.ts` が主犯。`year-1 + dowOffset` で前年同曜日を自前構築 |
| 02 非 handler 取得経路 | Phase 3 | **0 件** | 自由期間取得は既に canonical 3 本に収束済み。Phase 3 は G3 ガード追加 + 明文化に縮退 |
| 03 SQL 内 rate 計算 | Phase 4 | **Phase 4 で剥離済み** | `freePeriodDeptKPI.ts` の 4 箇所を `SUM(rate × sales) AS "*RateWeighted"` に置換し、率への変換は `readFreePeriodDeptKPI.ts` の `weightedAverageRate()` pure helper で実行。`noRateInFreePeriodSqlGuard` で再発防止 |
| 04 ヘッダ state 直接参照 | Phase 1 | **1 起点 + 実体確定** | `HeaderFilterState` は実在しない仮名。実体は `PeriodSelection` + `usePeriodSelectionStore`。`buildFreePeriodFrame` + `useFreePeriodAnalysisBundle` は **Phase 1 で `useUnifiedWidgetContext` に配線済み**（`ctx.freePeriodLane = { frame, bundle }` として公開） |

### plan.md / checklist.md への反映（commit `4212553` — 2026-04-14）

- `plan.md` Phase 0 に補記を追加（`HeaderFilterState` 仮名の実体が `PeriodSelection` である旨）
- `plan.md` Phase 1 を「adapter を 1 箇所に実装」から「既存 adapter (`buildFreePeriodFrame` + `useFreePeriodAnalysisBundle`) を `useUnifiedWidgetContext` に配線」に書き換え
- `plan.md` Phase 3 を「データレーン固定（実装コード移行）」から「明文化 + G3 ガード追加」に縮退
- `checklist.md` Phase 1 / Phase 3 を同方向に再記述

なお `pure-calculation-reorg` は `status: active` のまま並行運用扱い。
切り戻す場合は `CURRENT_PROJECT.md` の 1 行を書き換えるだけで戻せる。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 完了済み

- **Phase 0** 棚卸し完了 (commit `023c7d7`)
- **Phase 0.5** Critical Path Acceptance Suite 骨格配置完了 (commit `157dc7a`)
- **Phase 1** frame 配線完了 (commit `5c32bd8`、PR #1038 で main へ merge 済み)
- **Phase 1** 暫定二重入口 parity test (commit `8428f74`)
- **Phase 2** 比較解決一本化完了 (commit `7c73e89`)
- **Phase 2b** 単一出力契約 `ComparisonResolvedRange` (commit `e9023ab`)
- **Phase 3** 自由期間データレーン明文化 + G3 ガード追加 (commit `257299c`)
- **Phase 3 封じ手** `comparisonResolvedRangeSurfaceGuard` (commit `bb024a9`)
- **Phase 4** 率計算を SQL から pure builder に剥離 (commit `1ba2fd0`)
- **Phase 5 見本実装** `YoYChart.tsx` を pure builder 経由に移行 (commit `666a964`)
- **Phase 5 ルール化** Chart Input Builder Pattern 正式化 (commit `1c3b907`)
- **Phase 5 横展開 第 1 バッチ** 5 chart を共通 builder `buildBaseQueryInput` 経由に移行、chartInputBuilderGuard baseline 8 → 3 (commit `3d72cda`)
- **Phase 5 横展開 第 2 バッチ** 残 3 件 (`FactorDecompositionPanel` / `useDeptHourlyChartData` / `useCategoryHierarchyData`) を共通 builder `buildPairedQueryInput` 経由に移行、chartInputBuilderGuard baseline 3 → 0 (commit `d99ca60`) **入力側 Phase 5 完了**
- **Phase 5 三段構造確立** `chart-rendering-three-stage-pattern.md` 新設、`YoYChartOptionBuilder.ts` に option builder 抽出 (YoYChart.tsx 260 → 162 行)、`chartRenderingStructureGuard` 追加 (baseline 3 件 ratchet-down) (commit `4a7311c`) **描画側 Phase 5 pattern 正式化**
- **Phase 5 閉じ込み (描画側)** `ChartRenderModel<TPoint>` 共通契約を新設 (`chartRenderModel.ts` + 12 tests)、残 3 chart (`DiscountTrendChart` / `GrossProfitAmountChart` / `PrevYearComparisonChart`) を `*Logic.ts` に抽出し共通契約に揃えた。`chartRenderingStructureGuard` baseline 3 → 0 (commit `302a981`) **Phase 5 完全完了**
- **Phase 6a (scope 二重構築解消)** `useComparisonModule` に optional `externalScope` パラメータを追加、`useComparisonSlice` が `frame.comparison` を pass-through することで scope の二重構築を解消。`useComparisonModuleExternalScope.test.ts` (8 tests) で解決ロジックを locked (commit `e148b9d`)
- **Phase 6a→6b 移行保証** `useComparisonModuleLegacyCallerGuard.test.ts` を新設。`useComparisonModule` の legacy 3 引数 caller を ratchet-down で固定 (baseline 2 件: `MobileDashboardPage` / `useInsightData`) (commit `c82c634`)
- **Phase 6b 完了** `usePageComparisonModule` wrapper を新設 (`application/hooks/`) し、`MobileDashboardPage` と `useInsightData` の両 caller を wrapper 経由に移行。legacy guard baseline 2 → 0。`useComparisonModule` の legacy 3 引数 caller は 0 件に到達（本 commit）
- **Phase 6 棚卸し** (`inventory/05-phase6-widget-consumers.md`) 6 widget の ctx 依存を箇所単位で固定、Step A-D 構造に再構成 (commit `4532382`)
- **Phase 6 Step C pre-work (方針固定)** 時間帯比較は `FreePeriodReadModel` に吸収せず sibling lane (`ctx.timeSlotLane`) として切り出す方針を 3 点セット (`step-c-timeslot-lane-policy.md` + `TimeSlotBundle.types.ts` 型契約 + `timeSlotLaneSurfaceGuard` baseline 1) で固定。比較意味論表を明文化 (sameDate / sameDayOfWeek 流用、wow 除外、ComparisonScope 流用) (commit `e851835`)
- **Phase 6 Step A 完了 (summary swap)** `selectPrevYearSummaryFromFreePeriod` pure selector を新設 (`application/readModels/freePeriod/`)、8 件 unit/parity test で `comparisonSummary` → 旧 prev-year 命名の射影を locked。`ConditionSummaryEnhanced` (`buildBudgetHeader` 第 5 引数 override) / `ExecSummaryBarWidget` (`pyRatio` / `pyTxValue`) を selector 経由に差し替え。bundle 未ロード時は legacy `prevYear` フォールバック (commit `dbf9aee`)
- **Phase 6 Step A regression freeze** selector に `source: 'freePeriod' | 'legacy' | 'none'` タグを追加し、`selectPrevYearSummaryFromLegacy` adapter + `preferFreePeriodPrevYearSummary` composer を導入。`ExecSummaryBarWidget` を composer pattern に refactor し、`prevYear.*` のバラ参照を adapter 1 箇所 (2 occurrences) に集約。`phase6SummarySwapGuard.test.ts` を新設し ConditionSummaryEnhanced (baseline 0) / ExecSummaryBarWidget (baseline 2) を per-file count baseline で凍結。Step B 完了時に 0 到達予定 (commit `afdabb4`)
- **Phase 6 Step C 意味境界の凍結 (projection truth-table)** `projectTimeSlotSeries` pure 関数を新設 (`application/hooks/timeSlot/`)、18 件の truth-table parity test で `StoreAggregationRow[] → TimeSlotSeries` の変換意味を凍結 (hour 並び順 / 欠損 null / store subset / 同 cell 合算 / 範囲外 defensive / dayCount 伝搬 / grandTotal 整合 / sameDate vs sameDayOfWeek の 2 回呼び pattern / projection は meta なし etc)。`TimeSlotBundle.types.ts` に `TimeSlotProvenance` (`mappingKind` / `comparisonRange` 必須) + `TimeSlotMeta.provenance` を required 化。`timeSlotLaneSurfaceGuard` に新型 + projection ファイル存在 check 2 件追加 (commit `d346406`)
- **Phase 6 Step C 実装完了** `useTimeSlotBundle` hook を新設 (`application/hooks/timeSlot/`)。frame から `StoreAggregationInput` を構築 → `storeAggregationHandler` を current/comparison で呼び → `projectTimeSlotSeries` で series を組み立てて `TimeSlotBundle` を返す。`useUnifiedWidgetContext` に `ctx.timeSlotLane = { frame, bundle }` を配布 (`UnifiedWidgetContext` フィールド数 baseline 48 → 49 に更新)。`StoreHourlyChartLogic.buildStoreHourlyData` を `TimeSlotSeries` 入力に refactor (raw row 直接 import を削除)。`StoreHourlyChart.tsx` を `useTimeSlotBundle` 経由に切り替え。`chartLogicBatch3.test.ts` を新 signature に追従 (23 件 PASS)。`timeSlotLaneSurfaceGuard` baseline **1 → 0 達成** (commit `ee11528`)
- **Phase 6 Step D 完了 (天気 correlation projection 正本化)** `buildDailySalesProjection` pure helper を `features/weather/application/projections/` に新設。`StoreDaySummaryRow[]` → `DailySalesForCorrelation[]` の変換意味を 10 件 truth-table / parity test で凍結 (同一 dateKey 合算 / dateKey 昇順ソート / 空入力 / year-month-day pass-through / 月跨ぎ / legacy regression matrix)。`WeatherAnalysisPanel.tsx` から日別再集計 (`new Map<number, ...>`) / `toDateKeyFromParts` ad hoc 組み立てを削除し、helper を呼ぶだけに書き換え。`weatherCorrelationProjectionGuard.test.ts` を新設 (baseline 0 で pattern 再出現を禁止 + helper import 強制)。`features/weather` barrel に `buildDailySalesProjection` を追加 (commit `c758dff`)
- **CodeRabbit review 対応** (commit `8413b12`) Zod schema (`PrevYearSummaryProjectionSchema` + `.parse()` at selector outputs)、HANDOFF.md MD028 修正、`useUnifiedWidgetContext` の `effectiveEndDay` 共通化、`useTimeSlotBundle` の `resolveMappingKind` 関数化 (switch + `never` exhaustive check)、`phase6SummarySwapGuard` の import regex 化
- **Phase 6.5 / Step B 設計固定** `phase-6-5-step-b-design.md` を新設。`FreePeriodReadModel` を触らず sibling lane (`ctx.storeDailyLane` / `ctx.categoryDailyLane`) 2 本で店舗別日次 + category 次元を配布する方針を固定。6 phase 実装順 (型契約 → 真理表 → pure projection → bundle → widget 載せ替え → クローズ) と AR-003 fieldMax 49 → 51 の ratchet-up 承認を明文化 (commit `88c40f8`, PR #1039 merged)
- **Phase 6.5-1 完了 (型契約 + pre-work guard)** `StoreDailyBundle.types.ts` / `CategoryDailyBundle.types.ts` を新設 (型契約のみ、実装なし)。両方とも `{Frame, DataPoint, Entry, Series, Provenance, Meta, Bundle, Lane}` の 8 interface を export し、Step C の `TimeSlotBundle.types.ts` と同形の sibling pattern を踏襲。`storeDailyLaneSurfaceGuard.test.ts` (5 tests) で `SalesPurchaseComparisonChart.tsx` の `result.daily` 直接 iterate を baseline 2 で固定、`categoryDailyLaneSurfaceGuard.test.ts` (5 tests) で YoYWaterfall ecosystem 4 ファイルの `CategoryTimeSalesRecord` 参照 (builders=3/data=5/logic=3/vm=2) を per-file baseline で固定。両 guard とも Phase 6.5-5 で 0 到達目標 (commit `27c1b01`)
- **Phase 6.5-2 完了 (projection 意味境界の凍結)** `projectStoreDailySeries.ts` / `projectCategoryDailySeries.ts` pure 関数を新設 (`application/hooks/storeDaily/` / `application/hooks/categoryDaily/`)、15 + 18 = **33 件の truth-table parity test** で `StoreDaySummaryRow[] → StoreDailySeries` / `CategoryTimeSalesRecord[] → CategoryDailySeries` の変換意味を凍結 (storeId/deptCode/dateKey 昇順ソート / 同一 key 合算 / 欠損日 no-padding / store/dept subset / dayCount 伝搬 / grandTotals 整合 / 4 metric pass-through / CategoryTimeSalesRecord → customers=0 pin / deptName pin / 月跨ぎソート etc)。`EMPTY_STORE_DAILY_SERIES` / `EMPTY_CATEGORY_DAILY_SERIES` canonical 定数を export。両 surface guard に projection ファイル存在 check を追加 (+1 test ずつ)。Step C の `d346406` (projectTimeSlotSeries) と同じ「意味境界の凍結」commit であり、以降の hook 実装 / widget 載せ替えは「方針を実装する作業」になる (commit `c340518`)
- **Phase 6.5-4 完了 (bundle + ctx 配布)** `useStoreDailyBundle` / `useCategoryDailyBundle` hook を新設 (`application/hooks/storeDaily/` / `application/hooks/categoryDaily/`)。両方とも **lane 非依存** (widget 専用 plan を再利用せず `storeDaySummaryPairHandler` / `categoryTimeRecordsPairHandler` を直接束ねる、INV-RUN-02 `AR-STRUCT-QUERY-PATTERN` 準拠)。`PairedInput` で 1 回の `useQueryWithHandler` 呼び出しで current + comparison を並列取得 → `projectXxxDailySeries` で 2 series に分岐 → `StoreDailyBundle` / `CategoryDailyBundle` に組み立て。Step C の `useTimeSlotBundle` と同形 (exhaustive switch による mappingKind 決定含む)。`useUnifiedWidgetContext` に `ctx.storeDailyLane` / `ctx.categoryDailyLane` を配布、`WidgetContext` 型に 2 lane 追加、AR-003 fieldMax baseline **49 → 51** に ratchet-up (設計書 §6 で承認済み)。widget 側は touch せず Phase 6.5-5 に残す (commit `28303f6`)
- **Phase 6.5-5a 完了 (SalesPurchaseComparisonChart 載せ替え)** `SalesPurchaseComparisonChart.tsx` に `storeDailySeries?: StoreDailySeries | null` prop を追加、`laneDailyByStore` useMemo で `(storeId → (day → {sales, purchaseCost}))` の lookup を構築し、chart 列の sales/purchase 抽出を lane 経由に切替。`registryChartWidgets.tsx` が `ctx.storeDailyLane?.bundle.currentSeries ?? null` を prop として注入。`storeDailyLaneSurfaceGuard` baseline **2 → 1** に縮退 (残 1 は `computeEstimatedInventory(s.result.daily, ...)` で、`StoreDailySeries` に含まれない markup / discount rate + 仕入内訳を必要とする domain 計算のため **intentional な permanent floor**、Step B scope 外)。widget 側で series の並び替え / totals 再計算 / comparison 独自実装は行わず、projection の意味を 6.5-2 の凍結通りそのまま消費 (commit `fbcc023`)
- **Phase 6.5-5b 完了 (YoYWaterfallChart 載せ替え)** Phase 6.5-5b-0 impact scope 調査を先行し、Shapley 5-factor decomposition が `dept|line|klass` leaf-grain key を必要とすることを確定。`buildCategoryData` (dept-only waterfall) / `aggregateTotalQuantity` / 未使用 dummy 引数を `CategoryDailySeries` 経由に切替。`categoryDailyLaneSurfaceGuard` baseline **13 → 6** (vm=0 / logic=0 / data=3 / builders=3)。残 6 は **intentional permanent floor** — `decompose5(..., recordsToCategoryQtyAmt(periodCTS), recordsToCategoryQtyAmt(periodPrevCTS))` と `decomposePriceMix(periodCTS, periodPrevCTS)` が leaf-grain 必須。テスト fixture (`YoYWaterfallChart.{data,logic,vm}.test.ts` / `waterfallBuildersBatch.test.ts` / `waterfallDataIntegrity.test.ts`) を新 signature に追従 (57 tests PASS)。Phase 7 以降で `CategoryLeafDailySeries` 等の leaf-grain contract を別 phase として起こす判断は保留 (inventory/05 に記録) (commit `2ca6394`)
- **Phase 6.5-6 完了 (クローズ + ドキュメント最終化)** `inventory/05-phase6-widget-consumers.md` に HIGH リスク 2 件 (`SalesPurchaseComparisonChart` / `YoYWaterfallChart`) を `Done: <commit>` マーカー付きで記録、permanent floor を 2 系統で明文化 (store lane 1 件 = inventory 計算 / category lane 6 件 = Shapley leaf-grain)。`HANDOFF.md` の高優先セクションから stale な Step B 進行中記述と stale な AR-003 fieldMax ratchet-up 準備を除去し、Phase 6 全景ブロックを最新の全完了状態に書き換え。`checklist.md` で Phase 6.5-6 を `[x]` に。実装コードには一切触れず、文書一貫性のみを修正。Phase 6 全体が閉じた状態で後任者に渡せるようになった (本 commit)

> **Phase 1 完了範囲の明示**: `useUnifiedWidgetContext` が
> `buildFreePeriodFrame` + `useFreePeriodAnalysisBundle` 経由で frame と
> bundle を構築し `ctx.freePeriodLane` に公開する **配線** までが完了範囲。
> `useComparisonSlice` は API 境界として frame を primary 入力に変えたが、
> 内部はまだ `useComparisonModule(periodSelection, ...)` をそのまま呼んで
> おり、`ComparisonScope` の直接受領化は **未完 (Phase 6 管轄)**。
>
> **Phase 2 完了範囲の明示**: `inventory/01` の 4 箇所すべてを domain resolver
> (`domain/models/comparisonRangeResolver.ts`) 経由に置換。provenance は
> `mode / mappingKind / dowOffset / fallbackApplied` の 4 項目を locked。
> presentation 層での `year - 1` / `new Date(year-1, ...)` / `subYears` 等の
> 独自計算は `presentationComparisonMathGuard` で機械的に禁止され、admin UI
> (`PrevYearMappingTab`) の 2 件のみ allowlist 化されている。
>
> **Phase 2b**: 比較出力を単一契約 `ComparisonResolvedRange` に束ねた。
> widget は `alignmentMap` / `effectivePeriod2` を直接触らず、`comparison.
> provenance` 1 オブジェクトから `mode / mappingKind / dowOffset /
> fallbackApplied / sourceDate? / comparisonRange?` を取得する。Phase 3+ で
> alignmentMap 直接アクセス禁止ガードを載せる土台が整った。
>
> **Phase 3 完了範囲の明示**: 自由期間データレーンの canonical 経路
> (`buildFreePeriodFrame → freePeriodHandler → queryFreePeriodDaily →
> buildFreePeriodReadModel → computeFreePeriodSummary`) を
> `free-period-analysis-definition.md` §唯一経路ルール と
> `runtime-data-path.md` §自由期間ファクト に明文化。新ガード
> `freePeriodHandlerOnlyGuard` が `queryFreePeriodDaily` の caller を
> `freePeriodHandler.ts` のみに制限し、`FreePeriodDailyRow` の presentation
> 直接 import も禁止（raw rows 漏出防止）。両制約とも ratchet-down で凍結。
> 実装コード移行は不要（inventory/02 の該当 0 件）。
>
> **Phase 4 完了範囲の明示**: `freePeriodDeptKPI.ts` SQL の加重平均 rate 計算
> 4 箇所 (`SUM(rate × sales) / NULLIF(SUM(sales), 0)`) を pure builder 側に
> 剥離。SQL は `SUM(rate × sales) AS "*RateWeighted"` として **加重和のみ** を
> 返し、`readFreePeriodDeptKPI.ts` の `weightedAverageRate()` pure helper が
> `weightedSum / salesActual` で率に復元する。Zod 契約 `FreePeriodDeptKPIRow`
> の公開型は不変（`gpRateBudget / gpRateActual / markupRate / discountRate` の
> 型・意味はそのまま）。新ガード `noRateInFreePeriodSqlGuard` が freePeriod\*
> infra query に対する NULLIF 除算 / CASE WHEN 分岐除算 / `AS "*Rate"` alias
> を機械的禁止。`data-pipeline-integrity.md` の「額で持ち回し、率は使用直前
> に domain 側で算出」原則を遵守。

> **Phase 5 見本実装 完了範囲の明示**: `YoYChart.tsx` の scope 内部
> アクセス 3 件 (`scope?.effectivePeriod1 / effectivePeriod2 / alignmentMode`)
> を `application/hooks/plans/buildYoyDailyInput.ts` pure builder に集約し、
> widget を「存在判定 + builder pass-through」のみに薄化した。
> `comparisonResolvedRangeSurfaceGuard` の allowlist を 1 → 0 に縮退、以後
> 0 固定。Phase 5 の残 3 chart / ViewModel は同じパターン（下記テンプレ）で
> 横展開。

### Chart Input Builder Pattern（Phase 5 正式ルール）

Phase 5 で確立した chart 薄化パターンは
`references/03-guides/chart-input-builder-pattern.md` に正式ルールとして
文書化された。新規 chart を作るとき、および既存 chart を薄化するときは
必ず本ルールに従う。

- **設計ルール**: `references/03-guides/chart-input-builder-pattern.md`
- **見本実装**: `YoYChart.tsx` + `application/hooks/plans/buildYoyDailyInput.ts`
- **強制 guard**: `chartInputBuilderGuard.test.ts` — `presentation/components/charts/`
  配下での `dateRangeToKeys` 直接呼び出しを禁止、baseline 8 件 ratchet-down
- **補完 guard**: `comparisonResolvedRangeSurfaceGuard` (scope 内部参照禁止、baseline 0)

### 5 ステップ移行手順（見本実装から抽出）

1. **scope 内部アクセスを洗い出す** — `scope?.effectivePeriod1 /
   effectivePeriod2 / alignmentMode / alignmentMap / ...` を grep で探す
2. **pure builder を application 層に作る** — `application/hooks/plans/build<Name>Input.ts`
   形式。入力は (scope, prevYearScope, storeIds, ...)、出力は plan hook の
   input 型。React hooks 非依存、pure function、単体テスト付き
3. **widget は builder を呼ぶだけにする** — useMemo で builder を呼び、
   結果を plan hook に渡す。scope.X を直接読まない。`dateRangeToKeys` も
   chart 内で呼ばない
4. **存在判定は scope の null チェックに限定する** — empty state 判定など、
   scope 全体が存在するかどうかだけを見る
5. **guard を更新する** — `chartInputBuilderGuard` の ALLOWLIST から対象
   chart を削除し baseline を下げる。`comparisonResolvedRangeSurfaceGuard`
   の allowlist に古い widget が載っていれば削除

### 高優先（次に着手するもの）

- **Phase 6 全体クローズ済み (2026-04-15)**: Phase 6 (Step A/C/D) は PR #1039、Phase 6.5 Step B は PR #1040 で全 phase 完了。残タスクは **Phase 6 optional のみ**
- **Phase 6 optional**: `useComparisonModule` の periodSelection 依存 (kpi projection / dowGap 内部) をさらに削減する refactor。`externalScope` が必ず渡される前提になったため、periodSelection も `{ period1Year, period1Month }` 等の minimal struct に縮退可能

> **Phase 6 全景 (2026-04-15 時点、Phase 6.5-6 クローズ後)**:
>
> - ✅ Phase 6b: legacy caller baseline 2 → 0 (PR #1039)
> - ✅ Phase 6 Step A: summary swap + regression freeze guard (PR #1039)
> - ✅ **Phase 6.5 / Step B**: sibling lane 2 本 (`storeDailyLane` / `categoryDailyLane`) を導入、対象 widget を載せ替え完了 (PR #1040)
>   - Phase 6.5-1 型契約 + pre-work guard
>   - Phase 6.5-2 projection + 33 件 truth-table parity
>   - Phase 6.5-4 bundle + ctx 配布 (AR-003 fieldMax 49 → 51)
>   - Phase 6.5-5a SalesPurchaseComparisonChart 載せ替え (baseline 2 → 1)
>   - Phase 6.5-5b YoYWaterfall ecosystem 載せ替え (baseline 13 → 6)
>   - Phase 6.5-6 クローズ + ドキュメント最終化 (本 commit)
> - ✅ Phase 6 Step C: 時間帯比較 sibling lane 化 (`timeSlotLane`)、raw row baseline 1 → 0 (PR #1039)
> - ✅ Phase 6 Step D: 天気 correlation projection 正本化、guard baseline 0 (PR #1039)
>
> **Permanent floor (intentional な 2 系統)**:
> - `storeDailyLaneSurfaceGuard` baseline **1** — `computeEstimatedInventory(s.result.daily, ...)` は markup / discount rate + 仕入内訳を必要とし、`StoreDailySeries` の最小面で代替不能
> - `categoryDailyLaneSurfaceGuard` baseline **6** (data=3 / builders=3) — Shapley 5-factor decomposition (`decompose5` / `decomposePriceMix`) は `dept|line|klass` leaf-grain key を必要とし、dept-only の `CategoryDailySeries` で代替不能
>
> 両 permanent floor は Step B の最小契約を守るための意図的な trade-off。Phase 7 以降で `CategoryLeafDailySeries` や inventory projection の追加を別 phase として起こす判断は保留 (`inventory/05` §4 に記録)。

### 中優先

- (該当なし — Phase 6.5-4 で AR-003 fieldMax 49 → 51 ratchet-up は実施済み)

### 低優先

- Phase 5 以降: ViewModel / chart の薄化と画面段階載せ替え。

## 3. ハマりポイント

### 3.1. UI 先行移行の誘惑

自由期間 picker を先に作って固定期間画面を後で統合したくなるが、
比較意味論と取得経路が固まる前に UI を触ると、比較先解決や集約ロジックが
presentation 層に漏れて後から剥がせなくなる。**Phase 1→2→3 の順を崩さない**。

### 3.2. StoreResult との強制統合

`StoreResult`（単月確定値）と `FreePeriodReadModel`（自由期間分析）は
意味論が別系統（business-authoritative vs analytic-authoritative）。
統合を試みると正本化体系が崩れる。**UI 統合だけを目標とする**。

### 3.3. SQL 内 rate 計算

自由期間集計で rate を SQL 側で計算すると短期的には楽だが、
`data-pipeline-integrity.md` の「額で持ち回し、率は使用直前に
domain/calculations で算出」原則に反する。Phase 4 で必ず剥がす。

### 3.4. 比較先日付の散在

既存コードでは比較先日付（前年同日・前期・同曜日など）を
chart / VM / hook / component の複数箇所で独自計算している可能性が高い。
Phase 0 の棚卸しで場所と件数を固定してから Phase 2 に進む。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project の why / scope / read order |
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | 完了判定の入力 (機械判定用 required set) |
| `pr-breakdown.md` | PR 1〜5 の作業単位書 |
| `review-checklist.md` | A〜J カテゴリ別の総括レビュー観点 |
| `acceptance-suite.md` | Critical Path Acceptance Suite の設計 |
| `test-plan.md` | AAG 連結前提の最終形テスト計画（G0〜G6 + L0〜L4） |
| `references/01-principles/free-period-analysis-definition.md` | 自由期間分析の正本定義 |
| `references/01-principles/data-pipeline-integrity.md` | 額 / 率の分離原則 |
| `references/01-principles/critical-path-safety-map.md` | Safety Tier 分類 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane |
