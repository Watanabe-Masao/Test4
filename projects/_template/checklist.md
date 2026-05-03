# checklist — &lt;PROJECT-ID&gt;

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の Phase は「最終レビュー (user 承認)」とし、
> 機能的な作業がすべて [x] になった後でも 1 つ以上 [ ] が残るようにする。
> これにより `derivedStatus = completed` への遷移はuser レビューを必ず経由し、
> archive プロセスへの移行を構造的にゲートできる。

## Phase 1: &lt;Phase 名&gt;

- [ ] &lt;達成条件 1&gt;
- [ ] &lt;達成条件 2&gt;
- [ ] &lt;達成条件 3&gt;

## Phase 2: &lt;Phase 名&gt;

- [ ] &lt;達成条件 1&gt;
- [ ] &lt;達成条件 2&gt;

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) をuser がレビューし、archive プロセスへの移行を承認する
