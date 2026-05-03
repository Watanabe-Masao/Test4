# checklist — &lt;PROJECT-ID&gt;

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の 2 section は **必ずこの順** で配置:
>
> 1. `## AI 自己レビュー (= user 承認の手前)` — AI が実装後の総 review を実施する mandatory checkpoint (= DA-β-002)
> 2. `## 最終レビュー (user 承認)` — user 承認 gate
>
> 機能的な作業がすべて [x] になった後でも、AI 自己レビュー section に 1 つ以上 [ ] が残れば user 承認に進めない。
> AI 自己レビューが [x] になっても 最終レビュー section が [ ] なら project は `in_progress` のまま留まる。
> archive プロセスへの移行を **2 段 gate** で構造的に articulate (= 機械検証 PZ-13)。

## Phase 1: &lt;Phase 名&gt;

- [ ] &lt;達成条件 1&gt;
- [ ] &lt;達成条件 2&gt;
- [ ] &lt;達成条件 3&gt;

## Phase 2: &lt;Phase 名&gt;

- [ ] &lt;達成条件 1&gt;
- [ ] &lt;達成条件 2&gt;

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
