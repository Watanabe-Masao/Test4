# breaking-changes — duplicate-orphan-retirement

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md`
> の **BC-5** が正本。本文書はその local view。

## 対象破壊的変更

| ID | 対象 | 破壊内容 | ADR |
|---|---|---|---|
| **BC-5 (PR2)** | Tier D orphan 3 件 | `DowGapKpiCard.tsx` / `PlanActualForecast.tsx` + 関連 test / `RangeComparison.tsx` の物理削除 + `DashboardPage.styles.ts:16` の `export * from './RangeComparison.styles'` 除去 | ADR-C-003 PR2 |
| **BC-5 (PR3a)** | 17a 拡張 scope F1/F3/F4 + barrel cascade | `ConditionDetailPanels.tsx` + `.vm.ts` (barrel) / `ConditionSummary.tsx` + test / `ExecSummaryBarWidget.tsx` + styles の物理削除 + `conditionPanelMarkupCost.tsx` + `.vm.ts` + test / `conditionPanelProfitability.tsx` + `.vm.ts` + test (barrel cascade) の物理削除 + `phase6SummarySwapGuard.test.ts` (F4 唯一対象 guard) の物理削除 | ADR-C-003 PR3a |
| **BC-5 (PR3b)** | 17a 拡張 scope F2 + 拡張 cascade | `ConditionMatrixTable.tsx` + helpers + styles + test の物理削除 + `useConditionMatrixPlan.ts` (Plan) / `ConditionMatrixHandler.ts` (Handler) / `useConditionMatrix.ts` (legacy hook) / `conditionMatrixLogic.ts` (pure logic) + test / `infrastructure/duckdb/queries/conditionMatrix.ts` (SQL) + test の物理削除 + 各 barrel (`advanced/index.ts` / `application/hooks/duckdb/index.ts` / `infrastructure/duckdb/index.ts`) の export 除去 | ADR-C-003 PR3b |

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
- **import path**: `DashboardPage.styles.ts` の barrel re-export 行を除去
- **テスト**: `__tests__/PlanActualForecast.test.tsx` を同時削除

## rollback plan

各 PR を独立して `git revert` で戻せる単位で構成済み。

- **PR2 revert**: Tier D orphan 3 件 + 関連 test + cascade ExecMetric.tsx 復帰 + `DashboardPage.styles.ts` の `RangeComparison.styles` barrel 復元
- **PR3a revert**: 17a F1/F3/F4 + barrel cascade (conditionPanelMarkupCost / conditionPanelProfitability) + `phase6SummarySwapGuard.test.ts` 復帰 + 関連 allowlist (storeResultAnalysisInputGuard / grossProfitPathGuard / responsibility.ts) のエントリ復元
- **PR3b revert**: F2 + 17a 拡張 cascade (Plan / Handler / duckdb hook / logic / infrastructure query) 復帰 + 各 barrel の export 復元 + `sameInterfaceNameGuard` ALLOWLIST に PeriodMetrics 復元
- **PR3c revert**: docs only (checklist / 17a / breaking-changes / legacy-retirement の項目状態のみ巻き戻し)

連鎖 revert する場合は PR3b → PR3a → PR2 の逆順で実施し、各 revert 後に
`npm run test:guards` + `npm run docs:check` で health 復元を確認。

詳細は umbrella `inquiry/16-breaking-changes.md §BC-5` を参照。
