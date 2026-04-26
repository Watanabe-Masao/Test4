# checklist — category-leaf-daily-series

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: 契約設計

* [x] 3 consumer（DrilldownWaterfall / CategoryDrilldown / HourlyChart.hourDetail）の leaf-grain 要件を棚卸しし、必要粒度（日次 / 時間帯 × 日次）を `HANDOFF.md` に記録する
* [x] `CategoryLeafDailyEntry` / `CategoryLeafDailySeries` / `CategoryLeafDailyBundle` の型契約を `CategoryLeafDailyBundle.types.ts` に固定する
* [x] wow 経路の扱い（raw 継続 / bundle 対象外）を `plan.md` の不可侵原則に明文化する

## Phase 2: Infra + projection 実装

* [x] `projectCategoryLeafDailySeries` pure 関数と truth-table test を新設する
* [x] `useCategoryLeafDailyBundle` hook を `categoryTimeRecordsPairHandler` + fallback 経由で実装する
* [x] 旧 `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` の fallback 意味論を bundle 内部に畳み込む
* [x] queryPatternGuard の nonPairableConsumers allowlist に fallback 単発呼び出し用途として登録

## Phase 3: consumer 載せ替え（useDayDetailPlan レベル）

* [x] `useDayDetailPlan` を `useCategoryLeafDailyBundle` 経由に切り替える（dayPair + dayFallback + cumPair + cumFallback の 4 箇所を 2 bundle 呼び出しに集約）
* [x] `dayRecords` / `prevDayRecords` / `cumRecords` / `cumPrevRecords` を `bundle.entries`（`CategoryLeafDailyEntry[]` = `CategoryTimeSalesRecord[]` 同型 alias）に切替
* [x] 3 consumer（DrilldownWaterfall / CategoryDrilldown / HourlyChart.hourDetail）が bundle 経由のデータを受け取ることを確認する（props は同型のため consumer 側は無変更で bundle データを消費）
* [x] 表示値が回帰なく動くことを build / test / 手動で確認する

## Phase 4: 撤退実行（fallback / 旧 helper の物理削除）

* [x] `useDayDetailPlan` から `selectCtsWithFallbackFromPair` の利用を撤去する
* [x] `selectCtsWithFallback` と `selectCtsWithFallbackFromPair` を削除する
* [x] `buildCtsPairInput` の利用箇所 0 化に伴い削除する
* [x] 関連テスト（旧 fallback helper のテスト）を削除する
* [x] queryPatternGuard の nonPairableConsumers allowlist に leaf bundle の fallback 用途を登録
* [x] ~~3 consumer 側の `CategoryTimeSalesRecord` 直接 import を `CategoryLeafDailyEntry` に置換~~ — surface guard 0 到達は 32 files 影響のため本 project では**未達**、後続 project `presentation-cts-surface-ratchetdown` (2026-04-19 archived) で 23 件 ratchet-down + fixed mode 完了

## Phase 5: ドキュメント更新

* [x] `references/03-guides/runtime-data-path.md` の HourlyChart 経路の記述を最終状態（bundle + leaf-grain 両方 bundle 経由）に更新する
* [x] `references/01-principles/data-pipeline-integrity.md` の関連箇所を更新する
* [x] `docs/contracts/doc-registry.json` に本 project 完了を記録する
* [x] `cd app && npm run docs:generate` を実行し generated section を最新化する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
