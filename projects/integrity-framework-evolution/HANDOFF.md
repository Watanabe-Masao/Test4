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

### Phase Q 完遂 (2026-04-29、採用 4 件 + cut 10 件)

> **Phase Q final disposition**: 14 要素 → 4 採用 (landed) + 10 cut。詳細: `plan.md §Phase Q scope reduction` / `derived/quality-review.md §10`。

**採用 4 件 landed** (commit `dde1d4e`):
- Q.O-1: 3 入口 doc (AAG_OVERVIEW.md / AAG_CRITICAL_RULES.md / aag-onboarding-path.md)
- Q.O-2: BaseRule に `tier?: 0|1|2|3` 追加、Tier 0 を 6 rule に初期指定
- Q.O-4: guard-failure-playbook.md (Repair-style standard 明文化)
- Q.M-1: PR template `AAG Change Impact` section + aag-change-impact-template.md

**cut 10 件**:
- Q.O-3 (Change classification) → Q.M-1 + projectization Level 0-4 で代替済み
- Q.O-5 (auto-generated README) → defer (復活 trigger: project 数 ≥ 15)
- Q.O-6 / Q.M-4 (efficacy KPIs)、Q.M-2 (invariants doc)、Q.M-3 (meta-guards)、Q.M-5 / Q.M-6 / Q.M-7 / Q.M-8 → Phase R で実害 evidence が出た時のみ additive 追加 (YAGNI)

### 次にやること: 縮小版 Phase R + I

> **Phase R/H/I scope reduction (2026-04-29)**: 6 reform + 4 candidate + I 多数 → **2 採用 + archive transition** に縮小。詳細: `plan.md §Phase R/H/I` / `derived/quality-review.md §11`。

**残 work (~3 PR)**:

1. **archive transition (Phase I 縮小版)**: 前駆 project canonicalization-domain-consolidation を `projects/completed/` に移行
2. **R-① 部分**: COVERAGE_MAP を shared module 化、integrity-collector の regex parse 廃止
3. **R-⑥**: integrityDomainCoverageGuard を integrity primitive で書き直し (dogfooding)

完遂後、本 project の status を `draft` → `completed` に移行して archive。

### cut (anti-bloat self-test)

- Phase R: R-①全体 / R-② / R-③ / R-④ / R-⑤
- Phase H: H-α / H-β / H-γ / H-δ
- Phase I: §P8/§P9 3-zone 化 / canonicalization-checklist.md 3-zone 化 / 第 5 の柱 handoff doc
- 復活 trigger: 各項目に対応する concrete drift / pain evidence が出た時のみ別 minor project として起案 (YAGNI)

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
