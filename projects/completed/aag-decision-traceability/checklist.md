# checklist — aag-decision-traceability

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の Phase は「最終レビュー (人間承認)」とし、
> 機能的な作業がすべて [x] になった後でも 1 つ以上 [ ] が残るようにする。
> これにより `derivedStatus = completed` への遷移は人間レビューを必ず経由し、
> archive プロセスへの移行を構造的にゲートできる。

## Phase 0: spawn judgment — scope out

- [x] Project E DecisionTrace concept を scope out する判断を articulate した（HANDOFF.md §6 参照、現状 AAG framework MVP で具体的 painful gap が観測されておらず、speculative concept への先回り project 化は AAG-REQ-NO-PERFECTIONISM + AAG-REQ-NON-PERFORMATIVE の対偶リスク。inventory + 要求整理を経ない scope out 判断は本 project が premature spawn だった可能性の articulation を兼ねる、case B early scope-out として `aag-legacy-retirement` 前例パターンに合致）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
