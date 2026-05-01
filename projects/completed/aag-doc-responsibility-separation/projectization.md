# projectization — aag-doc-responsibility-separation

> 役割: AAG-COA 判定結果。

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 2 (Standard Project) |
| `changeType` | governance-hardening |
| `implementationScope` | `[]`（doc 責務分離のみ、code 変更なし） |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false |
| `requiresHumanApproval` | true（Phase 5 判断 gate + 最終レビュー） |

## 2. 判定理由

本 project は AAG 関連 doc の責務再分離 umbrella であり、5 Phase 構造を持つ。

- **Level 1 ではない理由**: 5 Phase の coordination が必要、複数 doc の split / refresh /
  judgment gate を含み、軽量構造では articulate しきれない
- **Level 3+ ではない理由**: 新規原則制定なし / breaking change なし / inquiry/ 不要 /
  guard 設計なし。governance-hardening として規模は中程度
- **`requiresHumanApproval = true`**: Phase 5 (meta.md split 判断) が人間判断、最終レビュー
  checkbox が gate

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | (D1) |
| `HANDOFF.md` | required | (D1) |
| `plan.md` | required | 5 Phase 構造 + 不可侵原則 |
| `checklist.md` | required | (D1) |
| `inquiry/` | forbidden | Level 2 で不要、AAG 関連 doc の現状把握は inventory Phase 1 で十分 |
| `breaking-changes.md` | forbidden | breakingChange = false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement = false |
| `sub-project-map.md` | forbidden | sibling `aag-decision-traceability` は独立、map 不要 |
| guard 設計 (plan.md 内) | forbidden | requiresGuard = false |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval = true |

## 4. やらないこと (nonGoals)

- 実装層 (app/src/) の構造変更 (本 project は doc 責務分離のみ)
- meta.md → audit.md の実分割 (Phase 5 は判断のみ、実施は escalate or 別 project)
- AAG framework architecture 自体の変更 (`aag-bidirectional-integrity` 完遂時点を維持)
- inbound 参照を未更新で残す split / move (不可侵原則 1)
- archived doc に live future work を書き戻す (不可侵原則 3)

## 5. Escalation / De-escalation 条件

- Phase 5 判断結果が「meta.md → audit.md を split する」で、本 project 内で実施する選択肢を
  人間が選んだ場合 → Level 3 に escalate (architecture-refactor 化、breaking change 検討)
- Phase 3 split で予期せぬ inbound co-change が大規模に必要と判明 → 既に Level 2 範囲
  (escalate 不要)
- Phase 4 refresh のみで本 project が完結する状態に縮約 → 通常起きない
  (Phase 3 split が中規模 work のため)

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-01 | 初期判定 (Level 2 / governance-hardening) | AAG 関連 doc 責務再分離 umbrella、5 Phase 構造、`aag-bidirectional-integrity` 完遂後の self-consistency 回復 |
