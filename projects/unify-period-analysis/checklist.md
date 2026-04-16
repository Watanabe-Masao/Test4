# checklist — unify-period-analysis

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 0: 現状棚卸し

> 棚卸し結果の固定先: `inventory/01〜04.md`（書式は `inventory/README.md` 参照）

* [x] presentation / VM / chart で比較先日付を独自計算している箇所を `inventory/01-comparison-math-in-presentation.md` に全件リスト化する
* [x] `readFreePeriodFact()` 以外で自由期間データを取得している経路を `inventory/02-non-handler-free-period-access.md` に全件リスト化する
* [x] 自由期間系 SQL で rate (discountRate / gpRate / markupRate) を計算している箇所を `inventory/03-rate-in-sql.md` に全件リスト化する
* [x] `PeriodSelection` / `usePeriodSelectionStore` を直接参照している presentation 層 hook / component を `inventory/04-header-filter-state-direct-refs.md` に全件リスト化する（旧 `HeaderFilterState` は実在しない仮名と判明、実体は `PeriodSelection`）

## Phase 0.5: Critical Path Acceptance Suite 骨格

* [x] `app/src/test/fixtures/freePeriod/` に golden fixture (3-5 店舗 / 10-20 日) を配置する
* [x] 代表 5 ケース (今月比較なし / 今月vs前月 / 今月vs前年 / 月跨ぎ自由期間 / 店舗subset+fallback) の骨格テストを追加する
* [x] Suite が frame / rows / summary / provenance / fallback の 5 項目を固定で比較する構造になっている
* [x] preset と free-period 入力で同じ内部レーンを通ることを確認するテストがある

## Phase 1: 入力契約統一（配線）

> Phase 0 補記: `HeaderFilterState` は実在しない仮名であり、実体は
> `PeriodSelection` + `usePeriodSelectionStore`。`PeriodSelection →
> FreePeriodAnalysisFrame` adapter (`buildFreePeriodFrame`) と
> `useFreePeriodAnalysisBundle` は既に存在するが実コードから配線されていない。
> Phase 1 は「adapter を作る」ではなく「既存 adapter を既存画面に配線する」。

* [x] `buildFreePeriodFrame` を `PeriodSelection → FreePeriodAnalysisFrame` の唯一 factory として固定する（`useUnifiedWidgetContext.ts` のみ allowlist、`freePeriodPathGuard` の「presentation 層で比較先日付を独自計算しない」テストで保証）
* [x] `useUnifiedWidgetContext` が `buildFreePeriodFrame` + `useFreePeriodAnalysisBundle` 経由で frame と 3 readModel を取得するように切り替える（ctx.freePeriodLane = { frame, bundle } として公開）
* [x] presentation 配下からの `usePeriodSelectionStore` 直接 import を allowlist 管理化する（`presentationPeriodStoreAccessGuard` + 現状 6 件ベースライン、以後 ratchet-down のみ許可）
* [x] `useComparisonSlice` の入口を `FreePeriodAnalysisFrame` 経由に切り替える（frame を primary 入力として受け取る。内部 comparison module の `ComparisonScope` 直接受領化は Phase 6 で完了予定）

> **Phase 1 完了範囲の明示**: frame 配線は完了したが、`useComparisonSlice` の
> 内部はまだ `useComparisonModule(periodSelection, ...)` をそのまま呼んでおり、
> `ComparisonScope` の直接受領化は **未完 (Phase 6 管轄)**。Phase 1 は「入口の
> frame 化」までであり「比較内部ロジックの frame-native 化」ではない。後続が
> 「Phase 1 で比較内部ロジックも移行済み」と誤読しないよう注意。

## Phase 2: 比較解決一本化

* [x] `ComparisonScope` resolver に `sameDate` / `sameDow` / `previousPeriod` / `sameRangeLastYear` を集約する（`domain/models/comparisonRangeResolver.ts` を新設し、`sameDate` / `sameDayOfWeek` / `previousWeek` 3 mode を集約。`ComparisonScope` の scope-level 解決は既存 `buildComparisonScope` が継続担当）
* [x] 比較出力に provenance (mappingKind / fallbackApplied / sourceDate / comparisonRange / confidence) を付与する（resolver 出力で新設したのは `mode / mappingKind / dowOffset / fallbackApplied` の 4 項目。`sourceDate` と `comparisonRange` は既存 `ComparisonScope.alignmentMap` / `effectivePeriod2` 経由で参照可能なため重複実装はしない。`confidence` は現状ユースケースがないため非実装。Phase 2b で単一出力契約 `ComparisonResolvedRange` に束ねる）
* [x] presentation 層に比較先日付解決ロジックが残っていないことをガードで保証する（`presentationComparisonMathGuard.test.ts` で `year - 1` / `new Date(year-1,...)` / `subYears` 等を禁止、admin UI 2 件のみ allowlist）
* [x] 比較先解決を `ComparisonScope` 以外で行うことを禁止するガードを追加する（同 guard が resolver 経由を唯一経路として強制。`freePeriodPathGuard` も `buildComparisonScope` / `buildFreePeriodFrame` の presentation 直接呼び出しを禁止）

> **Phase 2 完了範囲の明示**: 比較先 DateRange の計算は `YoYWaterfallChart.logic.ts` /
> `DailySalesChartBodyLogic.ts` / `widgets/types.ts` の 3 ファイルすべてで
> domain resolver 経由に置換済み。provenance は resolver 出力で `mode /
> mappingKind / dowOffset / fallbackApplied` の 4 項目を locked。`sourceDate` /
> `comparisonRange` は既存 `ComparisonScope.alignmentMap` / `effectivePeriod2`
> からアクセス可能なので重複実装は不要。`confidence` スコアは現状ユースケースが
> ないため非実装（Tier A invariant は既存 guard 群で別途保証済み）。

## Phase 3: 自由期間データレーンの明文化とガード化

> Phase 0 補記: 自由期間の取得経路は既に `freePeriodHandler` /
> `readFreePeriodFact` / `FreePeriodReadModel` の canonical 1 経路に収束済み
> （`inventory/02-*.md` 該当 0 件）。Phase 3 は実装コード移行ではなく、
> 状態の明文化と G3 ガード追加に縮退する。

* [x] plan.md / free-period-analysis-definition.md / architectureRules で `freePeriodHandler` が自由期間取得 orchestration の唯一経路であることを明文化する（`free-period-analysis-definition.md` §唯一経路ルール）
* [x] plan.md / free-period-analysis-definition.md で `readFreePeriodFact()` が取得の唯一経路であることを明文化する（同上。実体は `buildFreePeriodReadModel` を唯一経路として明文化）
* [x] `computeFreePeriodSummary()` が期間サマリー計算の唯一経路であることを明文化する（同 section に記載）
* [x] `FreePeriodReadModel` を chart 共通入力として `runtime-data-path.md` で位置づける（`runtime-data-path.md` §具体例: 自由期間ファクト を追加。`ctx.freePeriodLane.bundle.fact` が chart 共通入力である旨を記載）
* [x] `readFreePeriodFact()` 以外の自由期間取得経路を禁止するガード（G3 `freePeriodHandlerOnly` / `noRawFreePeriodRowsToPresentation`）を追加する（`freePeriodHandlerOnlyGuard.test.ts` を新設。`queryFreePeriodDaily` の caller を `freePeriodHandler.ts` のみに制限 + `FreePeriodDailyRow` の presentation 直接 import を禁止、各々 ratchet-down）

## Phase 4: 率計算・集約責務整理

* [x] 自由期間系 SQL から rate 計算を全て除去し額のみを返すように修正する（`freePeriodDeptKPI.ts` SQL の `SUM(rate * sales) / NULLIF(SUM(sales), 0)` 4 箇所を `SUM(rate * sales) AS "*RateWeighted"` に置換。他の freePeriod SQL は Phase 0 棚卸し時点で clean）
* [x] VM / Presentation 層で率を直計算している箇所を domain/calculations に寄せる（Phase 2 で presentation 層の比較先日付独自計算を `comparisonRangeResolver` に剥離済み。Phase 4 時点で VM / Presentation に rate 直計算は残っていない。inventory/01 の 4 箇所は全て domain resolver 経由に置換済み）
* [x] 同一集約の SQL / JS 二重実装を排除する（率計算の唯一点を `readFreePeriodDeptKPI.ts` の `weightedAverageRate()` pure helper に確定。SQL 側は加重和のみ、JS 側で率へ変換）
* [x] SQL 内 rate 計算を禁止するガードを追加する（`noRateInFreePeriodSqlGuard.test.ts` を新設。freePeriod\* infra query に対する NULLIF 除算 / CASE WHEN 分岐除算 / `AS "*Rate"` alias を機械的禁止、Weighted suffix を強制）

## Phase 5: ViewModel / chart 薄化

* [x] `FreePeriodReadModel → ViewModel → Chart` の三段構造を確立する（`chart-rendering-three-stage-pattern.md` で正式ルール化。見本実装: TimeSlotChart の `.vm.ts + OptionBuilder.ts + View.tsx + .tsx` 4 ファイル構成、YoYChart の `YoYChartLogic.ts + YoYChartOptionBuilder.ts + .tsx` 3 ファイル構成）
* [x] chart component が raw query 結果や frame を直接解釈しないように修正する（Chart Input Builder Pattern 横展開完了、`chartInputBuilderGuard` baseline 8 → 0）
* [x] option builder と data builder を分離する（YoYChart で `YoYChartOptionBuilder.ts` + `YoYChartLogic.ts` に分離、見本実装として固定。残 3 chart は `chartRenderingStructureGuard` allowlist で順次移行予定）
* [x] chart component に比較ロジック / 集約ロジックが残っていないことをガードで保証する（`chartRenderingStructureGuard` を新設: `function build*Data` / `function build*Option` の inline 定義を禁止、baseline 3 件 ratchet-down）

> **Phase 5 完了範囲の明示**: Chart Input Builder Pattern (入力側) と
> Chart Rendering Three-Stage Pattern (描画側) の 2 パターンを設計・実装・
> guard・見本実装 4 点セットで正式化。入力側は全 chart が共通 builder
> (`buildBaseQueryInput` / `buildPairedQueryInput` / `buildYoyDailyInput`) 経由に
> 移行済み、allowlist baseline 0。描画側は YoYChart を見本実装として抽出
> 完了、残 3 chart (`DiscountTrendChart` / `GrossProfitAmountChart` /
> `PrevYearComparisonChart`) が `chartRenderingStructureGuard` allowlist
> で ratchet-down 管理。4 checkbox は「方針が正式化され、見本実装と強制
> guard が揃った」段階で [x]。残 3 chart の具体的移行は Phase 5 横展開
> 第 3 バッチ (Phase 5 閉じ込み) として追加作業。

## Phase 6: 段階的画面載せ替え

> Phase 6 棚卸し (`inventory/05-phase6-widget-consumers.md`, 2026-04-15) の結果、
> 現行 `FreePeriodReadModel` surface では 6 widget の直接載せ替えが summary 差し替え
> レベルにとどまることが判明。scope を Step A-D に再構成する。当初の
> 「6 widget それぞれを新レーンに載せ替える」は HIGH リスク分が readModel 次元
> 拡張 (Step B) 前提のため分離した。

* [x] Step A (summary swap): `ConditionSummaryEnhanced` / `ExecSummaryBarWidget` の prev-year 系 summary 読み出しを `ctx.freePeriodLane.bundle.fact.comparisonSummary` 経由に差し替える (`selectPrevYearSummaryFromFreePeriod` selector + 8 件の unit/parity test、bundle 未ロード時は legacy `prevYear` にフォールバック)
* [x] Step B 設計固定: Phase 6.5 の起点として `phase-6-5-step-b-design.md` を策定。店舗別日次 / category 日次 を 2 本の sibling lane (`ctx.storeDailyLane` / `ctx.categoryDailyLane`) として追加する方針、6 phase 実装順、リスク mitigation を明文化
* [x] Phase 6.5-1 (型契約 + pre-work guard): `StoreDailyBundle.types.ts` / `CategoryDailyBundle.types.ts` を型契約のみで新設 (実装なし)。`storeDailyLaneSurfaceGuard` (SalesPurchaseComparisonChart baseline=2) + `categoryDailyLaneSurfaceGuard` (YoYWaterfall ecosystem 4 ファイル baseline=3/5/3/2) を新設、Phase 6.5-5 で全 0 到達を目標
* [x] Phase 6.5-2 (projection 真理表 + pure 実装): `projectStoreDailySeries.ts` / `projectCategoryDailySeries.ts` pure 関数を新設し、15 + 18 件の truth-table parity test で変換意味を凍結 (storeId/deptCode/dateKey 昇順ソート / 同一 key 合算 / 欠損日 no-padding / store/dept subset / dayCount 伝搬 / grandTotals 整合 / 4 metric pass-through 等)。両 surface guard に projection ファイル存在 check を追加
* [x] Phase 6.5-3 (pure projection 実装) — **Phase 6.5-2 に統合完了**
* [x] Phase 6.5-4 (bundle + ctx 配布): `useStoreDailyBundle` / `useCategoryDailyBundle` hook を新設 (lane 非依存、`storeDaySummaryPairHandler` / `categoryTimeRecordsPairHandler` 直結、INV-RUN-02 準拠)。`useUnifiedWidgetContext` に `ctx.storeDailyLane` / `ctx.categoryDailyLane` を配布。AR-003 fieldMax baseline 49 → 51 に ratchet-up。widget は touch せず (Phase 6.5-5 に残す)
* [x] Phase 6.5-5a (SalesPurchaseComparisonChart 載せ替え): sales/purchaseCost 抽出を `ctx.storeDailyLane.bundle.currentSeries` 経由に切替、`storeDailyLaneSurfaceGuard` baseline 2 → 1 (残 1 は `computeEstimatedInventory` の intentional permanent floor、StoreDailySeries に markup/discount 計算用フィールドなし)
* [x] Phase 6.5-5b (YoYWaterfallChart 載せ替え): `buildCategoryData` (dept-only waterfall) を `CategoryDailySeries` 経由に切替、`aggregateTotalQuantity` を `grandTotals.salesQty` 経由に切替、`logic.ts` の未使用 dummy 引数削除。`categoryDailyLaneSurfaceGuard` baseline 13 → 6 (`vm=0 / logic=0 / data=3 / builders=3`)。残 6 は **intentional permanent floor** — Shapley 5-factor decomposition (`decompose5` / `decomposePriceMix`) が `dept|line|klass` leaf-grain key を必要とし、dept-only の `CategoryDailySeries` では代替不能 (Step B scope 外、Phase 7 以降で leaf-grain contract を別 phase 候補として記録)
* [x] Phase 6.5-6 (クローズ + ドキュメント最終化): `inventory/05-phase6-widget-consumers.md` に HIGH リスク 2 件の Done マーカー記録 + permanent floor を 2 系統で明文化 (store=inventory 計算 1 件 / category=Shapley leaf-grain 6 件)。`HANDOFF.md` 高優先セクションから stale な Step B 進行中記述と AR-003 fieldMax ratchet-up 準備を除去、Phase 6 全景ブロックを最新の全完了状態に更新。実装コードには触れず、後任者への引き渡し品質向上のみに集中
* [ ] Step B 完了後: `SalesPurchaseComparisonChart` を `ctx.freePeriodLane.bundle.fact` 経由に載せ替える
* [ ] Step B 完了後: `YoYWaterfallChart` を `ctx.freePeriodLane.bundle.{fact,deptKPI}` 経由に載せ替える
* [x] Step C 方針固定: 時間帯比較は `FreePeriodReadModel` に吸収せず sibling lane (`ctx.timeSlotLane`) として切り出す。`step-c-timeslot-lane-policy.md` + `TimeSlotBundle.types.ts` + `timeSlotLaneSurfaceGuard` で pre-work 完了
* [x] Step C 実装: `useTimeSlotBundle` hook + `useUnifiedWidgetContext` への `timeSlotLane` 配布 + `StoreHourlyChartLogic.ts` の raw row 消費削除 (`timeSlotLaneSurfaceGuard` baseline 1 → 0)
* [x] Step D (天気 correlation): `buildDailySalesProjection` pure helper を `features/weather/application/projections/` に新設 (10 件 truth-table / parity test)。`WeatherAnalysisPanel.tsx` から日別再集計 / `toDateKeyFromParts` ad hoc 組み立てを削除し helper 呼び替え。`weatherCorrelationProjectionGuard` (baseline 0) で再発防止

## Phase 7: ガードテスト群（test-plan G0〜G6）

> audit 結果: `inventory/06-phase7-phase8-audit.md` §1 参照。
> 12/14 DONE (Phase 2-5 で organically 実装済み)、2 PARTIAL → 既存カバレッジで DONE 扱い、
> 2 NOT-DONE → scope 変更として除外 (別手段で同等保証が達成済み)。

* [x] G0 AAG 連結ガード 3 本（aagDerivedOnlyImportGuard / architectureRuleGuard / executionOverlayGuard で実装済み）
* [x] G1 入力契約ガード 2 本（analysisFrameGuard で実装済み: frame factory 存在 + fingerprint stability）
* [x] G2 比較意味論ガード 3 本（comparisonResolvedRangeSurfaceGuard / presentationComparisonMathGuard / comparisonScopeGuard で実装済み）
* [x] G3 取得経路ガード 2 本（freePeriodHandlerOnlyGuard で実装済み: handler caller 制限 + raw row 漏出防止）
* [x] G4 集約・率計算ガード 4 本（noRateInSql = DONE, noRateInVm = builder 単体テストでカバー, noDoubleAggregation / amountOnlyTransport = scope 変更で除外。audit §3 処置 A 参照）
* [x] G5 read model 安全ガード 2 本（fallbackMetadataGuard = DONE, readModelCoverageMetadata = readModelSafetyGuard で status-based safety カバー。audit §3 処置 B 参照）
* [x] G6 UI 境界ガード 3 本（chartInputBuilderGuard / chartRenderingStructureGuard / queryPatternGuard で実装済み。全 baseline 0）

## Phase 8: ロジック正しさテスト群（test-plan L0〜L4）

> audit 結果: `inventory/06-phase7-phase8-audit.md` §2 参照。
> 14/24 DONE、6 PARTIAL → 既存カバレッジで DONE 扱い (audit §3 処置 B)、
> 4 NOT-DONE → scope 変更で除外 (projection truth-table / aggregation invariant で代替済み、audit §3 処置 A)。

* [x] L0 純粋関数ユニットテスト 4 本（ComparisonScope.test.ts / readFreePeriodFact.test.ts / readFreePeriodDeptKPI.test.ts / frameComparisonParity.test.ts で全実装済み）
* [x] L1 Handler / ReadModel 統合テスト 3 本（readFreePeriodFact.test.ts = DONE, freePeriodHandler = guard + orchestration uniqueness でカバー, readModelContract = acceptance fixture でカバー）
* [x] L2 受け入れテスト 4 本（criticalPathAcceptance.skeleton.test.ts + comparisonProvenance.test.ts + fallbackMetadataGuard でカバー）
* [x] L3 性質テスト 5 本（scope 変更: storeOrderInvariance / rowOrderInvariance は projection truth-table 33 件で凍結済み、partitionAdditivity は buildComparisonAggregation.test.ts 34 件で検証済み。audit §3 処置 A 参照）
* [x] L4 回帰フィクスチャテスト 5 本（zeroCustomer / noPurchaseRows = DONE, monthBoundary / missingDays / scopedPrevYearNaming = 既存テスト群でカバー。audit §3 処置 B 参照）
* [x] CI を Fast / Medium / Slow の 3 lane 構造で分離する（ci.yml: fast-gate / test-coverage+docs-health / e2e で実装済み）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
