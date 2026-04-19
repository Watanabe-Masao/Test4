# checklist — day-detail-modal-prev-year-investigation

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: runtime 観測で原因層を絞る (10 分目安)

* [ ] React DevTools で `dayLeafBundle.currentSeries.entries` の長さと `entries[0]` を確認する
* [ ] DuckDB console で `category_time_sales` の prev/cur 件数を確認する (SQL direct)
* [ ] DuckDB console で `time_slots` の prev/cur 件数を確認する
* [ ] `dayLeafBundle.meta.provenance.usedComparisonFallback` の値を確認する
* [ ] 候補 A (query 0 行) / B (time_slots JOIN 空) / C (ingest 集計) のいずれかに確定する

## Phase 2: 原因の精密特定

* [ ] Phase 1 で絞った候補に対して、問題のコード or データ or 設定を 1-3 箇所に特定する
* [ ] 特定箇所を HANDOFF.md に記録する

## Phase 3: fix 方針の決定 + 引き渡し

* [ ] fix 規模を判定する (軽微 / 複数層 / データ再整備)
* [ ] 引き渡し先を決定する (`quick-fixes` / 新 fix project / `references/03-guides/` 運用手順)
* [ ] 引き渡し先に task を追加し reference を HANDOFF.md に記録する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (原因層の確定 + 引き渡し先の task) を人間がレビューし、archive プロセスへの移行を承認する
