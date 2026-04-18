# checklist — calendar-modal-bundle-migration

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: timeSlotLane 契約拡張

* [ ] `timeSlotLane.bundle` を消費している既存 consumer を grep で全て特定し、件数を `HANDOFF.md` に記録する
* [ ] `TimeSlotStoreEntry.byHour` を金額のみから「金額 + 点数」に拡張する設計を確定し、`HANDOFF.md` に記録する
* [ ] wow alignment の解決位置（ComparisonScope 拡張 / timeSlotLane 内部）の設計を確定し、`HANDOFF.md` に記録する
* [ ] 拡張後の契約型 (`TimeSlotBundle.types.ts`) を更新する
* [ ] hook 実装 (`useTimeSlotBundle.ts`) と projection (`projectTimeSlotSeries.ts`) を契約に合わせて更新する
* [ ] 既存 consumer（StoreHourlyChart 等）が回帰なく動くことをテスト + 手動で検証する

## Phase 2: HourlyChart 移行

* [ ] `HourlyChart.builders.ts::buildHourlyDataSets` の入力を `timeSlotLane.bundle` 形式に変更する
* [ ] `HourlyChart.tsx` の props を bundle 経由に変更する
* [ ] `useDayDetailPlan` から HourlyChart に渡す入力を bundle 経由に切り替える
* [ ] モーダルとダッシュボードの時間帯表示が一致することを手動または E2E で検証する
* [ ] HourlyChart 経由の `selectCtsWithFallback` 依存を削除する

## Phase 3: フォールバック撤廃と撤退判定

* [ ] `selectCtsWithFallback` の依存先が 0 件であることを grep で確認する
* [ ] `selectCtsWithFallback` および `selectCtsWithFallbackFromPair` を削除する
* [ ] `timeSlotLaneSurfaceGuard` の baseline が 0 に到達していることを確認する
* [ ] HourlyChart の raw CTS 直接 import を禁止するガードテストを追加する

## Phase 4: ドキュメント更新

* [ ] `references/03-guides/runtime-data-path.md` の HourlyChart 経路の記述を bundle 経由化後の状態に更新する
* [ ] `references/01-principles/data-pipeline-integrity.md` の関連箇所を更新する
* [ ] `cd app && npm run docs:generate` を実行し generated section を最新化する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
