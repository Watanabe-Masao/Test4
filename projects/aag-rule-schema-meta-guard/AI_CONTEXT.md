# AI_CONTEXT — aag-rule-schema-meta-guard

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG rule schema 拡張 + AR-rule binding + meta-guard MVP (`aag-rule-schema-meta-guard`)

## Status

**active (2026-04-30 spawn、Project B bootstrap 完了)**。

- **2026-04-30 spawn**: 親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (Project A〜D 分割) を受けて、**Phase 2 (AR-rule schema 拡張) + Phase 6 (AR-rule binding) + Phase 8 MVP (meta-guard 4.2 + 4.4)** を Project B として独立 spawn
- **依存関係**: Project A (AAG Core doc refactor) → 本 project (binding 対象 = AAG Core doc が安定後) → Project C (DFR registry)
- **次工程**: Phase 1 着手 (`SemanticTraceBinding<T>` 型 family の実装、新 doc に依存しない型定義から開始可能)

canonical 計画 doc は本 project の `plan.md`。親 project: `projects/aag-bidirectional-integrity/`。

## Purpose

AAG (Adaptive Architecture Governance) の **bidirectional integrity** (= forward 設計 doc → 機械検証 / reverse AR-rule → 製本) を実現するため、AR-rule schema に **semantic articulation 構造** を追加し、166 既存 rule の binding を記入し、**meta-guard MVP** で機械検証する。

主要 deliverable:
1. `SemanticTraceBinding<T>` 型 family (`pending` / `not-applicable` / `bound`) を `architectureRules/types.ts` (or `aag-core-types.ts`) に追加
2. `RuleBinding` 型に `canonicalDocRef` + `metaRequirementRefs` を追加
3. `app-domain/gross-profit/rule-catalog/base-rules.ts` 全 166 rule に initial value `{ status: 'pending', refs: [] }` を articulate
4. Phase 6 で各 rule の `status` を `bound` に flip (binding 記入)
5. Phase 8 MVP で 4 meta-guard を実装 (canonicalDocRefIntegrity / canonicalDocBackLink / semanticArticulationQuality / statusIntegrity)

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力）
5. 親 project の `projects/aag-bidirectional-integrity/plan.md` §3.4 (SemanticTraceBinding 設計の正本)
6. 親 project の `projects/aag-bidirectional-integrity/breaking-changes.md` §1.2 (AAG rule schema 拡張の articulate 詳細)
7. 親 project の `references/01-principles/aag/meta.md` §2 (12 AAG-REQ-* requirement = `metaRequirementRefs.refs[].requirementId` の供給元)
8. Project A (`projects/aag-core-doc-refactor/`) の plan + HANDOFF (= `canonicalDocRef.refs[].docPath` の供給元)

## Why this project exists

親 project の Phase 3 hard gate (= 「Phase 4〜10 を単一 project で継続するか分割するか」) で、**B (sub-project / follow-up project 分割) が確定** (AI 推奨 + ユーザー確認、2026-04-30):

- Phase 6 既存 166 rule binding は ratchet-down で漸次対応する設計だが、scope creep の risk が現実的
- Phase 8 MVP (4.2 Direction + 4.4 Completeness) を超えた sub-audit は別 project に逃がす方針
- Phase 2 schema 拡張 + Phase 6 binding + Phase 8 MVP は AAG Core doc refactor (Project A) と orthogonal な技術的責務

本 project は **schema 拡張 + binding + meta-guard MVP** に scope を絞った Level 3 project。Project A (doc refactor) / Project C (DFR registry) / Project D (拡張 legacy retirement) とは scope orthogonal。

## Scope

**含む**:
- `SemanticTraceBinding<T>` 型 family の実装 (`architectureRules/types.ts` or `aag-core-types.ts`)
- `RuleBinding` 型への `canonicalDocRef` + `metaRequirementRefs` field 追加
- `base-rules.ts` 全 166 rule の initial value 装着 (`{ status: 'pending', refs: [] }`)
- Phase 6: 各 rule の binding 記入 (status: pending → bound or not-applicable)
- Phase 8 MVP: 4 meta-guard 実装
  - `canonicalDocRefIntegrityGuard.test.ts` (forward direction 検証)
  - `canonicalDocBackLinkGuard.test.ts` (reverse direction 検証)
  - `semanticArticulationQualityGuard.test.ts` (品質基準: hard fail = 禁止 keyword + 20 文字 minimum + 重複検出 + status 整合性 + path 実在)
  - `statusIntegrityGuard.test.ts` (status field の整合性検証)

**含まない** (= nonGoals):
- AAG Core doc content refactor (`aag/` 配下 doc Create / Split / Rewrite) → **Project A 所掌**
- DFR (Display-Focused Rule) registry 構築 → **Project C 所掌**
- 複雑 legacy archive 案件 → **Project D 所掌**
- 業務ロジック / domain calculation / app/src 配下のコード変更
- `defaults.ts` (execution overlay) への semantic binding 追加 (二重正本回避、PR review Review 3 P0 #1 反映)
- `guardCategoryMap.ts` への semantic binding 追加 (二重正本回避)
- Phase 8 MVP scope 外の sub-audit (4.1 境界 / 4.3 波及 / 4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard) → **follow-up project に逃がす**

## 関連文書

| 文書 | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/plan.md` | 親 project の正本 (§3.4 SemanticTraceBinding 設計、§Phase 2 / 6 / 8 articulation の出元) |
| `projects/aag-bidirectional-integrity/breaking-changes.md` | 親 project の breaking-changes §1.2 (AAG rule schema 拡張の articulate 詳細) |
| `references/01-principles/aag/meta.md` | AAG Meta charter (12 AAG-REQ-* requirement = `metaRequirementRefs` の供給元) |
| `projects/aag-core-doc-refactor/plan.md` | Project A の正本 (新 doc path = `canonicalDocRef` の供給元) |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (本 project の主要 implementation 対象) |
| `app/src/test/aag-core-types.ts` / `architectureRules/types.ts` | 型定義 (SemanticTraceBinding 追加先) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
| `references/03-guides/projectization-policy.md` | AAG-COA Level 3 判定の根拠 |
