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
* [x] `HeaderFilterState` を直接参照している hook / component を `inventory/04-header-filter-state-direct-refs.md` に全件リスト化する

## Phase 0.5: Critical Path Acceptance Suite 骨格

* [ ] `app/src/test/fixtures/freePeriod/` に golden fixture (3-5 店舗 / 10-20 日) を配置する
* [ ] 代表 5 ケース (今月比較なし / 今月vs前月 / 今月vs前年 / 月跨ぎ自由期間 / 店舗subset+fallback) の骨格テストを追加する
* [ ] Suite が frame / rows / summary / provenance / fallback の 5 項目を固定で比較する構造になっている
* [ ] preset と free-period 入力で同じ内部レーンを通ることを確認するテストがある

## Phase 1: 入力契約統一

* [ ] `HeaderFilterState → FreePeriodAnalysisFrame` adapter を 1 箇所に実装する
* [ ] 既存固定期間画面が adapter 経由で frame を構築するように切り替える
* [ ] 画面内部 hook が `HeaderFilterState` を直接参照していないことをガードで保証する
* [ ] 比較系 hook の入口を frame ベースに統一する

## Phase 2: 比較解決一本化

* [ ] `ComparisonScope` resolver に `sameDate` / `sameDow` / `previousPeriod` / `sameRangeLastYear` を集約する
* [ ] 比較出力に provenance (mappingKind / fallbackApplied / sourceDate / comparisonRange / confidence) を付与する
* [ ] presentation 層に比較先日付解決ロジックが残っていないことをガードで保証する
* [ ] 比較先解決を `ComparisonScope` 以外で行うことを禁止するガードを追加する

## Phase 3: 自由期間データレーン完成

* [ ] `freePeriodHandler` を自由期間取得 orchestration の唯一経路として固定する
* [ ] `readFreePeriodFact()` を自由期間取得の唯一経路として固定する
* [ ] `computeFreePeriodSummary()` を期間サマリー計算の唯一経路として固定する
* [ ] `FreePeriodReadModel` を chart 共通入力として位置づける
* [ ] `readFreePeriodFact()` 以外の自由期間取得経路を禁止するガードを追加する

## Phase 4: 率計算・集約責務整理

* [ ] 自由期間系 SQL から rate 計算を全て除去し額のみを返すように修正する
* [ ] VM / Presentation 層で率を直計算している箇所を domain/calculations に寄せる
* [ ] 同一集約の SQL / JS 二重実装を排除する
* [ ] SQL 内 rate 計算を禁止するガードを追加する

## Phase 5: ViewModel / chart 薄化

* [ ] `FreePeriodReadModel → ViewModel → Chart` の三段構造を確立する
* [ ] chart component が raw query 結果や frame を直接解釈しないように修正する
* [ ] option builder と data builder を分離する
* [ ] chart component に比較ロジック / 集約ロジックが残っていないことをガードで保証する

## Phase 6: 段階的画面載せ替え

* [ ] 比較ヘッダ周辺を新レーンに載せ替える
* [ ] 期間サマリー系を新レーンに載せ替える
* [ ] 売上比較 chart を新レーンに載せ替える
* [ ] 時間帯比較を新レーンに載せ替える
* [ ] 仕入 / 原価比較を新レーンに載せ替える
* [ ] 天気連動比較を新レーンに載せ替える

## Phase 7: ガードテスト群（test-plan G0〜G6）

* [ ] G0 AAG 連結ガード 3 本（aagFacadeSurface / aagRuleIdReference / aagCriticalPathBinding）を追加する
* [ ] G1 入力契約ガード 2 本（freePeriodPresetFrame / freePeriodAnalysisFramePath）を追加する
* [ ] G2 比較意味論ガード 3 本（comparisonProvenance / noComparisonMathInPresentation / noUnscopedComparisonVariable）を追加する
* [ ] G3 取得経路ガード 2 本（freePeriodHandlerOnly / noRawFreePeriodRowsToPresentation）を追加する
* [ ] G4 集約・率計算ガード 4 本（noRateInSql / noRateInVm / noDoubleAggregation / amountOnlyTransport）を追加する
* [ ] G5 read model 安全ガード 2 本（freePeriodFallbackVisible / readModelCoverageMetadata）を追加する
* [ ] G6 UI 境界ガード 3 本（noRawRowsToChart / chartNoAcquisitionLogic / useQueryWithHandlerPath）を追加する

## Phase 8: ロジック正しさテスト群（test-plan L0〜L4）

* [ ] L0 純粋関数ユニットテスト 4 本（buildFreePeriodPresetToFrame / buildComparisonScope / computeFreePeriodSummary / rateCalculators）を追加する
* [ ] L1 Handler / ReadModel 統合テスト 3 本（readFreePeriodFact / freePeriodHandler / freePeriodReadModelContract）を追加する
* [ ] L2 受け入れテスト 4 本（fixedPresetParity / fixedPresetWithComparisonParity / comparisonProvenance / fallbackVisible）を追加する
* [ ] L3 性質テスト 5 本（storeOrderInvariance / rowOrderInvariance / partitionAdditivity / presetVsManualRange / amountOnlyTransport）を追加する
* [ ] L4 回帰フィクスチャテスト 5 本（monthBoundary / missingDays / zeroCustomer / noPurchaseRows / scopedPrevYearNaming）を追加する
* [ ] CI を Fast / Medium / Slow の 3 lane 構造で分離する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
