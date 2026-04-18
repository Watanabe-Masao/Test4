# checklist — calendar-modal-route-unification

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase A: paired handler 統一

* [x] `useDayDetailPlan` 内の `categoryTimeRecordsHandler` 直接呼び出し箇所を棚卸しし、件数を `HANDOFF.md` に記録する
* [ ] 棚卸しした全箇所を `categoryTimeRecordsPairHandler` 経由に置換する
* [ ] モーダル表示の回帰テスト（当年・前年・前年比較）を実行し、表示崩れがないことを確認する
* [ ] handler 統一後も `selectCtsWithFallback` への依存が残っていないかを grep で確認し、依存先一覧を `HANDOFF.md` に記録する

## Phase B: 数量・時間帯の bundle 経由化

* [ ] モーダル内の数量合算箇所を `categoryDailyLane.bundle.currentSeries.grandTotals.salesQty` 経由に切り替える
* [ ] モーダル内の時間帯データ取得箇所を `timeSlotLane.bundle` 経由に切り替える
* [ ] ダッシュボードとモーダルの数量・時間帯表示が一致することを手動または E2E で検証する
* [ ] `selectCtsWithFallback` の独自フォールバック機構を削除する（依存先 0 件確認後）
* [ ] モーダル内の raw CTS 直接参照が leaf-grain 用途以外に残っていないことを grep で確認する

## Phase C: 撤退判定とガード固定

* [ ] `categoryDailyLaneSurfaceGuard` の baseline が 0 に到達していることを確認する
* [ ] 旧 `categoryTimeRecordsHandler` 単独経路の consumer が 0 件であることをガードテストで保証する
* [ ] モーダル read path の統一を保証する新規ガードテストを追加する（presentation 層から `categoryTimeRecordsHandler` の直接 import 禁止 等）
* [ ] 旧経路コードの物理削除を実施する（dead code 除去）

## Phase D: ドキュメント更新

* [ ] `references/03-guides/runtime-data-path.md` のモーダル経路の記述を統一後の状態に更新する
* [ ] `references/01-principles/data-pipeline-integrity.md` の関連箇所を更新する
* [ ] `cd app && npm run docs:generate` を実行し generated section を最新化する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
