# plan — duplicate-orphan-retirement（SP-C）

> 役割: 本 sub-project の 4 ADR 実行計画。
> umbrella `architecture-debt-recovery` の `inquiry/15-remediation-plan.md §Lane C` の詳細実行版。

## 不可侵原則（本 project 固有、umbrella 原則に追加）

1. **umbrella の plan.md §2 不可侵原則 16 項を全て継承する**
2. **1 PR = 1 ADR step**（umbrella §2 #3 の具体化）。4 ADR × 3-4 step = ~14 PR を厳守
3. **deletion PR は consumer 0 確認を必須**（grep 結果を PR description に添付）
4. **orphan 削除時は関連 test file も削除**（`__tests__/PlanActualForecast.test.tsx` 等）
5. **barrel re-export 削除時は chain を検証**（`DashboardPage.styles.ts` 経路等）
6. **metadata 追加（@sunsetCondition / @expiresAt / @reason）は全 barrel re-export に必須**（ratchet-down 運用）

## 4 ADR 実行計画

### ADR-C-001. `features/*/ui/widgets.tsx` 3 件 byte-identical 解消

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `duplicateFileHashGuard` を baseline=3 で追加（増加禁止） | guard 追加 |
| PR2 | 3 file を barrel re-export 化（`export * from '@/presentation/pages/<Page>/widgets'`）+ `@canonical` JSDoc で正本明示 | 実装 |
| PR3 | consumer grep → features/ 経由 import 0 確認後、3 file を削除（barrel 化のみで consumer 0 の場合） | 削除 |
| PR4 | `duplicateFileHashGuard` baseline=0 に更新 + fixed mode | guard ratchet-down |

### ADR-C-002. `useCostDetailData` 2 箇所並存解消

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | features 版に `@canonical` JSDoc 追加、`hookCanonicalPathGuard` を baseline=1 で追加 | 実装 + guard |
| PR2 | 全 consumer を features 版 import に切替 | migration |
| PR3 | pages 版 file を削除 | 削除 |
| PR4 | `hookCanonicalPathGuard` baseline=0 + fixed mode | guard ratchet-down |

### ADR-C-003. Tier D orphan 3 件削除（BC-5 破壊的変更）

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `orphanUiComponentGuard` を baseline=3 で追加 | guard 追加 |
| PR2 | 3 file 削除（`DowGapKpiCard.tsx` / `PlanActualForecast.tsx` + 関連 test / `RangeComparison.tsx`）+ `DashboardPage.styles.ts:16` の `export * from './RangeComparison.styles'` 除去 | 削除（破壊的変更） |
| PR3 | `orphanUiComponentGuard` baseline=0 + fixed mode | guard ratchet-down |

（3 step で完結、PR4 不要）

### ADR-C-004. barrel re-export metadata 必須化（R-7 reformulate）

| step | 内容 | PR 種別 |
|---|---|---|
| PR1 | `barrelReexportMetadataGuard` を baseline=existing barrel count で追加 | guard 追加 |
| PR2 | 既存 barrel re-export 全てに `@sunsetCondition` + `@expiresAt` + `@reason` JSDoc bulk 追記 | 実装 |
| PR3 | baseline=0 fixed mode（新規追加時は metadata 必須） | guard ratchet-down |

（3 step で完結、PR4 不要）

## 依存関係

ADR-C-001 / C-003 / C-004 は**並行 PR1 着手可**（互いに独立）。
ADR-C-002 は `hookCanonicalPathGuard` 規約を先に確定する必要があるため、C-001 / C-004 PR1 の後に着手する。

Lane C 内部の推奨実行順:

```text
Wave 1-C Start
    ├─ ADR-C-001 PR1 (duplicateFileHashGuard baseline=3)
    ├─ ADR-C-003 PR1 (orphanUiComponentGuard baseline=3)
    └─ ADR-C-004 PR1 (barrelReexportMetadataGuard baseline=current)
    ↓
    ├─ ADR-C-001 PR2-4
    ├─ ADR-C-003 PR2-3 (BC-5 実施)
    ├─ ADR-C-004 PR2-3
    └─ ADR-C-002 PR1-4 (他 ADR の guard 規約確定後)
    ↓
SP-C completion
```

## 破壊的変更

umbrella `inquiry/16 §BC-5`（Tier D orphan 3 件削除）を参照。

- 影響範囲: import 経路 0 のため表面 consumer 影響 0（grep 確認済み）
- 前提: PR2 の削除前に再度 grep で 0 件確認
- rollback: `git revert` で file 復元 + `RangeComparison.styles` barrel 復元
- 該当 PR: ADR-C-003 PR2

## 禁止事項（本 project 固有）

1. 本 plan に載らない file 削除を実施（umbrella plan.md §2 #5 禁止の継承）
2. `@canonical` JSDoc なしの複製 file 作成
3. metadata なしの barrel re-export 新規追加（PR3 以降）
4. guard baseline を増加方向に動かす（ratchet-down 原則違反）

## 参照

- umbrella: `projects/architecture-debt-recovery/plan.md`（不可侵原則 + 4 step pattern + 禁止事項 20）
- umbrella inquiry: `inquiry/15-remediation-plan.md §Lane C` / `inquiry/16-breaking-changes.md §BC-5` / `inquiry/17-legacy-retirement.md §LEG-010〜015` / `inquiry/18-sub-project-map.md §SP-C`
- 運用規約: `references/03-guides/project-checklist-governance.md`
- architecture-rule system: `references/03-guides/architecture-rule-system.md`
