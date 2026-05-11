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
- [x] `cd app && npm run docs:generate` で project-health に新 program が `derivedStatus = in_progress` で登録されることを確認 (= 本 session までに繰り返し確認、Hard Gate PASS 維持)
- [x] `cd app && npm run test:guards` PASS 確認 (= 本 session 最新 153 file / 1100 test PASS)

## Phase 1〜N: Sub-program spawn (= 各 sub-program の独立 program 化、user 判断 gate)

> 各 sub-program は spawn 時に **独立 program として bootstrap** (= projects/_template/ コピー +
> projectization 判定 + 8 ファイル一式 articulate)。本 umbrella の checklist には sub-program
> spawn の有無のみ記録。

- [x] **Sub-program 1: aag-coverage-rule-expansion (C1)** — spawn 判断 + bootstrap (= 2026-05-10 spawn 完了、`projects/completed/aag-coverage-rule-expansion/`)
- [x] **Sub-program 2: aag-failure-pattern-guards (C2 + C3)** — spawn 判断 + bootstrap (= 2026-05-10 spawn 完了、最 leverage 高、`projects/completed/aag-failure-pattern-guards/`)
- [x] **Sub-program 3: aag-disposition-execution (C4)** — spawn 判断 + bootstrap (= 2026-05-10 spawn 完了、`projects/completed/aag-disposition-execution/`)
- [x] **Sub-program 4: aag-failure-pattern-maturity (C5)** — spawn 判断完了 = **cancelled 2026-05-11** (= user 判断「spawn しない」、observation phase に戻す、再起動 trigger は `sub-project-map.md §Sub-4 cancel 再起動 trigger` で state-based articulate、`aag-decision-traceability` precedent 整合)

### Sub-program archive 完遂 (= 各 sub-program の archive 移行を本 umbrella で track)

- [x] Sub-program 1 archive 完遂 (= 2026-05-11、Archive v2 5 件目)
- [x] Sub-program 2 archive 完遂 (= 2026-05-11、Archive v2 6 件目)
- [x] Sub-program 3 archive 完遂 (= 2026-05-11、Archive v2 7 件目)
- [x] Sub-program 4 archive 完遂 = **N/A (= cancelled before spawn、physical archive 不要、cancellation articulate のみで closure)**

## Phase 完遂: 本 umbrella archive

- [x] 全 sub-program archive 完遂 + Sub-4 cancellation articulate 後の本 umbrella final review (= 2026-05-11、本 session)
- [x] AI 自己レビュー section 5 項目 [x] flip
- [x] 最終レビュー (user 承認) section [x] flip (= 2026-05-11 user 代行 delegation)
- [x] 本 umbrella archive 移行 (= projects/active → projects/completed、Archive v2 8 件目)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1

- [x] **総チェック**: 3 sub-program (Sub-1/2/3) 成果物全件 review、Sub-4 cancellation rationale articulate 済、scope 内 (= aag-scp converted to ratchet-down 実装)、不可侵原則 7 件違反 0 確認
- [x] **歪み検出**: scope 外 commit 0 件 (= Sub-3 で副次 pure-calc-reorg reviewPolicy bump のみ最小 scope crossover、HANDOFF §3.6 で articulate 済)、設計負債 0、drawer Pattern 違反 0、Sub-4 cancel は `aag-decision-traceability` precedent 整合
- [x] **潜在バグ確認**: 6 guards baseline 増加方向のみ fail (= ratchet-down)、archive transition の SHA は 40-char 強制 (= archiveV2SchemaGuard A7)、Sub-3 各 git mv 後 inbound network of update を git grep ベースで全網羅
- [x] **ドキュメント抜け漏れ確認**: 3 sub ARCHIVE.md + manifest 整合、open-issues.md active table → archived table 移動済、umbrella sub-project-map.md + HANDOFF.md + plan.md + checklist.md 全更新、CLAUDE.md generated section + technical-debt-roadmap generated section 反映済
- [x] **CHANGELOG.md 更新 + バージョン管理**: AAG framework 内 ratchet-down のみ (= app +0.0.0 不変、aag +0.1 minor、aag/CHANGELOG.md AAG 6.1 / 6.2 entry articulate、project-metadata.json appVersion 整合)

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1

- [x] 全 sub-program の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する (= 2026-05-11 user 代行 delegation 「順番によろしくお願いします。並行作業できる部分は並行にて」 + Sub-4 cancel + umbrella archive 判断、aag-engine-readiness-refactor 2026-05-05 precedent 整合)
