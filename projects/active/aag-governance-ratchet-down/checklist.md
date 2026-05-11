# checklist — aag-governance-ratchet-down

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の 2 section は **必ずこの順** で配置:
> 1. `## AI 自己レビュー (= user 承認の手前)`
> 2. `## 最終レビュー (user 承認)`

## Phase 0: Bootstrap (= 本 PR で完了)

- [x] AAG-COA Level 4 (Umbrella) 判定 articulate (= projectization.md §1)
- [x] `projects/active/aag-governance-ratchet-down/` 配下 8 ファイル一式 (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / config/project.json / decision-audit / discovery-log) を landing
- [x] `sub-project-map.md` を landing (= 4 sub-program articulate)
- [x] `references/04-tracking/open-issues.md` の active projects 索引に本 program 追加
- [ ] `cd app && npm run docs:generate` で project-health に新 program が `derivedStatus = in_progress` で登録されることを確認
- [ ] `cd app && npm run test:guards` PASS 確認

## Phase 1〜N: Sub-program spawn (= 各 sub-program の独立 program 化、user 判断 gate)

> 各 sub-program は spawn 時に **独立 program として bootstrap** (= projects/_template/ コピー +
> projectization 判定 + 8 ファイル一式 articulate)。本 umbrella の checklist には sub-program
> spawn の有無のみ記録。

- [x] **Sub-program 1: aag-coverage-rule-expansion (C1)** — spawn 判断 + bootstrap (= 2026-05-10 spawn 完了、`projects/completed/aag-coverage-rule-expansion/`)
- [x] **Sub-program 2: aag-failure-pattern-guards (C2 + C3)** — spawn 判断 + bootstrap (= 2026-05-10 spawn 完了、最 leverage 高、`projects/completed/aag-failure-pattern-guards/`)
- [x] **Sub-program 3: aag-disposition-execution (C4)** — spawn 判断 + bootstrap (= 2026-05-10 spawn 完了、`projects/completed/aag-disposition-execution/`)
- [ ] **Sub-program 4: aag-failure-pattern-maturity (C5)** — spawn 判断 + bootstrap (= taxonomy review window 経由、user 判断 gate)

### Sub-program archive 完遂 (= 各 sub-program の archive 移行を本 umbrella で track)

- [x] Sub-program 1 archive 完遂 (= 2026-05-11、Archive v2 5 件目)
- [x] Sub-program 2 archive 完遂 (= 2026-05-11、Archive v2 6 件目)
- [x] Sub-program 3 archive 完遂 (= 2026-05-11、Archive v2 7 件目)
- [ ] Sub-program 4 archive 完遂 (= deferred、Sub-4 spawn 判断 user gate 経由)

## Phase 完遂: 本 umbrella archive

- [ ] 全 sub-program archive 完遂後の本 umbrella final review
- [ ] AI 自己レビュー section 5 項目 [x] flip
- [ ] 最終レビュー (user 承認) section [x] flip
- [ ] 本 umbrella archive 移行 (= projects/active → projects/completed)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1

- [ ] **総チェック**: 全 sub-program 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合 + aag/CHANGELOG.md aagVersion 整合（本 program は app +0.0.0 / aag +0.1）

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1

- [ ] 全 sub-program の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
