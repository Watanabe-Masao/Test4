# breaking-changes — widget-context-boundary

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md`
> の **BC-1 / BC-2 / BC-3 / BC-4** が正本。本文書はその local view。

## 対象破壊的変更

| ID | 対象 | 破壊内容 | ADR | 状態 |
|---|---|---|---|---|
| **BC-1** | `UnifiedWidgetContext` | page-local optional 5 field 剥離（`insightData` / `costDetailData` / `selectedResults` / `storeNames` / `onCustomCategoryChange`） | ADR-A-001 PR4 | ✅ landed |
| **BC-2** | `UnifiedWidgetContext` | Dashboard 固有 20 field 削除 + `DashboardWidgetContext` required 集約で置換 | ADR-A-002 PR4 | ✅ landed (11 field 削除 / 9 cross-page 共有を残置) |
| **BC-3** | `WidgetDef` | 同名 2 型を `DashboardWidgetDef` / `UnifiedWidgetDef` に分離 | ADR-A-003 PR4 | ✅ landed |
| **BC-4** | `StoreResult` / `PrevYearData` | core required field への null check 解消のため discriminated union 化。`WidgetContext.result/prevYear` を slice 化、`RenderUnifiedWidgetContext` を新設して chokepoint narrowing で widget 本体は不変 | ADR-A-004 PR3-4 | ✅ landed（PR3: chokepoint narrowing / PR4: guard baseline=0 + dead null check 除去 + JSDoc 整備） |

## 運用規約

- **1 PR = 1 BC**（umbrella plan.md §2 #3 + 本 project plan.md §不可侵原則 #2）
- **BC-1〜BC-4 は連続 merge 禁止、間に他作業を挟む**（本 project plan.md §不可侵原則 #4）
- **guard 先行**（umbrella plan.md §2 #7）
  - BC-1: `unifiedWidgetContextNoPageLocalOptionalGuard` baseline=5
  - BC-2: `unifiedWidgetContextNoDashboardSpecificGuard` baseline=20
  - BC-3: `sameInterfaceNameGuard` baseline=1
  - BC-4: `coreRequiredFieldNullCheckGuard` baseline=2 (WID-031, WID-033)
- **新型 alias を並行導入 → consumer 移行 → 旧 alias 削除**（4 step pattern）
- **consumer 移行 PR（PR3）は複数 batch に分け、各 batch で visual / E2E 回帰検証**
  （本 project plan.md §不可侵原則 #3）

## 想定影響範囲

- **runtime 動作**: **不変**（umbrella plan.md §2 #1 現実保護原則）
- **45 widget**: 全 widget が context 切替 / WidgetDef rename / 新型への参照更新で影響
  - INSIGHT 6 widget / COST_DETAIL 4 widget / CATEGORY 2 widget → page-specific ctx
  - Dashboard 29 widget → DashboardWidgetContext
- **型チェック**: 新旧型 alias の並行期間中は `@ts-expect-error` なしで両型コンパイル可能

## rollback plan

- 各 BC の PR4（旧 alias / 旧 shape 削除）を revert → 旧型が復帰
- PR3（consumer 移行）を revert すると新型と旧 consumer が混在し型破壊 →
  PR4 → PR3 → PR2 の順で段階 revert 必要
- rollback 境界は **1 ADR 単位**。ADR 間の rollback は独立

詳細は umbrella `inquiry/16-breaking-changes.md §BC-1〜§BC-4` を参照。
