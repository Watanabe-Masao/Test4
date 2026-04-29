# projectization — integrity-framework-evolution

> 役割: AAG-COA 判定結果。

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 4 |
| `changeType` | architecture-refactor |
| `implementationScope` | `["app-domain/integrity/", "app/src/test/guards/", "tools/architecture-health/", "references/", "wasm/", "app/src/presentation/components/charts/", "app/src/application/hooks/"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

**Level 4 (umbrella scope)**:

- 13 dimension review で発見された structural / institutional gap の解消は AAG framework の根幹に touch
- Phase R (6 reform) + Phase H (3 候補) + Phase I の 3 phase 構成
- 影響範囲が複数 domain (taxonomy / contentSpec / integrity) に及ぶ
- breakingChange (Phase R で schema 変更、既存 archive 移行が必要)

**architecture-refactor**:

- 既存 framework の破壊的でない再構造化 (新 schema + 既存実装の re-classification)
- 業務 logic は不変、framework の整合性 mechanism のみ強化

**implementationScope**:

- Phase R: `app-domain/integrity/` (schema 拡張) + `app/src/test/guards/` (dogfooding refactor) + `tools/architecture-health/` (collector contract 適用) + `references/` (3-zone 分類 doc 化)
- Phase H: `wasm/`, `app/src/presentation/components/charts/`, `app/src/application/hooks/` (registry+guard 整備)

**breakingChange = true**:

- archive schema (rejected[] / accepted[] / deferred[] / retired[]) が Time-axis Decision Record 統一 schema に格上げ → 既存 entry 移行
- Phase R-① で COVERAGE_MAP の表現が contract pattern に変わる → integrity-collector の再実装

**requiresLegacyRetirement = true**:

- Phase R 後に旧 schema (枠なしの ad-hoc archive 形式) を撤退
- Phase H 内で前駆 project の暫定 reference (drift 注記等) を整理

**requiresGuard = true**:

- 新 framework の自己保護 (R-① contract guard / R-⑤ artifact guard / R-⑥ dogfooding guard)
- Phase H 各 tier1 候補の guard

**requiresHumanApproval = true**:

- framework reset の境界確定 (どこまで R で済ませ、どこから第 5 の柱に handoff するか)
- Phase R 完了 → Phase H 着手の transition

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | scope + read order の入口 |
| `HANDOFF.md` | required | progress 同期 |
| `plan.md` | required | 3 phase 構造の正本 |
| `checklist.md` | required | completion 判定 |
| `inquiry/` | optional | Phase R の各 reform で必要に応じて |
| `breaking-changes.md` | required | schema 変更の影響を後続 project に伝える |
| `legacy-retirement.md` | required | 旧 schema 撤退記録 |
| `sub-project-map.md` | optional | 第 5 の柱との関係を示す場合 |
| guard 設計 (plan.md 内) | required | Phase R-⑤/R-⑥ の guard 設計 |

## 4. nonGoals

- **§P8/§P9 の修正**: 拡張は可、変更不可 (前駆 project の不変な成果)
- **業務 logic 変更**: registry+guard 整備のみ
- **active overlay 自動切替**: 人間判断、Phase R 完了後に検討
- **第 5 の柱 (Project Lifecycle Governance)**: 本 project scope 外、後続 project へ
- **13 dimension review の deferred 項目**: ID-1 warnAt / Z-4 mechanicalSignal 等は scope 外
