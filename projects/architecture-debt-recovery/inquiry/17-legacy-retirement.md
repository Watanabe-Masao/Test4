# inquiry/17 — レガシー撤退 list + 期限 + 再発防止規約

> 役割: Phase 4 inquiry 成果物 #3。inquiry/15 の 18 改修 item の中で **「旧実装を削除して初めて完了」** となる legacy item を完全列挙し、各 legacy に必要な metadata（`oldPath` / `replacementPath` / `consumerMigrationStatus` / `deletePR` / `guardThatPreventsReintroduction` / `rollbackPath` / `deadline` / `sunsetCondition`）を記録する。
>
> plan.md §2 不可侵原則:
> - #7: 新実装のみ追加して旧実装を残した状態で sub-project completed 扱い **禁止**
> - #10: レガシーを残さない（期限なし shim 禁止、`@deprecated` 温存禁止）
>
> **本 list が空にならない限り、Phase 6 sub-project は completed にならない**。
>
> 本ファイルは immutable。Phase 5 以降で追加情報が判明しても書き換えず、`17a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `22e3830`（inquiry/16 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/15`（18 改修 item）、`inquiry/11 §B-E`（既存対策の回避経緯）、WSS 45 widget spec |

## レガシー撤退の定義（本 project 固有）

**legacy item = 以下のいずれか**:

1. 新実装が完了しても、旧実装が残存することで再発可能な API / 型 / file
2. byte-identical 複製の dead side
3. barrel re-export で参照される削除対象 .tsx / .styles.ts
4. registry 行 inline logic が presentation 層で書かれていた場合、抽出後の旧 inline 記述
5. 現行 UnifiedWidgetContext の page-local / Dashboard 固有 optional field
6. 同名 `interface WidgetDef` の並存定義片側
7. `@deprecated` / 「後で消す」comment 付きの API（本 project の範囲）

## 各 legacy item の必須 metadata

```yaml
id: LEG-<NNN>
title: <legacy の名前>
oldPath: [削除対象 path]
replacementPath: [新しい path]
consumerMigrationStatus: pending | in-progress | migrated
deletePR: <Phase 6 の PR 指定。inquiry/15 の ADR-X-NNN の PR3 or PR4>
guardThatPreventsReintroduction: <guard 名>
rollbackPath: <万一戻す場合の条件と手順>
deadline: <ISO date。plan.md の Phase 6 内部 milestone に準拠>
sunsetCondition: <この legacy が完全に消えて再発しない条件>
```

## Legacy item 完全 list

inquiry/15 の 18 ADR のうち、legacy item を生む 12 item から抽出した **15 件**の legacy item:

| 由来 ADR | id | title |
|---|---|---|
| ADR-A-001 | LEG-001 | UnifiedWidgetContext.insightData? optional |
| ADR-A-001 | LEG-002 | UnifiedWidgetContext.costDetailData? optional |
| ADR-A-001 | LEG-003 | UnifiedWidgetContext.selectedResults? / storeNames? / onCustomCategoryChange? 3 field |
| ADR-A-002 | LEG-004 | UnifiedWidgetContext Dashboard 固有 optional 20 field |
| ADR-A-003 | LEG-005 | `WidgetDef` 同名並存 interface（Dashboard 版） |
| ADR-A-003 | LEG-006 | `WidgetDef` 同名並存 interface（Unified 版） |
| ADR-A-004 | LEG-007 | `StoreResult` 旧 shape（discriminated union 化前） |
| ADR-A-004 | LEG-008 | `PrevYearData` 旧 shape |
| ADR-B-004 | LEG-009 | `buildPrevYearCostMap` helper（registryChartWidgets.tsx 内 inline） |
| ADR-C-001 | LEG-010 | `features/category/ui/widgets.tsx` byte-identical 複製 |
| ADR-C-001 | LEG-011 | `features/cost-detail/ui/widgets.tsx` byte-identical 複製 |
| ADR-C-001 | LEG-012 | `features/reports/ui/widgets.tsx` byte-identical 複製 |
| ADR-C-002 | LEG-013 | `pages/CostDetail/useCostDetailData.ts`（pages 版 hook 複製） |
| ADR-C-003 | LEG-014 | Tier D orphan 3 件（DowGapKpiCard / PlanActualForecast / RangeComparison） |
| ADR-C-004 | LEG-015 | barrel re-export 群（`@sunsetCondition` 未設定のもの） |

---

## 詳細

### LEG-001. UnifiedWidgetContext.insightData? optional

```yaml
id: LEG-001
title: UnifiedWidgetContext.insightData? optional field
oldPath:
  - app/src/presentation/components/widgets/types.ts (Insight 固有 optional field)
replacementPath:
  - app/src/presentation/pages/Insight/InsightWidgetContext.ts (required として宣言)
consumerMigrationStatus: pending
deletePR: ADR-A-001 PR4
guardThatPreventsReintroduction: unifiedWidgetContextNoPageLocalOptionalGuard (INV-J4-A)
rollbackPath: 同 file に optional field を復元 + page-specific ctx から required を optional へ
deadline: TBD（Phase 6 の milestone 依存、人間承認時に確定）
sunsetCondition: |
  (1) Insight page 全 widget（WID-032/034/035/036）が InsightWidgetContext を使う、かつ
  (2) unifiedWidgetContextNoPageLocalOptionalGuard baseline=0 が 6 ヶ月継続
```

### LEG-002. UnifiedWidgetContext.costDetailData? optional

```yaml
id: LEG-002
title: UnifiedWidgetContext.costDetailData? optional field
oldPath:
  - app/src/presentation/components/widgets/types.ts
replacementPath:
  - app/src/presentation/pages/CostDetail/CostDetailWidgetContext.ts (required)
consumerMigrationStatus: pending
deletePR: ADR-A-001 PR4
guardThatPreventsReintroduction: unifiedWidgetContextNoPageLocalOptionalGuard
rollbackPath: 同 file に復元
deadline: TBD（ADR-A-001 完了 deadline と同じ）
sunsetCondition: |
  CostDetail page 全 widget（WID-040/041/042/043）が CostDetailWidgetContext を使う、かつ
  guard baseline=0 が 6 ヶ月継続
```

### LEG-003. UnifiedWidgetContext の Category 関連 3 optional

```yaml
id: LEG-003
title: selectedResults? / storeNames? / onCustomCategoryChange? optional 3 field
oldPath:
  - app/src/presentation/components/widgets/types.ts (Category 固有 optional 3 field)
replacementPath:
  - app/src/presentation/pages/Category/CategoryWidgetContext.ts
consumerMigrationStatus: pending
deletePR: ADR-A-001 PR4
guardThatPreventsReintroduction: unifiedWidgetContextNoPageLocalOptionalGuard
rollbackPath: 復元
deadline: TBD
sunsetCondition: |
  Category page 全 widget（WID-038/039）が CategoryWidgetContext を使う、かつ guard baseline=0 継続
```

### LEG-004. UnifiedWidgetContext Dashboard 固有 optional 20 field

```yaml
id: LEG-004
title: UnifiedWidgetContext の「Dashboard 固有（他ページではオプション）」20 field
oldPath:
  - app/src/presentation/components/widgets/types.ts §88-120 (20 field)
replacementPath:
  - app/src/presentation/pages/Dashboard/widgets/DashboardWidgetContext.ts (extends UnifiedWidgetContext, required 昇格)
consumerMigrationStatus: pending
deletePR: ADR-A-002 PR3
guardThatPreventsReintroduction: unifiedWidgetContextNoDashboardSpecificGuard
rollbackPath: 復元
deadline: TBD
sunsetCondition: |
  Dashboard-local 29 widget 全件が DashboardWidgetContext を使う、かつ
  guard baseline=0 が 6 ヶ月継続
```

### LEG-005 / LEG-006. WidgetDef 2 型並存

```yaml
id: LEG-005
title: Dashboard 版 WidgetDef interface（types.ts:101）
oldPath:
  - app/src/presentation/pages/Dashboard/widgets/types.ts (interface WidgetDef)
replacementPath:
  - app/src/presentation/pages/Dashboard/widgets/types.ts (interface DashboardWidgetDef)
consumerMigrationStatus: pending
deletePR: ADR-A-003 PR4（alias 削除段階）
guardThatPreventsReintroduction: sameInterfaceNameGuard
rollbackPath: WidgetDef alias を両 file に追加で後方互換
deadline: TBD
sunsetCondition: |
  registry 10 本全てが DashboardWidgetDef / UnifiedWidgetDef を明示 import、
  guard baseline=0 が 6 ヶ月継続
```

```yaml
id: LEG-006
title: Unified 版 WidgetDef interface（components/widgets/types.ts:225）
oldPath:
  - app/src/presentation/components/widgets/types.ts (interface WidgetDef)
replacementPath:
  - app/src/presentation/components/widgets/types.ts (interface UnifiedWidgetDef)
consumerMigrationStatus: pending
deletePR: ADR-A-003 PR4
guardThatPreventsReintroduction: sameInterfaceNameGuard
rollbackPath: LEG-005 と同
deadline: TBD
sunsetCondition: LEG-005 と同
```

### LEG-007 / LEG-008. core required 旧 shape

```yaml
id: LEG-007
title: StoreResult の旧 non-discriminated shape
oldPath:
  - app/src/domain/models/storeTypes.ts (StoreResult の旧 interface)
replacementPath:
  - app/src/domain/models/StoreResult.ts (discriminated union)
consumerMigrationStatus: pending
deletePR: ADR-A-004 PR4
guardThatPreventsReintroduction: coreRequiredFieldNullCheckGuard
rollbackPath: 旧 shape alias を一時再導入
deadline: TBD
sunsetCondition: |
  全 consumer（widget + hook + readModel）が新 shape に移行、
  guard baseline=0 が 6 ヶ月継続
```

```yaml
id: LEG-008
title: PrevYearData の旧 non-discriminated shape
oldPath:
  - app/src/domain/models/PrevYearData.ts (旧 interface with hasPrevYear / daily)
replacementPath:
  - app/src/domain/models/PrevYearData.ts (discriminated union)
consumerMigrationStatus: pending
deletePR: ADR-A-004 PR4
guardThatPreventsReintroduction: coreRequiredFieldNullCheckGuard
rollbackPath: LEG-007 と同
deadline: TBD
sunsetCondition: LEG-007 と同
```

### LEG-009. registry file 内 inline pure helper

```yaml
id: LEG-009
title: buildPrevYearCostMap helper（registry file 内 inline 定義）
oldPath:
  - app/src/presentation/pages/Dashboard/widgets/registryChartWidgets.tsx:18-27
replacementPath:
  - app/src/domain/calculations/prevYearCostApprox.ts (pure、unit test 付)
consumerMigrationStatus: pending
deletePR: ADR-B-004 PR3
guardThatPreventsReintroduction: registryInlineLogicGuard（拡張版、registry file 内 pure fn 定義 0）
rollbackPath: registry file 内に再定義
deadline: TBD
sunsetCondition: |
  WID-003 が domain/calculations helper 経由、
  registry file 内の pure helper 定義 0 が 6 ヶ月継続
```

### LEG-010〜LEG-012. features/*/ui/widgets.tsx byte-identical 複製

```yaml
id: LEG-010
title: features/category/ui/widgets.tsx byte-identical 複製
oldPath:
  - app/src/features/category/ui/widgets.tsx (byte-identical with pages 版)
replacementPath:
  - 同 path で barrel re-export のみ (`export * from '@/presentation/pages/Category/widgets'`)
  - OR file 自体削除（features/ 経由 consumer 0 の場合）
consumerMigrationStatus: pending
deletePR: ADR-C-001 PR3 (消費者 grep 後、削除 or barrel 化)
guardThatPreventsReintroduction: duplicateFileHashGuard (INV-J7-A)
rollbackPath: byte-identical 複製を復元
deadline: TBD
sunsetCondition: |
  (1) features/category/ui/widgets.tsx が削除 or barrel re-export のみ、
  (2) duplicateFileHashGuard baseline=0 が 6 ヶ月継続
```

```yaml
id: LEG-011
title: features/cost-detail/ui/widgets.tsx byte-identical 複製
oldPath:
  - app/src/features/cost-detail/ui/widgets.tsx
replacementPath: LEG-010 同
consumerMigrationStatus: pending
deletePR: ADR-C-001 PR3
guardThatPreventsReintroduction: duplicateFileHashGuard
rollbackPath: 復元
deadline: TBD
sunsetCondition: LEG-010 同
```

```yaml
id: LEG-012
title: features/reports/ui/widgets.tsx byte-identical 複製
oldPath:
  - app/src/features/reports/ui/widgets.tsx
replacementPath: LEG-010 同
consumerMigrationStatus: pending
deletePR: ADR-C-001 PR3
guardThatPreventsReintroduction: duplicateFileHashGuard
rollbackPath: 復元
deadline: TBD
sunsetCondition: LEG-010 同
```

### LEG-013. `pages/CostDetail/useCostDetailData.ts` 重複 hook

```yaml
id: LEG-013
title: pages/CostDetail/useCostDetailData.ts (features 版との並存)
oldPath:
  - app/src/presentation/pages/CostDetail/useCostDetailData.ts (削除対象)
replacementPath:
  - app/src/features/cost-detail/application/useCostDetailData.ts (@canonical、唯一正本)
consumerMigrationStatus: pending
deletePR: ADR-C-002 PR3
guardThatPreventsReintroduction: hookCanonicalPathGuard（@canonical 必須化の派生）
rollbackPath: pages 版を復元
deadline: TBD
sunsetCondition: |
  全 consumer が features 版を import、pages 版 file 0 が 6 ヶ月継続
```

### LEG-014. Tier D orphan 3 件

```yaml
id: LEG-014
title: orphan UI 3 件（DowGapKpiCard / PlanActualForecast / RangeComparison）
oldPath:
  - app/src/presentation/pages/Dashboard/widgets/DowGapKpiCard.tsx
  - app/src/presentation/pages/Dashboard/widgets/PlanActualForecast.tsx
  - app/src/presentation/pages/Dashboard/widgets/__tests__/PlanActualForecast.test.tsx
  - app/src/presentation/pages/Dashboard/widgets/RangeComparison.tsx
  - app/src/presentation/pages/Dashboard/widgets/RangeComparison.styles.ts
  - app/src/presentation/pages/Dashboard/DashboardPage.styles.ts:16 (export * from './RangeComparison.styles')
replacementPath: (削除のみ、replacement 不要)
consumerMigrationStatus: N/A (import 0 確認済み)
deletePR: ADR-C-003 PR2
guardThatPreventsReintroduction: orphanUiComponentGuard (INV-J7-B)
rollbackPath: `git revert` で復元
deadline: TBD
sunsetCondition: |
  3 file 削除、orphanUiComponentGuard baseline=0 が 6 ヶ月継続
```

### LEG-015. barrel re-export metadata 未設定

```yaml
id: LEG-015
title: barrel re-export で @sunsetCondition / @expiresAt / @reason 未設定のもの
oldPath:
  - app/src/**/index.ts の re-export
  - app/src/presentation/pages/Dashboard/widgets/SalesAnalysisWidgets.tsx (features/sales の barrel re-export)
  - その他 re-export 箇所
replacementPath:
  - 同 path に JSDoc metadata 付記
consumerMigrationStatus: in-progress
deletePR: ADR-C-004 PR3（metadata 付記が deletion ではなく fixed mode 移行）
guardThatPreventsReintroduction: barrelReexportMetadataGuard
rollbackPath: metadata 要求緩和
deadline: TBD
sunsetCondition: |
  全 barrel re-export に metadata 付記、
  barrelReexportMetadataGuard baseline=existing→0（新規追加時は必須）が 6 ヶ月継続
```

---

## 再発防止規約（本 list の運用ルール）

### 規約 1. 新規 `@deprecated` は `@expiresAt` + `@sunsetCondition` 必須

`ADR-D-004` の deprecatedMetadataGuard で強制。違反時 CI fail。

### 規約 2. 新規 barrel re-export は `@sunsetCondition` + `@expiresAt` + `@reason` 必須

`ADR-C-004` の barrelReexportMetadataGuard で強制。

### 規約 3. 新規 allowlist は `ruleId` / `createdAt` / `reviewPolicy` / `expiresAt` 必須

`ADR-D-002` の allowlistMetadataGuard で強制。

### 規約 4. legacy item は本 list を唯一正本とする

新たな legacy が発生した場合:
1. `17a-<slug>.md` addendum を作成
2. metadata 7 項目を記入
3. 対応する Phase 6 sub-project の完了条件に組み込む

本 list 外の legacy が消費者 grep で発見された場合、該当 sub-project は **completed 昇格禁止**。

### 規約 5. sub-project completed 条件

各 Phase 6 sub-project は、以下を全て満たすまで completed 扱いにしない（plan.md §2 #7 強制）:

1. 新実装追加 + consumer 移行 + 旧実装削除 + 再発防止 guard（4 step pattern 完遂）
2. 対応する legacy item の `sunsetCondition` 達成
3. 対応する legacy item の `consumerMigrationStatus: migrated` 到達
4. 対応する guard baseline=0 到達

上記のいずれかが未達の場合、sub-project は `in_progress` のまま継続。

## 期限（deadline）の扱い

本台帳時点では全 legacy の `deadline: TBD`。Phase 5 での人間承認時に、sub-project の着手順序と合わせて確定する。

plan.md §10.6 の期限付き allowlist 原則に準拠:
- deadline は ISO date
- 超過時は `docs:check` で fail（ADR-D-002 の allowlist metadata guard で強制）
- 延長には人間承認が必要

## 付記

- 本 list は immutable。追加は `17a-*.md` として addend
- deadline が TBD のままなのは Phase 5 の人間承認待ちのため
- 関連: `inquiry/15`（全 ADR 元台帳）、`inquiry/16`（破壊的変更 list）、`inquiry/18`（sub-project map）
