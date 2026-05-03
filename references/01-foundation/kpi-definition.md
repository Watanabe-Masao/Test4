# KPI の正本定義

## 1. 現状評価

KPI 計算は**概ね集約済み**。`calculateBudgetAnalysis()` と `calculateGrossProfitBudget()` が主要な計算を担う。

軽微な分散:
- YoY が3箇所で独立計算（SQL / domain utils / presentation helpers）
- 達成率が store level と collection level で別経路

## 2. 正本の所在

### 達成率（計算正本）

| KPI | 計算元 | 所在 |
|-----|--------|------|
| 売上達成率 | totalSales / budget | calculateBudgetAnalysis → StoreResult.budgetAchievementRate |
| 売上進捗率 | totalSales / cumulativeBudget | 同上 → budgetProgressRate |
| 粗利額達成率 | effectiveGP / gpBudget | calculateGrossProfitBudget → StoreResult |
| 粗利率達成率 | gpRate - gpRateBudget | conditionSummaryHelpers（PP差分） |
| 着地予測達成率 | projectedSales / budget | calculateBudgetAnalysis → projectedAchievement |

### 前年比（軽微な分散あり）

| 経路 | 用途 | 関数 |
|------|------|------|
| domain/calculations/utils.ts | 汎用 YoY ratio | calculateYoYRatio(current, previous) |
| infrastructure/duckdb/queries/yoyComparison.ts | 日別 SQL JOIN | FULL OUTER JOIN |
| presentation conditionSummaryHelpers.ts | 表示用 | computeYoY(actual, ly, isRate) |

## 3. 正本化方針

### 達成率: 現状維持

`calculateBudgetAnalysis()` が正本として機能。追加の正本は不要。

### 前年比: 軽微な統合の余地

`calculateYoYRatio()` が domain 層の正本。presentation 層の `computeYoY` は
表示用のラッパー（rate の場合は PP 差分、amount の場合は ratio）。

これは「計算正本の問題」ではなく「表示フォーマットの問題」に近い。
正本化の優先度は低い。

## 4. 結論

KPI は予算と同様に正本化済み。追加の readKpi() や Zod 契約は現時点では不要。
YoY の3パスは表示用途の差異であり、値の不一致リスクは低い。
