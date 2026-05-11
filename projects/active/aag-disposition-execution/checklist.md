# checklist — aag-disposition-execution

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

## Phase 1: archive 3 件 group execution

- [x] aag-doc-audit-report.md → references/99-archive/ (= [ARCHIVED] header + frontmatter 装着)
- [x] authoritative-term-sweep.md → references/99-archive/ (= 同上)
- [x] .claude/plans/next-session-plan.md → .claude/plans/archive/2026-04-09-session-report.md (= rename 込み)
- [x] reading-decisions.yaml の 3 entries path 更新 (= articulate と実 location 整合)
- [x] doc-registry path update (= 9083182 で archived path に統一)
- [x] commit fe93f58 で landed

## Phase 2: move 11 件 (promotion-readiness) batch execution

- [x] 11 promotion-readiness-* docs を references/04-tracking/ → projects/active/pure-calculation-reorg/phase-8/readiness/ へ git mv
- [x] reading-decisions.yaml entries 11 paths + duplicates 11 update
- [x] doc-registry.json entries 11 update
- [x] references/README.md entries 11 update
- [x] ai-doc-template-rules.yaml example 1 update (= status-snapshot kind example)
- [x] pure-calc-reorg overlay reviewPolicy bump (= 4 rules、副次 unblock)
- [x] commit feac2b9 で landed

## Phase 3: move 1 件 (ar-rule-audit) + 18 inbound updates

- [x] git mv references/04-tracking/ar-rule-audit.md → references/03-implementation/ar-rule-binding-protocol.md
- [x] 5 guard tests の @see comments update (= canonicalDocBackLinkGuard / canonicalDocRefIntegrityGuard / selfHostingGuard / semanticArticulationQualityGuard / statusIntegrityGuard)
- [x] aag/_internal/display-rule-registry.md update (= canonical-doc table entry)
- [x] docs/contracts/doc-registry.json update (= status section path entry)
- [x] docs/contracts/principles.json update (= $comment 内 5 件)
- [x] docs/contracts/src/docs/document-reading-decisions.yaml update (= disposition: move entry)
- [x] docs/contracts/src/docs/document-failure-taxonomy.yaml update (= examplePaths)
- [x] references/README.md update (= canonical-doc index table)
- [x] generated artifacts regen (= 8 files via docs:generate + governance generators)
- [x] commit f23062a で landed

## Phase 4: split 3 件 execution

- [x] engine-maturity-matrix.md rewrite (= stable definitions のみ保持、Aggregate Boundary + Bridge Infrastructure 含む)
- [x] engine-promotion-matrix.md rewrite (= current state summary + 更新ルール のみ保持)
- [x] features-migration-status.md rewrite (= 完遂記録 + Widget Ownership は code 正本 pointer + 別 Epic 候補 inventory)
- [x] commit 87ca39e で landed

## Phase 5: generated-register 1 件

- [x] architectureStateAudit.test.ts L414: write target → architecture-state-snapshot.generated.md
- [x] orphan architecture-state-snapshot.md 物理削除
- [x] doc-registry.json L683 path 整合 update
- [x] document-reading-decisions.yaml L438 path 整合 update
- [x] commit ddcc17c で landed

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [x] **総チェック**: 19/19 件 disposition 完遂、scope 内 (= articulate 済 19 件のみ)、不可侵原則違反 0 (= 新 disposition 追加なし / inbound 全件 update / archive frontmatter 装着済)
- [x] **歪み検出**: pure-calc-reorg reviewPolicy bump は副次 fix (= 最小 scope crossover、HANDOFF §3.6 articulate 済)、それ以外 scope 外 commit なし
- [x] **潜在バグ確認**: 各 git mv 後の inbound update を git grep ベースで全網羅、reference-link-existence guard PASS で path 健全性検証済
- [x] **ドキュメント抜け漏れ確認**: 親 umbrella HANDOFF.md + sub-project-map.md の Sub-3 status 反映済、generated artifacts (= 9 files) regen 済
- [x] **CHANGELOG.md 更新 + バージョン管理**: AAG framework 内 ratchet-down (= app version 影響なし)、aag/CHANGELOG.md に AAG 6.x entry articulate

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
