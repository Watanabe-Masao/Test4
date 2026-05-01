# HANDOFF — aag-rule-schema-meta-guard

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 4 全完遂 (2026-05-01、4 meta-guard MVP 実装 + 134 file 901 test PASS)**。

親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (= Project A〜D 分割) を
受けて、**Phase 2 (AR-rule schema 拡張) + Phase 6 (binding 記入) + Phase 8 MVP (meta-guard 4 件)** を
本 project に独立 spawn。Phase 1〜4 完遂で型基盤 / 全 rule 初期化 / 品質基準 protocol / 166 rule 全
bound / 4 meta-guard 機械検証が landing、**Project B MVP scope 完遂状態**に到達。次は Phase 5
(ratchet-down 整備 + follow-up scope articulate) または最終レビュー (人間承認) → Project C
(DFR registry) unblock。

| 項目                                                | 状態                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| project bootstrap (skeleton 5 doc)                  | ✅ 完了                                                                  |
| 親 project MVP scope                                | ✅ 完遂                                                                  |
| 親 project Phase 3 hard gate                        | ✅ B 確定                                                                |
| Project A bootstrap + 全 Phase + archive            | ✅ 完遂 (commit `cf8d995`)                                               |
| Project D Phase 1 + archive (case B)                | ✅ 完遂 (commit `aaffaf7`)                                               |
| 本 project Phase 1 (型定義)                         | ✅ 完遂 (commit `e7b5330`、5 型 + 2 binding field landing)               |
| 本 project Phase 2 (166 rule に initial value 装着) | ✅ 完遂 (commit `f8c16b6`、`grep -c canonicalDocRef = 166` + 同 metaReq) |
| 本 project Phase 3 batch 1 (5 rule + protocol)      | ✅ 完遂 (commit `0772fa4`、5 rule 人手 articulate + protocol landing)    |
| 本 project Phase 3 batch 2 (5 rule、残 slice)       | ✅ 完遂 (commit `5c6aca1`、5 rule 人手 articulate)                       |
| 本 project Phase 3 batch 3 (残 156 rule、全 bound)  | ✅ 完遂 (commit `8f62877`、Python synthesizer で 156 rule 一括 bound)    |
| 本 project Phase 3 MVP (完遂条件達成)               | ✅ `pending` 0 件 / `bound` 332 件 (= 166 × 2)                           |
| **本 project Phase 4 (meta-guard MVP 4 件実装)**    | ✅ **完遂** (本 commit、4 guard 7 test PASS、134 file 901 test PASS)     |
| 本 project Phase 5 (ratchet-down + follow-up scope) | ⏳ 未着手 (本 commit 後、最終レビュー前の任意 phase)                     |
| 本 project 最終レビュー (人間承認)                  | ⏳ 待ち                                                                  |

### Phase 1 deliverable

- `app/src/test/aag-core-types.ts` (Core 層) に SemanticTraceBinding 型 family 5 件を landing:
  - `TraceBindingStatus = 'pending' | 'not-applicable' | 'bound'` (status field、空配列との明示的差別化)
  - `SemanticTraceRef` (`problemAddressed` + `resolutionContribution` の必須対、AAG-REQ-ANTI-DUPLICATION の構造的強制)
  - `CanonicalDocTraceRef extends SemanticTraceRef` (`docPath` 追加)
  - `MetaRequirementTraceRef extends SemanticTraceRef` (`requirementId` 追加)
  - `SemanticTraceBinding<TRef extends SemanticTraceRef>` (`status` + `justification?` + `refs[]` の三位一体)
- `app/src/test/architectureRules/types.ts` (App Domain 層) に `RuleBinding` 拡張:
  - `canonicalDocRef?: SemanticTraceBinding<CanonicalDocTraceRef>` (forward direction、実装 → 設計 doc binding)
  - `metaRequirementRefs?: SemanticTraceBinding<MetaRequirementTraceRef>` (reverse direction、実装 → 要件 binding)
- `architectureRules/index.ts` barrel に 5 型を re-export
- `architectureRulesMergeSmokeGuard.test.ts` に type-level smoke test 1 件追加 (barrel 経由 type access 検証)
- 検証: build PASS / lint 0 errors / test:guards 130 file 894 test PASS / docs:check Hard Gate PASS

### 親 project からの継承事項

本 project は親 plan §3.4 SemanticTraceBinding 設計 + §Phase 2 / 6 / 8 articulation を継承。
詳細概念定義は親 plan を正本とし、本 project では operational plan に絞る。

入力 doc:

- `projects/aag-bidirectional-integrity/plan.md` §3.4 (SemanticTraceBinding 設計の正本)
- `projects/aag-bidirectional-integrity/breaking-changes.md` §1.2 (AAG rule schema 拡張の articulate 詳細)
- `references/01-principles/aag/meta.md` §2 (12 AAG-REQ-\* requirement = `metaRequirementRefs` の供給元)
- `projects/completed/aag-core-doc-refactor/plan.md` (Project A 正本、`canonicalDocRef.refs[].docPath` の供給元)

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先 (Phase 1 = 型定義)

- `app/src/test/aag-core-types.ts` (or `architectureRules/types.ts`) に `SemanticTraceBinding<T>` 型
  family + `CanonicalDocTraceRef` + `MetaRequirementTraceRef` を追加
- `RuleBinding` 型に `canonicalDocRef?` + `metaRequirementRefs?` を optional 追加
- tsc -b PASS + 既存全 guard PASS 確認

### 中優先 (Phase 2-3 = initial value 装着 + binding 記入)

- `app-domain/gross-profit/rule-catalog/base-rules.ts` 全 166 rule に `{ status: 'pending', refs: [] }` 装着
- Project A 完了後 (新 doc path 安定後) に各 rule の binding 記入 (status: pending → bound or not-applicable)

### 低優先 (Phase 4-5 = meta-guard MVP + follow-up articulate)

- 4 meta-guard 実装 (canonicalDocRefIntegrity / canonicalDocBackLink / semanticArticulationQuality / statusIntegrity)
- 残 sub-audit (4.1 / 4.3 / 4.5 / selfHosting / metaRequirementBinding) を follow-up project に articulate

## 3. ハマりポイント

### 3.1. 二重正本回避 — defaults.ts / guardCategoryMap.ts に touch しない

`canonicalDocRef` / `metaRequirementRefs` の正本は **`base-rules.ts` のみ**。`defaults.ts` (execution
overlay) や `guardCategoryMap.ts` に同 field を持たせると二重正本となり、整合性 guard が失敗する
(plan 不可侵原則 1)。PR review Review 3 P0 #1 + P1 #4 反映の絶対原則。

### 3.2. 新 field は optional、required にしない

既存 `RuleBinding` consumer (`merged.ts` 経由) の backward 互換を維持するため、新 field は **optional**
で導入する。required にすると 166 rule の即時 fill が必須となり Phase 1 で完了不可能 (plan 不可侵原則 2)。

### 3.3. status field 必須 — 空配列で済まさない

「未対応 (pending)」と「適用外 (not-applicable)」は意味が orthogonal。空配列 (`refs: []`) のみで status を
持たせないと、後続の Phase 6 / 8 で「この rule は未着手か / 適用外か」の判定不能 (plan 不可侵原則 3)。
`{ status: 'pending', refs: [] }` で初期化、`{ status: 'not-applicable', justification: '...', refs: [] }` で
適用外を articulate。

### 3.4. Phase 3 binding 記入は Project A 完了 dependence

`canonicalDocRef.refs[].docPath` は Project A の新 doc (`aag/strategy.md` 等) を指す。Project A の Phase 1〜2
完了 (新 doc 安定状態) 前に Phase 3 を全数着手すると、新 doc path 確定後の update が多発する
(plan 不可侵原則 6)。Phase 1〜2 (型定義 + initial value) は Project A 進行中でも独立着手可能。

### 3.5. Phase 8 MVP scope 厳守 — 残 sub-audit を本 project で実装しない

本 project Phase 8 (= 親 plan Phase 8 MVP) は **4 meta-guard のみ**。残 sub-audit (4.1 境界 / 4.3 波及 /
4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard) は別 project に逃がす方針が親 plan で確定済。
本 project で実装すると scope creep + Level 3 → Level 4 escalate (plan 不可侵原則 5)。

### 3.6. semantic articulation 品質基準

`canonicalDocRef.refs[].problemAddressed` + `resolutionContribution` の文字列に **20 文字 minimum**、禁止
keyword (TBD / N/A / same / see above 等) 検出、重複検出、status 整合性、path 実在を `semanticArticulationQualityGuard`
で hard fail 機械検証する。意味的「それっぽい空文」は機械では判定せず、Discovery Review (人間レビュー) で補完。

## 4. 関連文書

| ファイル                                                        | 役割                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `projects/aag-bidirectional-integrity/plan.md`                  | 親 project の正本 (§3.4 SemanticTraceBinding / §Phase 2 / 6 / 8)       |
| `projects/aag-bidirectional-integrity/breaking-changes.md`      | 親 project の breaking-changes §1.2 (schema 拡張の articulate 詳細)    |
| `references/01-principles/aag/meta.md`                          | AAG Meta charter (`metaRequirementRefs.refs[].requirementId` の供給元) |
| `projects/completed/aag-core-doc-refactor/plan.md`              | Project A 正本 (`canonicalDocRef.refs[].docPath` の供給元)             |
| `app-domain/gross-profit/rule-catalog/base-rules.ts`            | BaseRule 物理正本 (本 project の主要 implementation 対象)              |
| `app/src/test/aag-core-types.ts` / `architectureRules/types.ts` | 型定義 (SemanticTraceBinding 追加先)                                   |
| `references/03-guides/project-checklist-governance.md`          | 本 project の運用ルール                                                |
| `references/03-guides/deferred-decision-pattern.md`             | 途中判断 checklist の制度 doc                                          |
