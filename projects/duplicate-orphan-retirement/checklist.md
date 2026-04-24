# checklist — duplicate-orphan-retirement（SP-C）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: ADR-C-001 — features/*/ui/widgets.tsx 3 件 byte-identical 解消

* [x] PR1: `duplicateFileHashGuard` を baseline=3 で追加した
* [ ] PR2: 3 file を barrel re-export 化し `@canonical` JSDoc を付記した
* [ ] PR3: consumer grep で features/ 経由 import 0 を確認後、3 file を削除した（barrel 化のみで consumer 0 の場合）
* [ ] PR4: `duplicateFileHashGuard` baseline=0 に更新し fixed mode 化した
* [ ] LEG-010 / LEG-011 / LEG-012 の `sunsetCondition` 達成を確認した

## Phase 2: ADR-C-002 — useCostDetailData 2 箇所並存解消

* [x] PR1: features 版に `@canonical` JSDoc を付記し、`hookCanonicalPathGuard` を baseline=1 で追加した
* [ ] PR2: 全 consumer を features 版 import に切替えた
* [ ] PR3: pages 版 file を削除した
* [ ] PR4: `hookCanonicalPathGuard` baseline=0 + fixed mode 化した
* [ ] LEG-013 の `sunsetCondition` 達成を確認した

## Phase 3: ADR-C-003 — Tier D orphan 3 件削除（BC-5 破壊的変更）

* [ ] PR1: `orphanUiComponentGuard` を baseline=3 で追加した
* [ ] PR2: 3 file 削除（`DowGapKpiCard.tsx` / `PlanActualForecast.tsx` + `__tests__/PlanActualForecast.test.tsx` / `RangeComparison.tsx`）+ `DashboardPage.styles.ts:16` の `export * from './RangeComparison.styles'` 除去を実施した
* [ ] PR3: `orphanUiComponentGuard` baseline=0 + fixed mode 化した
* [ ] LEG-014 の `sunsetCondition` 達成を確認した
* [ ] BC-5 の rollback 手順を PR description に記載した

## Phase 4: ADR-C-004 — barrel re-export metadata 必須化

* [ ] PR1: `barrelReexportMetadataGuard` を baseline=existing barrel count で追加した
* [ ] PR2: 既存 barrel re-export 全てに `@sunsetCondition` + `@expiresAt` + `@reason` JSDoc を bulk 追記した
* [ ] PR3: baseline=0 fixed mode（新規追加時は metadata 必須）に移行した
* [ ] LEG-015 の `sunsetCondition` 達成を確認した

## Phase 5: sub-project completion

* [ ] 4 ADR すべての 4 step（新実装 / 移行 / 削除 / guard）が完遂した
* [ ] LEG-010〜LEG-015 の `consumerMigrationStatus` が全て `migrated` に到達した
* [ ] 本 project の 4 guard（duplicateFileHashGuard / hookCanonicalPathGuard / orphanUiComponentGuard / barrelReexportMetadataGuard）の baseline が 0 に到達した
* [ ] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した
* [ ] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
