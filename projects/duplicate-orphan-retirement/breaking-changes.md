# breaking-changes — duplicate-orphan-retirement

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md`
> の **BC-5** が正本。本文書はその local view。

## 対象破壊的変更

| ID | 対象 | 破壊内容 | ADR |
|---|---|---|---|
| **BC-5** | Tier D orphan 3 件 | `DowGapKpiCard.tsx` / `PlanActualForecast.tsx` + 関連 test / `RangeComparison.tsx` の物理削除 + `DashboardPage.styles.ts:16` の `export * from './RangeComparison.styles'` 除去 | ADR-C-003 PR2 |

## 運用規約

- **1 PR = 1 BC**（umbrella plan.md §2 #3 + 本 project plan.md §不可侵原則 #2）
- **guard 先行**（umbrella plan.md §2 #7）
  - `orphanUiComponentGuard` を PR1 で baseline=3 で追加
- **deletion 前に consumer 0 確認**（本 project plan.md §不可侵原則 #3）
  — grep 結果を PR description に添付
- **orphan 削除時は関連 test file も削除**（本 project plan.md §不可侵原則 #4）
- **barrel re-export 削除時は chain を検証**（本 project plan.md §不可侵原則 #5）

## 想定影響範囲

- **runtime 動作**: 影響 **なし**（grep で consumer 0 確認済み）
- **import path**: `DashboardPage.styles.ts` の 1 行変更のみ
- **テスト**: `__tests__/PlanActualForecast.test.tsx` を同時削除

## rollback plan

- PR2 を revert → 3 file 復帰 + styles barrel re-export 復元
- PR3（guard baseline=0 固定化）は別 commit のため rollback 独立

詳細は umbrella `inquiry/16-breaking-changes.md §BC-5` を参照。
