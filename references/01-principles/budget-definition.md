# 予算の正本定義

## 1. 現状評価

予算は**既に well-unified**。正本化の追加作業は不要。

- **取得:** ImportedData.budget → storeAssembler.resolveBudget() → StoreResult
- **計算:** `calculateBudgetAnalysis()` + `calculateGrossProfitBudget()` に集約済み
- **分散問題:** なし

## 2. 正本の所在

### 予算値（取得正本）

| フィールド | 型 | ソース |
|-----------|-----|--------|
| budget | number | BudgetData.total or defaultBudget |
| budgetDaily | Map<number, number> | BudgetData.daily or 均等配分 |
| grossProfitBudget | number | InventoryConfig.grossProfitBudget |

### 達成率（計算正本）

| フィールド | 計算式 | 計算元 |
|-----------|--------|--------|
| budgetAchievementRate | totalSales / budget | calculateBudgetAnalysis |
| budgetProgressRate | totalSales / cumulativeBudget | 同上 |
| budgetProgressGap | progressRate - elapsedRate | 同上 |
| budgetVariance | totalSales - cumulativeBudget | 同上 |
| projectedSales | actual + dailyAvg × remainingDays | 同上 |
| projectedAchievement | projectedSales / budget | 同上 |
| requiredDailySales | (budget - actual) / remainingDays | 同上 |
| grossProfitBudgetVariance | GP - elapsedGPBudget | calculateGrossProfitBudget |
| grossProfitProgressGap | GP達成率 - 経過予算率 | 同上 |
| projectedGrossProfit | GP + dailyAvgGP × remainingDays | 同上 |

## 3. DuckDB 探索クエリ

| クエリ | 用途 |
|--------|------|
| queryDailyCumulativeBudget | 日別累計（store_day_summary + budget JOIN） |
| queryBudgetAnalysisSummary | 期間サマリー（達成率等） |

これらは StoreResult の計算とは独立した探索経路（グラフ表示用）。

## 4. 結論

予算は正本化済み。追加の readBudget() や Zod 契約は現時点では不要。
将来的に予算の Zod 契約が必要になった場合は、`BudgetData` / `InventoryConfig` を
Zod 化するのが自然。
