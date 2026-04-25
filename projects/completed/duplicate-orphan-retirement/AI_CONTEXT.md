# AI_CONTEXT — duplicate-orphan-retirement（SP-C）

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

複製 / orphan 撤退（duplicate-orphan-retirement）

## Purpose

umbrella project `architecture-debt-recovery` の **Lane C** sub-project として、`features/*/ui/widgets.tsx` の byte-identical 複製 / `useCostDetailData` の 2 箇所並存 / Tier D orphan 3 件 / barrel re-export metadata 未設定群 を**出口まで詰めて撤退**する。

## Parent / 文脈継承

- **parent**: `architecture-debt-recovery`（umbrella。2026-04-23 Phase 6 Wave 1 で spawn）
- **上位規律**: plan.md §2 不可侵原則 16 項 / §4 4 ステップ pattern / §10 運用規律
- **入力**: umbrella の `inquiry/15-remediation-plan.md` の Lane C 4 ADR（C-001〜C-004）/ `inquiry/16-breaking-changes.md` BC-5 / `inquiry/17-legacy-retirement.md` LEG-010〜LEG-015

## Scope

### 対象

- **ADR-C-001**: `features/{category,cost-detail,reports}/ui/widgets.tsx` 3 件 byte-identical 複製 → barrel re-export 化 or 削除
- **ADR-C-002**: `useCostDetailData` の features / pages 並存 → features 版単一正本化
- **ADR-C-003**: Tier D orphan 3 件（`DowGapKpiCard` / `PlanActualForecast` / `RangeComparison`）削除 + `RangeComparison.styles.ts` barrel re-export 除去（**BC-5 破壊的変更**）
- **ADR-C-004**: barrel re-export に `@sunsetCondition` + `@expiresAt` + `@reason` metadata 必須化（R-7 reformulate）

### 対象外

- 他 Lane（SP-A / SP-B / SP-D）の item
- 本 ADR 4 件に載らない複製 / orphan（新規発見は `17a-*.md` addendum で追加承認後に scope 拡張）
- umbrella の Phase 4 で確定されなかった file の削除

## 成功条件

umbrella `inquiry/17 §再発防止規約 5` に従い、以下全てを満たすこと:

1. 4 step pattern 完遂（新実装 or barrel 化 / consumer 移行 / 旧実装削除 / guard 追加）
2. LEG-010〜LEG-015 の 6 legacy item の `sunsetCondition` 達成
3. `consumerMigrationStatus: migrated` 到達
4. 以下 4 guard の baseline=0（fixed mode）:
   - `duplicateFileHashGuard`
   - `hookCanonicalPathGuard`
   - `orphanUiComponentGuard`
   - `barrelReexportMetadataGuard`

## 制約

- **1 PR = 1 破壊的変更**（plan.md §2 #3）
- 4 step pattern を各 ADR でそれぞれ独立 PR（合計 ~14 PR）
- `@canonical` JSDoc で正本明示、複製側は barrel re-export のみ許容
- deletion PR は grep で consumer 0 を事前確認後にのみ実施（BC-5 rollback 手順は umbrella inquiry/16 §BC-5 参照）

## Read Order（推奨、新規参加者向け）

1. **CLAUDE.md**（プロジェクト全体の設計原則・ロール体系）
2. `projects/architecture-debt-recovery/AI_CONTEXT.md`（umbrella の why / scope / lineage）
3. `projects/architecture-debt-recovery/plan.md §2-4`（不可侵原則 + 4 ステップ pattern）
4. `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane C`（本 project の 4 ADR）
5. `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-5`（orphan 削除の破壊的変更詳細）
6. `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-010〜015`（legacy 6 件の metadata）
7. 本 project の `HANDOFF.md`（現在地 + 次にやること）
8. 本 project の `plan.md`（本 project 固有の運用規律）
9. 本 project の `checklist.md`（completion 条件）

## 関連

- umbrella: `projects/architecture-debt-recovery/`
- sibling sub-projects（Phase 6 Wave 1 並行）:
  - `projects/aag-temporal-governance-hardening/`（SP-D-partial）
  - `projects/widget-context-boundary/`（SP-A）
- informed-by: `projects/completed/budget-achievement-simulator/`（reboot 過程で表面化した複製・orphan が起点）
