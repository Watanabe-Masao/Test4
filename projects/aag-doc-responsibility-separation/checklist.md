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

## Phase 3: ar-rule-audit split

- [ ] `references/03-guides/ar-rule-binding-quality-protocol.md` を新規 Create し、§1〜§2 / §5 の protocol content を移送した
- [ ] `references/02-status/ar-rule-audit.md` を §3〜§4 / §6 (status / 履歴 / future task) に縮約した
- [ ] inbound 参照 (CLAUDE.md / archived project plan / base-rules.ts canonicalDocRef / guard comment) を全て co-update した
- [ ] `cd app && npm run test:guards` 全 PASS を確認した
- [ ] `cd app && npm run docs:generate` で generated section が再生成されることを確認した

## Phase 4: stale status refresh

- [x] `references/01-principles/aag/README.md` の display-rule-registry.md status を archived に refresh した
- [x] `references/01-principles/aag/README.md` の旧 AAG doc 「Phase 5 archive 候補」を archive 完了表現に refresh した
- [x] `references/01-principles/aag/layer-map.md` の Phase 8 MVP meta-guard 予定を完遂表現に refresh した
- [x] `references/01-principles/aag/layer-map.md` の selfHostingGuard follow-up を完遂表現に refresh した

## Phase 5: meta.md → audit.md split 判断

- [ ] `aag/meta.md` の現状責務を再評価し、audit framework / 達成判定 / orphan baseline を切り出すか保持するかを人間が判断した
- [ ] 判断結果（split / defer / scope out）を HANDOFF.md に articulate した
- [ ] 判断結果を `references/02-status/open-issues.md` に反映した（split 実施は別 project に escalate）

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
