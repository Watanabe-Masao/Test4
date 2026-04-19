# checklist — day-detail-modal-prev-year-investigation

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 0: 静的解析で候補の構造シグナルを確認 (完了)

* [x] 3 候補のコードパスを読み、observable 値と候補のマッピングを裏付け (HANDOFF.md §1.1)
* [x] 仮説ランキング: B (最有力) / A (次点) / C (低) を HANDOFF.md に記録
* [x] 既知 fix (`useDuckDB.ts` L216-235) の存在と発火条件を確認

## Phase 1: runtime 観測で原因層を絞る (10 分目安)

* [ ] React DevTools で `dayLeafBundle.currentSeries.entries` の長さと `entries[0]` を確認する
* [ ] DuckDB console で `category_time_sales` の prev/cur 件数を確認する (SQL direct)
* [ ] DuckDB console で `time_slots` の prev/cur 件数を確認する
* [ ] `dayLeafBundle.meta.provenance.usedComparisonFallback` の値を確認する
* [ ] 候補 A (query 0 行) / B (time_slots JOIN 空) / C (ingest 集計) のいずれかに確定する
* [ ] (B 候補確定時) `dataStore.appData.prevYear.categoryTimeSales.records[0].timeSlots.length` を確認し、ingest 時点か INSERT 時点かを切り分ける

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
