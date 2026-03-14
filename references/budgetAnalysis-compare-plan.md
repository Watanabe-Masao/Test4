# budgetAnalysis Dual-Run Compare 計画

## 目的

budgetAnalysisBridge.ts に dual-run compare を導入する。
compare 対象は single-store authoritative core のみとし、
aggregate responsibility は引き続き bridge 外に置く。

## compare 対象（2 関数）

| # | 関数 | 戻り値型 | 備考 |
|---|---|---|---|
| 1 | `calculateBudgetAnalysis` | `BudgetAnalysisResult` | 10 scalar fields + dailyCumulative |
| 2 | `calculateGrossProfitBudget` | `GrossProfitBudgetResult` | 5 scalar fields |

## compare 対象外

| 関数 | 除外理由 |
|---|---|
| `calculateAggregateBudget` | application 層の集約責務。bridge 外 |
| multi-store aggregation | bridge 外 |
| hooks / ViewModel | bridge 外 |
| import/export orchestration | bridge 外 |

## 比較対象フィールド

### calculateBudgetAnalysis

scalar フィールドのみ compare する。`dailyCumulative` は除外（決定論的派生値）。

| フィールド | 型 | 備考 |
|---|---|---|
| `budgetAchievementRate` | number | totalSales / budget |
| `budgetProgressRate` | number | totalSales / cumulativeBudget |
| `budgetElapsedRate` | number | cumulativeBudget / budget |
| `budgetProgressGap` | number | progressRate - elapsedRate |
| `budgetVariance` | number | totalSales - cumulativeBudget |
| `averageDailySales` | number | totalSales / salesDays |
| `projectedSales` | number | totalSales + avg × remainingDays |
| `projectedAchievement` | number | projectedSales / budget |
| `requiredDailySales` | number | (budget - totalSales) / remainingDays |
| `remainingBudget` | number | budget - totalSales |

**dailyCumulative 除外理由:**
同じ入力（budgetDaily, salesDaily）から決定論的に導出される累計値であり、
scalar フィールドの比較で精度差を検出できれば十分。

### calculateGrossProfitBudget

| フィールド | 型 | 備考 |
|---|---|---|
| `grossProfitBudgetVariance` | number | grossProfit - elapsedGPBudget |
| `grossProfitProgressGap` | number | gpAchievement - budgetElapsedRate |
| `requiredDailyGrossProfit` | number | (gpBudget - gp) / remainingDays |
| `projectedGrossProfit` | number | gp + avgDailyGP × remainingDays |
| `projectedGPAchievement` | number | projectedGP / gpBudget |

## invariant ベースの比較基準

| invariant | 検証内容 |
|---|---|
| B-INV-1 | remainingBudget == budget - totalSales |
| B-INV-2 | budgetProgressGap == budgetProgressRate - budgetElapsedRate |
| B-INV-3 | budgetVariance == totalSales - cumulativeBudget |
| B-INV-4 | 0 予算 / 0 売上でも全フィールドが finite |
| B-INV-5 | 予算欠損 key でも例外を出さない |
| B-INV-6 | elapsedDays == daysInMonth → requiredDailySales == 0 |
| B-INV-7 | projectedGPAchievement == projectedGrossProfit / grossProfitBudget |
| B-INV-8 | grossProfitBudgetVariance == grossProfit - gpBudget × budgetElapsedRate |

## tolerance 定義

| 種類 | 許容差 |
|---|---|
| 個別数値差 | 1e-10 |
| 恒等式検証 | 1e-10 |

## 特殊ケースの比較ルール

| ケース | ルール |
|---|---|
| budget == 0 | safeDivide により 0 が返る。比較対象 |
| totalSales == 0 | 全率が 0。比較対象 |
| salesDays == 0 | averageDailySales == 0。比較対象 |
| 予算欠損 key | cumulativeBudget 計算で ?? 0 により 0 補完。比較対象 |
| remainingDays == 0 | requiredDailySales == 0。比較対象 |

全ケースで nullable フィールドは存在しない（safeDivide で保護済み）。

## mismatch 分類

| 分類 | 条件 |
|---|---|
| `numeric-within-tolerance` | maxAbsDiff ≤ 1e-10 かつ invariant ok |
| `numeric-over-tolerance` | maxAbsDiff > 1e-10 かつ invariant ok |
| `invariant-violation` | invariant check が violated |

null-mismatch は発生しない（全フィールドが number）。

## 動作モード

| モード | 動作 |
|---|---|
| `ts-only` | TS 実装のみ実行。WASM 不使用 |
| `wasm-only` | WASM ready 時のみ WASM 結果。未 ready は TS fallback |
| `dual-run-compare` | 両方実行 → compare → TS 結果を返却（DEV のみ） |

wasm-only + ready 以外は TS fallback。

## runbook 観測項目

- `__dualRunStats()` で budgetAnalysis 関数の統計を確認
- `__dualRunStats('log')` で mismatch ログの詳細を確認
- invariant-violation の有無（あれば即調査）
- maxAbsDiff の傾向
