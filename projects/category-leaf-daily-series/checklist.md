# checklist — category-leaf-daily-series

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: 契約設計

* [ ] 3 consumer（DrilldownWaterfall / CategoryDrilldown / HourlyChart.hourDetail）の leaf-grain 要件を棚卸しし、必要粒度（日次 / 時間帯 × 日次）を `HANDOFF.md` に記録する
* [ ] `CategoryLeafDailySeries`（または同等）の型契約を設計し、`CategoryLeafDailyBundle.types.ts` として固定する
* [ ] wow 経路の扱い（raw 継続 / bundle 対象外）を `plan.md` の不可侵原則に明文化する

## Phase 2: Infra + projection 実装

* [ ] SQL 射影（leaf-grain 集計クエリ）を infra に追加し Zod schema で固定する
* [ ] `projectCategoryLeafDailySeries` pure 関数と parity test（truth-table）を新設する
* [ ] `useCategoryLeafDailyBundle` hook を `useQueryWithHandler` 経由で実装する
* [ ] surface guard を新設し baseline（初期値）で登録する

## Phase 3: consumer 載せ替え

* [ ] `DrilldownWaterfall` の `decompose5` / `decomposePriceMix` 入力を leaf-grain 正本経由に切り替える
* [ ] `CategoryDrilldown` のカテゴリ階層を leaf-grain 正本経由に切り替える
* [ ] `HourlyChart.hourDetail` の選択時間帯カテゴリ別内訳を leaf-grain 正本経由に切り替える
* [ ] 3 consumer の表示値が回帰なく動くことを手動または E2E で検証する

## Phase 4: 撤退実行

* [ ] `useDayDetailPlan` から `prevDayRecords` / `cumPrevRecords`（raw CTS）を撤去する
* [ ] `selectCtsWithFallback` と `selectCtsWithFallbackFromPair` を削除する
* [ ] leaf-grain surface guard の baseline を 0 に ratchet-down する
* [ ] raw CTS の presentation 直接 import が 0 件であることを grep + guard で確認する

## Phase 5: ドキュメント更新

* [ ] `references/03-guides/chart-data-flow-map.md` の HourlyChart セクションを最終状態に更新する
* [ ] `references/03-guides/runtime-data-path.md` / `references/01-principles/data-pipeline-integrity.md` の関連箇所を更新する
* [ ] `docs/contracts/doc-registry.json` に本 project 完了を記録する
* [ ] `cd app && npm run docs:generate` を実行し generated section を最新化する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
