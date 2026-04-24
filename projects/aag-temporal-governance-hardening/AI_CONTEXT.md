# AI_CONTEXT — aag-temporal-governance-hardening（SP-D）

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG / Temporal Governance 強化（aag-temporal-governance-hardening）

## Purpose

umbrella `architecture-debt-recovery` の **Lane D** sub-project として、「rule に時計を持たせる」 + 「allowlist に metadata を持たせる」 + 「G8 を内部行数に拡張」 + 「@deprecated に sunset を持たせる」 + 「remediation 進捗を generated health に出す」 + 「project phase gate を guard で止める」の 6 方向で governance を強化する。

## Parent / 文脈継承

- **parent**: `architecture-debt-recovery`（umbrella。2026-04-23 Phase 6 Wave 1 で spawn）
- **上位規律**: umbrella plan.md §2 不可侵原則 16 項 / §10 運用規律
- **入力**: umbrella `inquiry/15 §Lane D` 6 ADR（D-001〜D-006）、`inquiry/16 §BC-6/BC-7`、`inquiry/14 §R-6`（Temporal Governance reformulate）

## Scope

### Wave 1 で着手（本 spawn 時点）
- **ADR-D-001**: reviewPolicy required 昇格 + 92 件 bulk 整備（BC-6）
- **ADR-D-002**: allowlist entry metadata 必須化（BC-7）
- **ADR-D-005**: generated architecture-debt-recovery-remediation.{md,json} 追加
- **ADR-D-006**: projectDocConsistencyGuard 追加

### Wave 2-3 で着手（後続）
- ADR-D-004: @deprecated metadata 必須（SP-C ADR-C-004 follow-through、SP-C completed 後）
- ADR-D-003: G8 P20/P21 追加（SP-B completed 後）

### 対象外

- 他 Lane（SP-A / SP-B / SP-C）の item
- 本 ADR 6 件に載らない governance 強化（新規は `15a-*.md` addendum で umbrella 側承認後）

## 成功条件

umbrella `inquiry/17 §再発防止規約 5` に従い:

1. 6 ADR × 3-4 step 完遂（合計 ~19 PR、Wave ごとに区切り）
2. 関連 legacy item なし（本 project は governance 強化のみで legacy 撤退ではない）
3. 以下 5 guard の baseline 到達:
   - `reviewPolicyRequiredGuard` baseline 92 → 0
   - `allowlistMetadataGuard` baseline existing → 0
   - `deprecatedMetadataGuard` baseline current → 0（Wave 2）
   - `responsibilitySeparationGuard` (P20/P21) baseline → 上限値（Wave 3）
   - `projectDocConsistencyGuard` baseline 0 fixed

## 制約

- BC-6 / BC-7 は type required 昇格の破壊的変更。umbrella inquiry/16 §BC-6/BC-7 の rollback 手順遵守
- **1 PR = 1 破壊的変更**
- 6 ADR × 3-4 step を厳守

## Read Order

1. CLAUDE.md
2. `projects/architecture-debt-recovery/AI_CONTEXT.md`
3. `projects/architecture-debt-recovery/plan.md §2-4`
4. `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane D`
5. `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-6 / §BC-7`
6. `projects/architecture-debt-recovery/inquiry/14-rule-retirement-candidates.md §R-6`
7. 本 project の `HANDOFF.md` / `plan.md` / `checklist.md`

## 関連

- umbrella: `projects/architecture-debt-recovery/`
- sibling: `projects/duplicate-orphan-retirement/` / `projects/widget-context-boundary/`
- 参照実装: `projects/completed/budget-achievement-simulator/aag/execution-overlay.ts`（reviewPolicy overlay 例）
