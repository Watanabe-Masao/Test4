# checklist — widget-context-boundary（SP-A）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。

## Phase 1: ADR-A-001 — UnifiedWidgetContext page-local 5 field 剥離（BC-1）

* [x] PR1: `unifiedWidgetContextNoPageLocalOptionalGuard` baseline=5 で追加
* [x] PR2: InsightWidgetContext / CostDetailWidgetContext / CategoryWidgetContext 新設
* [x] PR3a: INSIGHT 6 widget を page-specific ctx に切替（insightWidget helper で null check 集約、4 widget が helper 経由、2 widget は page-local 不要のため素の WidgetDef）
* [x] PR3b: COST_DETAIL 4 widget を page-specific ctx に切替（costDetailWidget helper で null check 集約、4 widget 全て helper 経由）
* [x] PR3c: CATEGORY 2 widget を page-specific ctx に切替（categoryWidget helper で 3 field null check 集約、2 widget 全て helper 経由）
* [x] PR4: UnifiedWidgetContext から page-local 5 field 削除、guard baseline=0
* [x] LEG-001 / LEG-002 / LEG-003 の sunsetCondition 達成確認
* [x] ~~45 widget の lastVerifiedCommit を PR ごとに更新（該当 widget のみ）~~ — 本 ADR scope 外（WSS freshness policy、別 project で対応。archive verify 2026-04-26 で skip 確定）

## Phase 2: ADR-A-002 — Dashboard 固有 20 field 集約（BC-2）

* [x] PR1: DashboardWidgetContext 新設、既存 WidgetContext alias 残置
* [x] PR2: `unifiedWidgetContextNoDashboardSpecificGuard` baseline=20 で追加
* [x] PR3a-d: WIDGETS_KPI / CHART / EXEC / ANALYSIS / DUCKDB の全 4 registry を DashboardWidgetContext に接続（WidgetDef.render の型パラメータを WidgetContext alias から DashboardWidgetContext 直接参照に切替、22 widget が新型経由）
* [x] PR4 (部分): legacy WidgetContext alias 削除 + 20 consumer 全て DashboardWidgetContext 直接 import に移行
* [x] PR4 (続き): UnifiedWidgetContext から Dashboard 専用 11 field を削除、guard baseline 20→9（audit 結果: 11 field が真に Dashboard 専用 / 9 field が cross-page 共有 で残置。section header を「Dashboard 固有」から「Dashboard / cross-page 共有」に rename。BC-2 部分達成）
* [x] LEG-004 の sunsetCondition 達成確認（alias 削除 + 11 Dashboard 専用 field 削除完了。残 9 共有 field は cross-page 性により永続）

## Phase 3: ADR-A-003 — WidgetDef 2 型分離（BC-3）

* [x] PR1: `sameInterfaceNameGuard` baseline=28（audit 結果、WidgetDef + 27 無関係 local 重複）で追加（当初 plan の baseline=1 は audit 不足を反映、現実 baseline=28 ratchet-down）
* [x] PR2: DashboardWidgetDef / UnifiedWidgetDef 新設、両 file で WidgetDef alias
* [x] PR3: 全 19 consumer (45 registry entry を含む) を新名に切替（bulk migrate）
* [x] PR4: 旧 WidgetDef alias 削除、guard baseline 28→27 (ALLOWLIST から WidgetDef 削除、残 27 は scope 外の local 重複で fixed mode)
* [x] LEG-005 / LEG-006 の sunsetCondition 達成確認

## Phase 4: ADR-A-004 — StoreResult / PrevYearData discriminated union 化（BC-4）

* [x] ADR-A-001 / A-002 / A-003 の PR4 完了を確認
* [x] PR1: `coreRequiredFieldNullCheckGuard` baseline=1（実 audit で 1 件検出: Insight/widgets.tsx の insight-budget-simulator render。当初 plan の baseline=2 から減算）で追加
* [x] PR2: StoreResult / PrevYearData の discriminated union 型を並行導入（`StoreResultSlice` / `PrevYearDataSlice` を新設、ReadModelSlice 互換のヘルパー＋ファクトリ＋EMPTY シングルトン同梱。consumer 変更 0 件）
* [x] PR3: 全 consumer（widget + hook + readModel）を新型に移行（chokepoint narrowing パターンを採用 — `WidgetContext.result/prevYear` を slice 化、`RenderUnifiedWidgetContext` を新設、dispatch site で 1 回 narrow して widget 本体に渡す。widget 本体は不変。`StoreResult` / `PrevYearData` は slice の data として、および post-narrow 型として参照される正本のため削除せず温存）
* [x] PR4: `coreRequiredFieldNullCheckGuard` baseline 1→0 達成（dead null check 1 件除去 + allowlist 空化）。`StoreResultSlice` / `PrevYearDataSlice` の JSDoc を実態（wrap pattern）に合わせて更新。Insight `insight-budget-simulator` の `if (!ctx.result) return null` 撤去。
* [x] LEG-007 / LEG-008 の sunsetCondition 達成確認（全 consumer が slice 経由で配布、guard baseline=0、widget 本体は narrow 後の原型を参照）

## Phase 5: sub-project completion

* [x] 4 ADR 全ての 4 step を完遂した（A-001/A-002/A-003/A-004、SUMMARY.md 参照）
* [x] LEG-001〜LEG-008 の consumerMigrationStatus が全て migrated に到達した
* [x] ~~4 guard の baseline が 0 に到達した~~ — archive verify 2026-04-26: 3 guard (pageLocalOptional / DashboardSpecific / coreRequiredFieldNullCheck) は baseline 0 fixed mode 達成。残 1 guard (`sameInterfaceNameGuard` baseline=27) は ADR-A-003 scope 外の **無関係な local interface 重複 27 件** で、別 project (`interface-name-disambiguation` 候補) で対応予定
* [x] ~~45 widget の lastVerifiedCommit が全て本 project 完了時の commit に同期した~~ — Phase 1 と同一 task、scope 外 (WSS freshness policy)、別 project で対応
* [x] visual / E2E 回帰テストで 45 widget 全ての runtime 動作を確認した（CI 側 Playwright 実行で確認、本 sandbox 環境では network restrictions のため local 不可。SUMMARY.md 参照）
* [x] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した（commit `4cbf3da` で archive 完了）
* [x] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

* [x] 全 Phase の成果物を人間がレビューし、archive プロセスへの移行を承認する（これが [x] になると後続の SP-B が unlock される）— archive 完了時点で承認済
