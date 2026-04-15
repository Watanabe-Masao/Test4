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
- **Phase 5 閉じ込み (描画側)** `ChartRenderModel<TPoint>` 共通契約を新設 (`chartRenderModel.ts` + 12 tests)、残 3 chart (`DiscountTrendChart` / `GrossProfitAmountChart` / `PrevYearComparisonChart`) を `*Logic.ts` に抽出し共通契約に揃えた。`chartRenderingStructureGuard` baseline 3 → 0（本 commit）**Phase 5 完全完了**

> **Phase 1 完了範囲の明示**: `useUnifiedWidgetContext` が
> `buildFreePeriodFrame` + `useFreePeriodAnalysisBundle` 経由で frame と
> bundle を構築し `ctx.freePeriodLane` に公開する **配線** までが完了範囲。
> `useComparisonSlice` は API 境界として frame を primary 入力に変えたが、
> 内部はまだ `useComparisonModule(periodSelection, ...)` をそのまま呼んで
> おり、`ComparisonScope` の直接受領化は **未完 (Phase 6 管轄)**。

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

> **Phase 3 完了範囲の明示**: 自由期間データレーンの canonical 経路
> (`buildFreePeriodFrame → freePeriodHandler → queryFreePeriodDaily →
> buildFreePeriodReadModel → computeFreePeriodSummary`) を
> `free-period-analysis-definition.md` §唯一経路ルール と
> `runtime-data-path.md` §自由期間ファクト に明文化。新ガード
> `freePeriodHandlerOnlyGuard` が `queryFreePeriodDaily` の caller を
> `freePeriodHandler.ts` のみに制限し、`FreePeriodDailyRow` の presentation
> 直接 import も禁止（raw rows 漏出防止）。両制約とも ratchet-down で凍結。
> 実装コード移行は不要（inventory/02 の該当 0 件）。

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

- **Phase 6**: 段階的画面載せ替え + `useComparisonModule` の `ComparisonScope` 直接受領化。Phase 5 が完全に閉じた (入力側 baseline 0 / 描画側 baseline 0 / `ChartRenderModel` 共通契約導入済み) ため、Phase 6 は入力 + 比較契約の変更軸だけに集中できる

### 中優先

- **Phase 6**: 段階的画面載せ替え + `useComparisonModule` の `ComparisonScope` 直接受領化

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
