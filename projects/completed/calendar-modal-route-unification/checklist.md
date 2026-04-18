# checklist — calendar-modal-route-unification

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase A: paired handler 統一

* [x] `useDayDetailPlan` 内の `categoryTimeRecordsHandler` 直接呼び出し箇所を棚卸しし、件数を `HANDOFF.md` に記録する
* [x] 棚卸しした全箇所を `categoryTimeRecordsPairHandler` 経由に置換する
* [x] モーダル表示の回帰テスト（当年・前年・前年比較）を実行し、表示崩れがないことを確認する
* [x] handler 統一後も `selectCtsWithFallback` への依存が残っていないかを grep で確認し、依存先一覧を `HANDOFF.md` に記録する

## 後継 project への移管

> Phase B 棚卸しで `timeSlotLane.bundle` が HourlyChart の要件
> （quantity フィールド・wow alignment）を満たさないことが判明したため、
> Phase B/C/D を本 project では実施せず、契約拡張から始める後継 project に
> 全面移管する。詳細は `plan.md` §B-3 採用 / `HANDOFF.md` §1 参照。

* [x] Phase B/C/D の移管先 project（`calendar-modal-bundle-migration`）を起票し、本 project の HANDOFF からリンクする

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
