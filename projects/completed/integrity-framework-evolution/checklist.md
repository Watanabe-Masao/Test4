# checklist — integrity-framework-evolution

> 役割: completion 判定の入力（required checkbox の集合）。
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 0: 計画 doc landing

- [x] `projects/integrity-framework-evolution/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 4 / architecture-refactor / status draft) を記録した
- [x] `plan.md` に North Star + Phase Q + R + H + I + 不可侵原則 10 件 + 4 layer model を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（draft 起草段階）と次にやることを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 4) と nonGoals を記録した
- [x] `breaking-changes.md` に Phase R + Phase Q (Meta-AAG layer) の schema 変更を記録した
- [x] `legacy-retirement.md` に旧 schema + Meta-AAG 不在 pattern の撤退記録を整備した
- [x] `sub-project-map.md` に親 / 並行 / 後続 project 関係を記録した
- [x] `derived/quality-review.md` に 13 dimension review + Meta-AAG insight の ground truth を保存した

## Phase Q: AAG Maturation (scope reduced 14→4, 2026-04-29)

> **AAG を「強い品質ゲート」から「低認知負荷で、リスクに応じて、修正まで導く品質運用システム」へ進化。Phase R/H/I の prerequisite。**
>
> **Scope reduction (anti-bloat self-test)**: 14 要素 → 4 要素 (採用) + 2 要素 (保留、採用後に再評価) + 8 要素 (cut、Phase R で実害 evidence 出た時のみ additive 追加)。詳細: `plan.md §Phase Q scope reduction`。

### 採用 (今 sprint で landing)

- [x] Q.O-1: AAG_OVERVIEW.md / AAG_CRITICAL_RULES.md / aag-onboarding-path.md (3 入口 doc) を整備した
- [x] Q.O-2: BaseRule schema に `tier?: 0 | 1 | 2 | 3` 追加 + Tier 0 を最小限指定 (data corruption / financial correctness / layer inversion 系) + AAG_CRITICAL_RULES.md に Tier 0 一覧を記載
- [x] Q.O-4: Repair-style guard message 標準を `references/03-guides/guard-failure-playbook.md` (新設) に文書化、AagResponse の延長として位置づけ
- [x] Q.M-1: AAG_CHANGE_IMPACT PR template を整備し、AAG 変更 PR で必須化する guard を実装した

### cut (採用 4 件 landing 後の最終 disposition)

- ~~Q.O-3 (Change classification)~~ — 採用 4 件 landing 後の再評価で Q.M-1 `AAG_CHANGE_IMPACT` (Affected layer + Risk + Anti-bloat self-test) + projectization Level 0-4 が同機能を richer に cover することを確認、第 3 分類軸は overlap で **cut**
- ~~Q.O-5 (auto-generated README)~~ — 現状 project 数 ≈ 8 で manual maintenance 可能、auto-gen は additive value で harm prevention にならない (anti-bloat 質問 1 に答えにくい) → **defer**。復活 trigger: project 数 ≥ 15 or onboarding 事故

### cut (Phase R で実害 evidence 出た時のみ additive 追加)

- ~~Q.O-6 / Q.M-4 (14 efficacy KPIs)~~ — speculative、Phase R 進行中に measurement gap が出たら追加
- ~~Q.M-2 (9 invariants doc)~~ — anti-bloat / no-resurrect は既存 AAG 第 7 / 第 8 原則に内包
- ~~Q.M-3 (8 meta-guards)~~ — speculative、drift 事例が出てから ratchet で追加
- ~~Q.M-5 (promotion gate L0-L7)~~ — 1 人 project で過剰 ceremony
- ~~Q.M-6 (canary rollout)~~ — 同上
- ~~Q.M-7 (rollback policy)~~ — 既存の git revert + allowlist 機構で代替可能
- ~~Q.M-8 (2 段 review)~~ — 1 人 project で過剰

## Phase R: Framework Reset (scope reduced 6→2)

> **採用 2 件のみ**。詳細: `plan.md §Phase R` / `derived/quality-review.md §11`。

- [x] R-① 部分: COVERAGE_MAP を shared module に抽出し、integrity-collector の regex parse を構造化 read に置換 (test/collector の duplicate logic 解消)
- [x] R-⑥: integrityDomainCoverageGuard.test.ts が `@app-domain/integrity` から COVERAGE_MAP を import (自 domain の正本を使う dogfooding 達成)。AAG #14 pair 化等の追加 dogfooding は YAGNI として cut

### cut (anti-bloat self-test 結果)

- ~~R-① 全体 (CanonicalContract schema)~~ → 部分採用、schema 全体導入は theoretical
- ~~R-② time-axis Decision Record schema~~ → 1 人 project で必要性 evidence なし
- ~~R-③ mechanism/judgement/hybrid 3-zone 必須化~~ → 既に大部分機械化済
- ~~R-④ Cross-domain Framework Layer~~ → 3 domain で over-engineering
- ~~R-⑤ Decision Artifact Standard~~ → Q.M-1 AAG_CHANGE_IMPACT が cover 済

## Phase H: Horizontal Expansion (全 cut)

> Phase R 縮小で前提崩壊、4 candidate 全 cut。詳細: `plan.md §Phase H`。

- ~~H-α (hooks re-eval)~~ / ~~H-β (charts)~~ / ~~H-γ (wasm)~~ / ~~H-δ (COVERAGE_MAP 拡張)~~
- 必要性 evidence が出たら別 minor project として起案

## Phase I: Institutionalization (scope reduced)

> archive transition + status 移行のみ。詳細: `plan.md §Phase I`。

- [ ] 前駆 project (canonicalization-domain-consolidation) を archive 経路に移行した (project-checklist-governance §6.2)
- [ ] 本 project の status を completed に更新した

### cut

- ~~§P8/§P9 を R-①/R-②/R-③ schema で再構造化~~ → R-②/R-③ cut で前提崩壊
- ~~canonicalization-checklist.md 3-zone 化~~ → 同上
- ~~第 5 の柱 (Project Lifecycle Governance) handoff doc~~ → future work

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [x] 全 Phase (R / H / I) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する (2026-04-29 user 承認、Phase R/H/I scope reduction で残 work 縮小済、option (a) 「両方 archive まで進めてください」に基づく archive 代行)
