# HANDOFF — canonicalization-domain-consolidation

> 役割: project の volatile な進行状態（現在地 / 次にやること / handoff 先）を 1 箇所に集約。

## 現在地

**status: in_progress (Phase A〜I 完遂、final review pending、Phase H は後続 project に handoff)**

### Phase 進行サマリ (2026-04-29 時点)

| Phase | 状態 | landed 内容 |
|---|---|---|
| Phase 0 | ✅ | bootstrap (plan / checklist / projectization / AI_CONTEXT / HANDOFF / config) |
| Phase A | ✅ | inventory + selection rule §P8 + adoption-candidates.json |
| Phase B | ✅ | domain skeleton (14 primitive + 4 type) |
| Phase C | ✅ | doc-registry first migration |
| Phase D-W1〜W3 | ✅ | 11 ペア bulk migration |
| Phase E | ✅ | legacy retirement + retrospective fixes (§P9 step 5 直接到達 default 化) |
| Phase F | ✅ | domain 完全性 + adapter shape + COVERAGE_MAP 正本 (`integrityDomainCoverageGuard`) |
| Phase G | ✅ | 4 KPI architecture-health 統合 (Hard Gate 2 件: violations.total + expiredExceptions) |
| Phase H | **handoff** | 後続 project `integrity-framework-evolution` に移管 |
| Phase I | ✅ | 制度文書化 (NO-RESURRECT rule + canonicalization-checklist.md + handoff) |
| Final review | pending | 人間レビュー待ち |

### 主要 deliverable

**正本 docs (永続成果)**:
- `references/01-principles/canonicalization-principles.md` §P8 (selection rule) + §P9 (撤退規律 default = step 5 直接到達)
- `references/03-guides/integrity-pair-inventory.md` (13 ペア + 横展開候補 inventory)
- `references/03-guides/integrity-domain-architecture.md` (domain 設計 + Phase F coverage 正本)
- `references/03-guides/canonicalization-checklist.md` (新規追加 / 撤退の標準手順)

**実装 (`app-domain/integrity/`)**:
- 14 primitive (parsing 6 / detection 7 / reporting 1) + 4 type
- 90+ unit test、domain 純粋性 4 不変条件 active

**guard (`app/src/test/guards/`)**:
- `integrityDomainSkeletonGuard` (introspection-based、命名規約 + 純粋性検証)
- `integrityDomainCoverageGuard` (COVERAGE_MAP 13 ペア完全性 + adapter shape)
- `integrityNoResurrectGuard` (rejected[] resurrection 検出、AR-INTEGRITY-NO-RESURRECT 実装)

**KPI (`architecture-health.json`)**:
- `integrity.violations.total` (Hard Gate eq 0)
- `integrity.expiredExceptions` (Hard Gate eq 0)
- `integrity.driftBudget` (info、現状 1)
- `integrity.consolidationProgress` (info、現状 92.3%)

**機械化 record (archive)**:
- `derived/adoption-candidates.json` (existingPairs / horizontalCandidates / deferred / **rejected**)
- `legacy-retirement.md §7` (Phase B/C/D-W1/D-W2/D-W3/E の actual sunset 日付)

## Phase H handoff の経緯 (2026-04-29)

本 project sprint の最終段階で **13 dimension quality review** を実施し、AAG framework に **7 つの構造 pattern + 3 つの構造的問題 + 3 つの制度的問題** が発見された。

これらは「進めながら整える」より「整えてから進める」方が後戻りコストが小さいと判断、Phase H を含む horizontal expansion を **後続 project `integrity-framework-evolution`** に handoff する設計に転換。

- **後続 project の Phase R**: Framework Reset (双方向契約 schema / 時間軸 schema / 3-zone 分類 / cross-domain bridge / decision artifact standard / dogfooding mandate)
- **後続 project の Phase H**: Horizontal Expansion (wasm + charts + hooks)、Phase R で整えた framework の最初の正規利用
- **後続 project の Phase I**: institutionalization

13 dimension review の生 ground truth は後続 project の `derived/quality-review.md` に保存。

## 次にやること

### 本 project に対して
1. **final review (人間承認)** — Phase A〜I 成果 + handoff 判断を確認、approve で archive 経路へ
2. archive 経路: completed プレフィックス配下への移動 (project-checklist-governance §6.2 参照、archive 時点で path は確定する)

### 後続 project に対して (= horizontal expansion + framework reset)
1. `projects/integrity-framework-evolution/` を bootstrap (本 PR で skeleton 投入済の場合)
2. Phase R 着手 (6 reforms ①〜⑥)
3. Phase H 着手 (wasm + charts + hooks)、Phase R framework 上で

## 並行進行している project

- **pure-calculation-reorg** (active overlay): 本 project の `calculationCanonRegistry` を Phase D-W1 で touch 済、影響なし
- **phased-content-specs-rollout** (Phase A〜J 完遂、2026-04-28): 本 project Phase B の reference 実装供給元として機能、handoff は完了

## 関連リンク

- North Star: `plan.md §0`
- 設計思想: `plan.md §3`
- 撤退規律: `references/01-principles/canonicalization-principles.md §P9`
- 後続 project: `projects/integrity-framework-evolution/` (Phase R + H + I)
- ground truth: `projects/integrity-framework-evolution/derived/quality-review.md`
