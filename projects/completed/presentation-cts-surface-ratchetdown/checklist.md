# checklist — presentation-cts-surface-ratchetdown

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: guard 新設

* [x] `categoryLeafDailyLaneSurfaceGuard.test.ts` を新設する
* [x] 初期 baseline を現状値（test 除外後の production 件数）で固定する
* [x] guard が CI で PASS することを確認する

## Phase 2: widget 系の置換

* [x] DrilldownWaterfall 周辺（builders / logic / utils 含む）の `CategoryTimeSalesRecord` 直接 import を `CategoryLeafDailyEntry` に置換する
* [x] CategoryDrilldown 周辺の同 import を置換する（useDrilldown 系 hook 4 件で完了）
* [x] HourlyChart 周辺（builders / logic）の同 import を置換する
* [x] DayDetailSalesTab / DayDetailHourlyTab の同 import を置換する
* [x] baseline を Phase 2 後の件数に ratchet-down する（23 → 17 → 12 → 8）

## Phase 3: YoYWaterfall + 階層フィルタ

* [x] YoYWaterfallChart 周辺の同 import を置換する
* [x] categoryHierarchyHooks / periodFilterHooks / useHierarchyDropdown の同 import を置換する
* [x] baseline を Phase 3 後の件数に ratchet-down する（8 → 3）

## Phase 4: context / widget 基盤 + Admin

* [x] `useUnifiedWidgetContext` / `presentation/components/widgets/types.ts` の同 import を置換する（JSDoc コメントの literal 言及を reword）
* [x] `presentation/pages/Admin/RawDataTabBuilders.ts` の同 import を置換する
* [x] baseline を Phase 4 後の件数に ratchet-down する（3 → 0）

## Phase 5: 残りとガード永続化

* [x] 残 presentation ファイルの同 import を置換する（Phase 4 で吸収完了）
* [x] baseline を 0 に到達させる
* [x] guard を「追加禁止」固定モードに移行する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
