# AI_CONTEXT — widget-context-boundary（SP-A）

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

widget / ctx 型境界再構築（widget-context-boundary）

## Purpose

umbrella `architecture-debt-recovery` の **Lane A** sub-project として、**widget と ctx の型境界**を再構築する。具体的には:

- `UnifiedWidgetContext` から **page-local optional 5 field を剥離**（insightData / costDetailData / selectedResults / storeNames / onCustomCategoryChange）
- `UnifiedWidgetContext` の Dashboard 固有 20 optional を **DashboardWidgetContext に required 集約**
- **`WidgetDef` 同名 2 型**を `DashboardWidgetDef` / `UnifiedWidgetDef` に分離
- `StoreResult` / `PrevYearData` の **discriminated union 化**（core required field への null check 解消）

全 45 widget に影響する最重量級 sub-project。

## Parent / 文脈継承

- **parent**: `architecture-debt-recovery`
- **上位規律**: umbrella plan.md §2 不可侵原則 16 項 / §4 4 ステップ pattern
- **入力**: umbrella `inquiry/15 §Lane A` 4 ADR（A-001〜A-004）/ `inquiry/16 §BC-1〜BC-4` / `inquiry/17 §LEG-001〜LEG-008` / WSS 45 widget spec（全て `references/05-contents/widgets/WID-001〜WID-045.md`）

## Scope

### 対象

- **ADR-A-001**: UnifiedWidgetContext から page-local optional 5 field 剥離（BC-1）
- **ADR-A-002**: Dashboard 固有 20 field を DashboardWidgetContext に required 集約（BC-2）
- **ADR-A-003**: WidgetDef 2 型を DashboardWidgetDef / UnifiedWidgetDef に分離（BC-3）
- **ADR-A-004**: StoreResult / PrevYearData discriminated union 化（BC-4）

### 対象外

- SP-B / SP-C / SP-D の item
- `@widget-id WID-NNN` JSDoc 注入（WSS 体系は Phase 6 別 project で扱う）
- Budget Simulator informed-by R4 の specific cleanup（関連する ADR に吸収済み、umbrella inquiry/19 参照）

## 成功条件

umbrella `inquiry/17 §再発防止規約 5` に従い:

1. 4 ADR × 4 step = **16 PR** 完遂
2. LEG-001〜LEG-008 の 8 legacy item の `sunsetCondition` 達成
3. `consumerMigrationStatus: migrated` 到達
4. 以下 4 guard の baseline=0:
   - `unifiedWidgetContextNoPageLocalOptionalGuard`
   - `unifiedWidgetContextNoDashboardSpecificGuard`
   - `sameInterfaceNameGuard`
   - `coreRequiredFieldNullCheckGuard`

## 制約

- 全 45 widget に影響する重量級。各 step で**回帰 visual / E2E 検証**（umbrella plan.md §8 #20）
- BC-1〜BC-4 は連続 merge 禁止（rollback 境界の明確化）
- 45 WSS spec（WID-001〜045）の `lastVerifiedCommit` を各 PR で更新する運用（Phase 6 WSS generator 未実装のため手動、将来 Phase 6 に別 project で自動化）

## Read Order

1. CLAUDE.md
2. `projects/architecture-debt-recovery/AI_CONTEXT.md`
3. `projects/architecture-debt-recovery/plan.md §2-4`
4. `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane A`
5. `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-1〜BC-4`
6. `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001〜LEG-008`
7. `projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md §C-02/C-05/C-10/C-11`（WSS concern 連結 map）
8. 本 project の `HANDOFF.md` / `plan.md` / `checklist.md`
9. `references/05-contents/widgets/WID-001〜WID-045.md`（該当 widget の現状把握）

## 関連

- umbrella: `projects/architecture-debt-recovery/`
- sibling: `projects/duplicate-orphan-retirement/` / `projects/aag-temporal-governance-hardening/`
- 後続（Wave 2 で spawn 予定）: SP-B `widget-registry-simplification`（本 project completed 後に spawn、umbrella `inquiry/18 §SP-B` / `inquiry/21 §W2-B` 参照）
- informed-by: `projects/completed/budget-achievement-simulator/`（reboot で表面化した 2 WidgetDef 型 + ctx 非対称が起点）
