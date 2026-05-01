# projectization — aag-rule-schema-meta-guard

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | governance-hardening |
| `implementationScope` | `["app-domain/gross-profit/rule-catalog/base-rules.ts", "app/src/test/aag-core-types.ts", "app/src/test/architectureRules/types.ts", "app/src/test/architectureRules/merged.ts", "app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts", "app/src/test/guards/canonicalDocBackLinkGuard.test.ts", "app/src/test/guards/semanticArticulationQualityGuard.test.ts", "app/src/test/guards/statusIntegrityGuard.test.ts"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

### なぜ Level 3 か

- schema 拡張 (`SemanticTraceBinding<T>` 型 family + `canonicalDocRef` + `metaRequirementRefs` field) = 1 sprint で完遂可能
- 166 既存 rule への initial value 装着 + Phase 6 binding 記入 = 大量だが mechanical
- 4 meta-guard MVP 実装 = governance-hardening の典型
- 推定 commit 数: 10-15 commits、人間承認必須 → Level 3

### なぜ governance-hardening か

新 field 追加 + 新 guard 4 件の機械検証導入は **AAG governance を hardening する** 性質。
docs-only ではなく実装変更を伴うが、business logic 変更ではない。

### なぜ breakingChange = false か

- 新 field (`canonicalDocRef` / `metaRequirementRefs`) は **optional** で導入
- 既存 RuleBinding consumer は backward 互換を維持
- 既存 166 rule の `binding` field 構造は不変 (新 field は merge で追加)
- 既存 guard / test は破壊しない

### なぜ requiresGuard = true か

本 project の主要 deliverable に **新 meta-guard 4 件** が含まれる:
- `canonicalDocRefIntegrityGuard.test.ts`
- `canonicalDocBackLinkGuard.test.ts`
- `semanticArticulationQualityGuard.test.ts`
- `statusIntegrityGuard.test.ts`

これらは AAG bidirectional integrity の forward / reverse 機械検証を担う AR-rule。

### なぜ requiresLegacyRetirement = false か

既存 schema を撤退しない (新 field の追加のみ)。`defaults.ts` / `guardCategoryMap.ts` は不変。

### なぜ requiresHumanApproval = true か

- 166 rule binding 記入の品質は機械検証 + 人間 review の併用が必要 (semantic articulation の意味品質)
- 新 meta-guard 4 件は AAG governance の根幹に直結
- Phase 5 follow-up scope の articulate も人間判断 (sub-audit 配置先の決定)

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 3 必須 |
| `HANDOFF.md` | required | Level 3 必須 |
| `plan.md` | required | Level 3 必須 |
| `checklist.md` | required | Level 3 必須 |
| `inquiry/` | optional | 親 project Phase 3 audit を継承、本 project では新規 inquiry なし |
| `breaking-changes.md` | forbidden | breakingChange = false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement = false |
| `sub-project-map.md` | optional | 単独 project (本 project 自身が parent project の sub-project) |
| guard 設計 (plan.md 内) | required | requiresGuard = true (新 meta-guard 4 件) |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval = true |

## 4. やらないこと (nonGoals)

- **AAG Core doc content refactor** (`aag/` 配下 doc Create / Split / Rewrite) → **Project A 所掌**
- **DFR (Display-Focused Rule) registry 構築** → **Project C 所掌**
- **複雑 legacy archive 案件** → **Project D 所掌**
- **業務ロジック / domain calculation の変更**
- **`defaults.ts` (execution overlay) への semantic binding 追加** → 二重正本回避
- **`guardCategoryMap.ts` への semantic binding 追加** → 二重正本回避
- **Phase 8 MVP scope 外の sub-audit 実装** (4.1 境界 / 4.3 波及 / 4.5 機能性 / selfHostingGuard / metaRequirementBindingGuard) → **follow-up project に逃がす**
- **`principleRefs` の semantic 化 (本 project に含めるか別 sprint かは Phase 1 着手時に判断)** → Phase 1 判断で別 sprint なら nonGoal、含めるなら scope に追加

## 5. Escalation / De-escalation 条件

- **escalate to Level 4**: Phase 3 binding 記入で 166 rule の品質が想定以上の review 工数を要求した場合 (Phase 6 に分割移管 → 別 project spawn)
- **de-escalate to Level 2**: 想定より rule 数が少ない / binding 記入が機械化可能と判明した場合 (考えにくい)
- **scope 越境発覚**: Project A の新 doc path が確定する前に Phase 3 着手が必要になった場合 → Project A 進捗確認 → 不可能なら本 project Phase 3 を Project A 完了後に保留

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-30 | 初期判定 (Level 3) | 親 project の Phase 3 hard gate B 確定により Project B として spawn (Phase 2 + Phase 6 + Phase 8 MVP、推定 commit 10-15 件) |
