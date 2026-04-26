# checklist — widget-registry-simplification（SP-B）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase 1: ADR-B-001 — 二重 null check 解消

* [ ] PR1: `shortcutPatternGuard` を baseline=current で追加した（registry 行の二重 null check pattern を ratchet-down 検出）
* [ ] PR2: type narrowing で gate 削除可能な widget から順次解消した（pure delegation 群を先行）
* [ ] PR3: 残 widget を discriminated union で gate 削除した（重量級含む）
* [ ] PR4: `shortcutPatternGuard` baseline=0 + fixed mode 化した

## Phase 2: ADR-B-002 — full ctx passthrough を絞り込み props 化

* [ ] PR1: `fullCtxPassthroughGuard` を baseline=current で追加した（`<X ctx={ctx} />` パターン検出）
* [ ] PR2: pure delegation widget の helper signature を絞り込み props に変換した（先行群 WID-009-013）
* [ ] PR3: 重量級 widget（WID-001 / WID-002 / WID-018）の props 整理、widgetCtx 重複注入解消した
* [ ] PR4: passthrough 0 到達、`fullCtxPassthroughGuard` baseline=0 + fixed mode 化した

## Phase 3: ADR-B-003 — IIFE pattern を readModel selector 抽出

* [ ] PR1: `registryInlineLogicGuard` を baseline=current で追加した（IIFE count 検出）
* [ ] PR2: selector 3 本を `application/readModels/customerFact/selectors.ts` に新設した（pure fn）
* [ ] PR3: 3 IIFE を selector call に置換した（WID-018 / WID-021）
* [ ] PR4: `registryInlineLogicGuard` baseline=0 + fixed mode 化した

## Phase 4: ADR-B-004 — registry inline JSX 解消（B-003 follow-through）

* [ ] PR1: `registryInlineLogicGuard` 拡張で inline JSX / default hardcode 検出を追加、baseline=current
* [ ] PR2: helper / default config を純関数 / 定数に抽出した
* [ ] PR3: registry 行を helper call / config 参照に置換した
* [ ] PR4: `registryInlineLogicGuard` baseline=0 + LEG-009 sunsetCondition 達成

## Phase 5: sub-project completion

* [ ] 4 ADR すべての 4 step（新実装 / 移行 / 削除 / guard）が完遂した
* [ ] LEG-009 の `consumerMigrationStatus` が `migrated` に到達した
* [ ] 本 project の 3 guard（shortcutPattern / fullCtxPassthrough / registryInlineLogic）の baseline が 0 に到達した
* [ ] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した
* [ ] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
