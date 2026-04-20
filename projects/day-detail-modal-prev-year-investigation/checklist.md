# checklist — day-detail-modal-prev-year-investigation

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 0: 静的解析で候補の構造シグナルを確認 (完了)

* [x] 3 候補のコードパスを読み、observable 値と候補のマッピングを裏付け (HANDOFF.md §1.1)
* [x] 仮説ランキング: B (最有力) / A (次点) / C (低) を HANDOFF.md に記録
* [x] 既知 fix (`useDuckDB.ts` L216-235) の存在と発火条件を確認
* [x] 候補シグネチャカタログを diagnostic test で機械化 (HANDOFF.md §1.2) — console のみで候補確定可能な状態

## Phase 1: runtime 観測で原因層を絞る (10 分目安)

* [x] 本番環境で `useDayDetailPlanObservation` の localStorage フラグを有効化 → ブラウザ console で観測値を取得 (2026-04-20)
* [x] 観測値を HANDOFF.md §1.3 に記録し、A/B/C いずれでもなく新候補 D (frame null) と判定

## Phase 2: 原因の精密特定

* [x] `useDayDetailPlan.ts` L88-95 の `if (selectedStoreIds.size === 0) return null` が「全店」モードで発火して frame 自体が構築されないことを特定
* [x] 同パターンが dayLeafFrame / cumLeafFrame / timeSlotFrame の 3 箇所に重複していることを特定
* [x] `useCategoryLeafDailyBundle` / `useTimeSlotBundle` が空 storeIds を undefined (全店) として正しく扱う実装であることを確認 → 早期 return 側が誤り

## Phase 3: fix 方針の決定 + 引き渡し

* [x] fix 規模を判定: 軽微 (1 ファイル、3 箇所の早期 return 削除)
* [x] 引き渡し先: `quick-fixes` に observation hook 削除 task を追加 / 本体 fix は PR `claude/day-detail-modal-store-frame-fix`
* [x] HANDOFF.md §1.4 に fix 方針 + PR リンクを記録

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (原因層の確定 + 引き渡し先の task) を人間がレビューし、archive プロセスへの移行を承認する
