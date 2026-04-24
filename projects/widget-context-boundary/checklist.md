# checklist — widget-context-boundary（SP-A）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。

## Phase 1: ADR-A-001 — UnifiedWidgetContext page-local 5 field 剥離（BC-1）

* [ ] PR1: `unifiedWidgetContextNoPageLocalOptionalGuard` baseline=5 で追加
* [ ] PR2: InsightWidgetContext / CostDetailWidgetContext / CategoryWidgetContext 新設
* [ ] PR3a: INSIGHT 6 widget を page-specific ctx に切替
* [ ] PR3b: COST_DETAIL 4 widget を page-specific ctx に切替
* [ ] PR3c: CATEGORY 2 widget を page-specific ctx に切替
* [ ] PR4: UnifiedWidgetContext から page-local 5 field 削除、guard baseline=0
* [ ] LEG-001 / LEG-002 / LEG-003 の sunsetCondition 達成確認
* [ ] 45 widget の lastVerifiedCommit を PR ごとに更新（該当 widget のみ）

## Phase 2: ADR-A-002 — Dashboard 固有 20 field 集約（BC-2）

* [ ] PR1: DashboardWidgetContext 新設、既存 WidgetContext alias 残置
* [ ] PR2: `unifiedWidgetContextNoDashboardSpecificGuard` baseline=20 で追加
* [ ] PR3a: WIDGETS_KPI + WIDGETS_CHART の 7 widget を DashboardWidgetContext に接続
* [ ] PR3b: WIDGETS_EXEC 7 widget を接続
* [ ] PR3c: WIDGETS_ANALYSIS 10 widget を接続
* [ ] PR3d: WIDGETS_DUCKDB 5 widget を接続
* [ ] PR4: UnifiedWidgetContext から Dashboard 固有 20 field 削除、guard baseline=0、legacy WidgetContext alias 削除
* [ ] LEG-004 の sunsetCondition 達成確認

## Phase 3: ADR-A-003 — WidgetDef 2 型分離（BC-3）

* [ ] PR1: `sameInterfaceNameGuard` baseline=1（WidgetDef 例外）で追加
* [ ] PR2: DashboardWidgetDef / UnifiedWidgetDef 新設、両 file で WidgetDef alias
* [ ] PR3: 全 45 registry entry を新名に切替
* [ ] PR4: 旧 WidgetDef alias 削除、guard baseline=0
* [ ] LEG-005 / LEG-006 の sunsetCondition 達成確認

## Phase 4: ADR-A-004 — StoreResult / PrevYearData discriminated union 化（BC-4）

* [ ] ADR-A-001 / A-002 / A-003 の PR4 完了を確認
* [ ] PR1: `coreRequiredFieldNullCheckGuard` baseline=2（WID-031, WID-033）で追加
* [ ] PR2: StoreResult / PrevYearData の discriminated union 型を並行導入
* [ ] PR3: 全 consumer（widget + hook + readModel）を新型に移行
* [ ] PR4: 旧 shape 削除、guard baseline=0
* [ ] LEG-007 / LEG-008 の sunsetCondition 達成確認

## Phase 5: sub-project completion

* [ ] 4 ADR 全ての 4 step を完遂した
* [ ] LEG-001〜LEG-008 の consumerMigrationStatus が全て migrated に到達した
* [ ] 4 guard の baseline が 0 に到達した
* [ ] 45 widget の lastVerifiedCommit が全て本 project 完了時の commit に同期した
* [ ] visual / E2E 回帰テストで 45 widget 全ての runtime 動作を確認した
* [ ] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した
* [ ] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

* [ ] 全 Phase の成果物を人間がレビューし、archive プロセスへの移行を承認する（これが [x] になると後続の SP-B が unlock される）
