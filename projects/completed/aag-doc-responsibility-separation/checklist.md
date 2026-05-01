# checklist — aag-doc-responsibility-separation

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の Phase は「最終レビュー (人間承認)」とし、
> 機能的な作業がすべて [x] になった後でも 1 つ以上 [ ] が残るようにする。

## Phase 1: inventory

- [x] AAG 関連 doc 6 件の責務分類を inventory した（HANDOFF.md §3 にて articulate）

## Phase 2: Project E rescue

- [x] `projects/aag-decision-traceability/` を独立 active project として spawn した（commits 5acb275 + ad71d64）
- [x] archived `aag-bidirectional-integrity` 行から "Future follow-up = Project E candidate" 文を削除した
- [x] `references/02-status/open-issues.md` の active 索引に `aag-decision-traceability` を追加した

## Phase 3: ar-rule-audit split — scope out

- [x] Phase 3 を scope out する判断を articulate した（HANDOFF.md §6 参照、split risk = drill-down chain semantic 破壊 / archived doc immutability 破壊 or linkrot / 重複 articulation 生成 が現状 functional な doc の split benefit を上回るため、AAG-REQ-NO-PERFECTIONISM + AAG-REQ-NON-PERFORMATIVE に従って意図的に残す弱さとして許容）

## Phase 4: stale status refresh

- [x] `references/01-principles/aag/README.md` の display-rule-registry.md status を archived に refresh した
- [x] `references/01-principles/aag/README.md` の旧 AAG doc 「Phase 5 archive 候補」を archive 完了表現に refresh した
- [x] `references/01-principles/aag/layer-map.md` の Phase 8 MVP meta-guard 予定を完遂表現に refresh した
- [x] `references/01-principles/aag/layer-map.md` の selfHostingGuard follow-up を完遂表現に refresh した

## Phase 5: meta.md → audit.md split 判断 — scope out

- [x] `aag/meta.md` を「3 機能融合 mechanism doc」として永続的に統合維持する判断を articulate した（HANDOFF.md §6 参照、親 project §8.10 の能動判断を覆す新 failure mode なし、selfHostingGuard が §2 を真値参照する依存もあり split cost > benefit）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
