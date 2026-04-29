# HANDOFF — integrity-framework-evolution

> 役割: project の volatile な進行状態 (現在地 / 次にやること / 並行進行) を 1 箇所に集約。

## 現在地

**status: draft (Phase 0 bootstrap 完遂、Phase Q 着手前)**

### 完遂したもの (Phase 0 bootstrap、2026-04-29)

- `config/project.json` (Level 4 / architecture-refactor / status=draft / dependsOn=完了予定の前駆 project)
- `plan.md` (North Star "整えてから進める" + Phase R/H/I + 不可侵 7 原則)
- `checklist.md` (Phase 0 + R + H + I + 最終レビュー)
- `AI_CONTEXT.md` (scope + read order)
- `HANDOFF.md` (本 file)
- `projectization.md` (AAG-COA 判定 Level 4)
- `derived/quality-review.md` (13 dimension review ground truth)
- `aag/execution-overlay.ts` (空 overlay、本 project が active overlay 化したら埋める)

### 立ち上げの経緯

前駆 project `canonicalization-domain-consolidation` の Phase A〜I 完遂後の最終 review session で、AAG framework に **7 つの構造 pattern + 3 つの構造的問題 + 3 つの制度的問題** が発見された (詳細: `derived/quality-review.md`)。

これらは「進めながら整える」より「整えてから進める」方が後戻りコストが小さいと判断、本 project を立ち上げて Phase R で先行整備し、その上で Phase H (wasm + charts + hooks) を実施する設計に転換。

## 次にやること

### 直近 (Phase Q 着手 — scope reduced 14→4)

> **Phase Q scope reduction** (anti-bloat self-test、2026-04-29): 14 要素 → 4 採用 + 2 保留 + 8 cut。詳細: `plan.md §Phase Q scope reduction` / `derived/quality-review.md §10`。

1. **採用 4 件を順次 landing**:
   - Q.O-1 (3 入口 doc): AAG_OVERVIEW.md / AAG_CRITICAL_RULES.md / aag-onboarding-path.md
   - Q.O-2 (BaseRule に tier 追加 + Tier 0 最小指定): schema 追加は optional field、Tier 0 のみ初期指定、他は徐々に
   - Q.O-4 (Repair-style guard message 標準): guard-failure-playbook.md 新設
   - Q.M-1 (AAG_CHANGE_IMPACT PR template + guard): AAG 変更 PR で必須化

2. **保留 2 件 (採用 4 件 landing 後に再評価)**:
   - Q.O-3 (Change classification): projectization Level 1-4 + Q.M-1 が PR 入口判定をどこまで吸収できるか観察してから判断
   - Q.O-5 (auto-generated README): Q.O-1 AAG_OVERVIEW が project navigation も兼ねられるか観察してから判断

3. **cut 8 件 (Phase R で実害 evidence 出た時のみ additive 追加、YAGNI)**:
   - Q.O-6 / Q.M-4 (efficacy KPIs) / Q.M-2 (invariants doc) / Q.M-3 (meta-guards)
   - Q.M-5 (promotion gate) / Q.M-6 (canary) / Q.M-7 (rollback) / Q.M-8 (2 段 review)

### 中期 (Phase R 着手 — Phase Q 完了が prerequisite)

- R-①〜R-⑥ を Phase Q deliverable (Q.O-2 Tier / Q.M-1 IMPACT template / Q.M-6 canary 等) で protect された状態で landing
- 各 reform は Q.M-6 canary rollout policy に従い段階導入

### 中期 (Phase H 着手 — Phase R 完了が prerequisite)

- H-α (hooks 再判定) → H-β (charts 採用) → H-γ (wasm 採用) → H-δ (COVERAGE_MAP 拡張)

### Phase I (institutionalization + handoff)

- §P8/§P9 の 3-zone 化
- 前駆 project archive
- 第 5 の柱 (Project Lifecycle Governance) への handoff doc

## 並行進行している project

- **canonicalization-domain-consolidation** (前駆、Phase A〜I 完遂、final review pending)
  - 本 project の dependsOn、final review 後 archive
- **pure-calculation-reorg** (active overlay、CURRENT_PROJECT.md)
  - 本 project の Phase R で `calculationCanonRegistry` を touch する場合は協調必要
- **phased-content-specs-rollout** (Phase A〜J 完遂、archive 候補)
  - 前駆 project の Phase B reference 実装供給元として機能、本 project に直接の依存無し

## 着手前の確認事項

- 不可侵原則 7 件 (plan.md §2) を全 PR で確認する
- 「進めながら整える」 approach に逆戻りしていないか毎 PR で確認する
- 13 dimension review の deferred 項目 (第 5 の柱送り) を本 project に持ち込まない

## 関連リンク

- North Star: `plan.md §0`
- ground truth: `derived/quality-review.md`
- 前駆 project の最終 state: `projects/canonicalization-domain-consolidation/HANDOFF.md`
- 撤退規律: `references/01-principles/canonicalization-principles.md §P9`
- 整合性 domain 設計: `references/03-guides/integrity-domain-architecture.md`
