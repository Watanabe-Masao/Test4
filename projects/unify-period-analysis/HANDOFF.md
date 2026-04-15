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
| 03 SQL 内 rate 計算 | Phase 4 | **4 箇所 / 1 ファイル** | `freePeriodDeptKPI.ts` が加重平均 rate を SQL で計算。他の freePeriod SQL は clean |
| 04 ヘッダ state 直接参照 | Phase 1 | **1 起点 + 実体確定** | `HeaderFilterState` は実在しない仮名。実体は `PeriodSelection` + `usePeriodSelectionStore`。`buildFreePeriodFrame` + `useFreePeriodAnalysisBundle` も既に存在するが実コードから呼ばれていない（配線が実作業） |

### plan.md / checklist.md への反映（commit `4212553` — 2026-04-14）

- `plan.md` Phase 0 に補記を追加（`HeaderFilterState` 仮名の実体が `PeriodSelection` である旨）
- `plan.md` Phase 1 を「adapter を 1 箇所に実装」から「既存 adapter (`buildFreePeriodFrame` + `useFreePeriodAnalysisBundle`) を `useUnifiedWidgetContext` に配線」に書き換え
- `plan.md` Phase 3 を「データレーン固定（実装コード移行）」から「明文化 + G3 ガード追加」に縮退
- `checklist.md` Phase 1 / Phase 3 を同方向に再記述

なお `pure-calculation-reorg` は `status: active` のまま並行運用扱い。
切り戻す場合は `CURRENT_PROJECT.md` の 1 行を書き換えるだけで戻せる。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 完了済み（Phase 0 / 0.5 / 1 / 2 / 3）

- **Phase 0** 棚卸し完了 (commit `023c7d7`)
- **Phase 0.5** Critical Path Acceptance Suite 骨格配置完了 (commit `157dc7a`)
- **Phase 1** frame 配線完了 (commit `5c32bd8`、PR #1038 で main へ merge 済み)
- **Phase 1** 暫定二重入口 parity test (commit `8428f74`)
- **Phase 2** 比較解決一本化完了 (commit `7c73e89`)
- **Phase 2b** 単一出力契約 `ComparisonResolvedRange` (commit `e9023ab`)
- **Phase 3** 自由期間データレーン明文化 + G3 ガード追加（本 commit）

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

### 高優先（次に着手するもの）

- **Phase 4**: `freePeriodDeptKPI.ts` L26-L40 の加重平均 rate 計算を domain/calculations に剥がす

### 中優先

- **Phase 5**: ViewModel / chart 薄化

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
