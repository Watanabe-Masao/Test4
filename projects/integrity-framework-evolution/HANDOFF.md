# HANDOFF — integrity-framework-evolution

> 役割: project の volatile な進行状態 (現在地 / 次にやること / 並行進行) を 1 箇所に集約。

## 現在地

**status: draft (Phase 0 bootstrap 完遂、Phase R 着手前)**

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

### 直近 (Phase R 着手)

1. **Phase R 各 reform の作業 PR を順次 landing**:
   - R-①: Bidirectional Canonical Contract schema (`app-domain/integrity/types.ts` 拡張)
   - R-②: Time-axis Decision Record schema (全 archive 共通適用)
   - R-③: 3-zone 分類を §P8/§P9 / selection rule / 撤退規律に適用
   - R-④: APP_DOMAIN_INDEX.md 統一 template 整備
   - R-⑤: Decision Artifact Standard PR template + guard
   - R-⑥: Dogfooding Mandate (AAG #14 pair / coverage guard refactor)

2. **Phase R 順序の判断**:
   - R-① / R-② を先行 (schema 基盤、後続 reform が依存)
   - R-③ は §P8/§P9 改修なので前駆 project の archive 確認後に着手するのが安全
   - R-④ / R-⑤ / R-⑥ は並行可

### 中期 (Phase H 着手)

- Phase R 完了確認 (Phase H entry の prerequisite)
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
