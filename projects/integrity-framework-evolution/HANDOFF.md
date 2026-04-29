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

### 直近 (Phase Q 着手 — Phase R の prerequisite)

> **Phase Q を Phase R より前に挿入** (外部レビュー 1 + 2 統合、2026-04-29)。Phase Q は operational + meta-governance の 2 軸 14 要素。

1. **Phase Q operational axis (Q.O-1〜Q.O-6) を順次 landing** — 認知負荷削減 + 効果測定:
   - Q.O-1 (入口整備) を最先行: AAG_OVERVIEW.md / AAG_CRITICAL_RULES.md / aag-onboarding-path.md
   - Q.O-2 (Risk tiering Tier 0-3) で全 rule に tier 必須化
   - Q.O-3 (Change classification Micro/Local/System/Constitutional) で PR 入口判定
   - Q.O-4 (Repair-style guard messages) で remediation system 化
   - Q.O-5 (projects 直下 README auto-generate) で project navigation
   - Q.O-6 (operational KPIs efficacy + degradation) で AAG 効果測定

2. **Phase Q meta-governance axis (Q.M-1〜Q.M-8) を順次 landing** — AAG 自己保護:
   - Q.M-1 (AAG_CHANGE_IMPACT template) を Q.O-1 と並行 (Phase Q 自身も適用対象)
   - Q.M-2 (AAG invariant list 9 件、anti-bloat 含む)
   - Q.M-3 (AAG meta-guards 8 件)
   - Q.M-4 (operational KPIs collector — Q.O-6 と同 collector の 2 vue)
   - Q.M-5 (promotion gate L0-L7) で new rule 成熟度
   - Q.M-6 (canary rollout policy Phase 0-4) で段階導入
   - Q.M-7 (rollback policy) で failure 時降格経路
   - Q.M-8 (governance review checklist) で二段階 review

3. **Phase Q 順序の判断**:
   - Q.O-1 + Q.M-1 を最先行 (入口 doc + AAG 変更 template、後続 reform の review に必須)
   - Q.O-2 + Q.M-2 (Tier + invariants schema 拡張) を Q.M-3 (meta-guards) の前に
   - Q.O-6 と Q.M-4 は同 collector、合わせて landing
   - 他は並行可

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
