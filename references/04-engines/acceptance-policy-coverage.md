# Acceptance Policy Coverage — KPI 分類と policy 設定状況

## 目的

MetricAcceptancePolicy の設定対象を分類し、policy 設定の判断基準を明文化する。
「全 KPI に policy を書く」のではなく、デフォルト動作では不十分な KPI にのみ設定する。

## 分類基準

| 分類 | 基準 | acceptancePolicy |
|---|---|---|
| **A: Policy Required** | デフォルト動作（safe-side）では業務要件を満たさない | 明示的に設定 |
| **B: Policy Recommended** | デフォルトで問題ないが、authoritativeOwner/fallbackRule を明示すべき | 設定不要（デフォルト使用） |
| **C: Policy Unnecessary** | 生データ集計・入力値で policy 判定が不要 | 設定不要 |

## DEFAULT_ACCEPTANCE_POLICY（safe-side）

```typescript
{
  allowAuthoritativeWhenPartial: false,
  allowAuthoritativeWhenEstimated: false,
  allowExploratoryWhenInvalid: false,
  blockingWarningCategories: [],
  blockingWarningCodes: [],
}
```

policy 未設定の KPI はこのデフォルトで動作する。

## A: Policy Required（14 KPI）

### 推定法系（blockingWarningCategories: ['calc']）

| MetricId | policy | 理由 |
|---|---|---|
| estMethodCogs | `blockingWarningCategories: ['calc']` | 売変率異常時は推定原価を authoritative にしない |
| estMethodMargin | `blockingWarningCategories: ['calc']` | 同上 |
| estMethodMarginRate | `blockingWarningCategories: ['calc']` | 同上 |
| discountLossCost | `blockingWarningCategories: ['calc']` | 売変率定義域外で authoritative 不可 |

### 在庫法系（strict default）

| MetricId | policy | 理由 |
|---|---|---|
| invMethodGrossProfitRate | （空 = デフォルト適用） | partial は authoritative 不可（正確な値が必須） |

### 予算達成率系（allowPartial）

| MetricId | policy | 理由 |
|---|---|---|
| budgetAchievementRate | `allowAuthoritativeWhenPartial: true` | 月中でも達成率は業務判断に使用可 |
| grossProfitBudgetAchievement | `allowAuthoritativeWhenPartial: true` | 同上（粗利版） |
| requiredDailySales | `allowAuthoritativeWhenPartial: true` | 残日数計算は partial でも有用 |

### 予測系（allowPartial + allowExploratoryWhenInvalid）

| MetricId | policy | 理由 |
|---|---|---|
| projectedSales | `allowPartial, allowExploratoryWhenInvalid` | 月中予測は partial でも参考表示可 |
| projectedAchievement | `allowPartial, allowExploratoryWhenInvalid` | 着地予測達成率も同様 |
| projectedGrossProfit | `allowPartial, allowExploratoryWhenInvalid` | 粗利着地予測も同様 |
| projectedGPAchievement | `allowPartial, allowExploratoryWhenInvalid` | 粗利着地予測達成率も同様 |

## B: Policy Recommended（authoritativeOwner 明示、policy はデフォルト）

デフォルトの safe-side 動作で問題ないが、authoritativeOwner / sourceEngine / fallbackRule を明示して
「この KPI は TS が正本」であることを registry で追跡可能にする。

| MetricId | authoritativeOwner | fallbackRule | 理由 |
|---|---|---|---|
| budgetProgressRate | ts | zero | 売上消化率は TS 計算 |
| budgetElapsedRate | ts | zero | 経過予算率は TS 計算 |
| budgetProgressGap | ts | zero | 進捗ギャップは TS 計算 |
| grossProfitBudgetVariance | ts | zero | 粗利予算差異は TS 計算 |
| grossProfitProgressGap | ts | zero | 粗利進捗ギャップは TS 計算 |

## C: Policy Unnecessary（生データ集計・入力値）

以下は集約値・入力値であり、resolver の acceptance 判定が不要。
authoritativeOwner も不要（データソースが権威的）。

| MetricId | 理由 |
|---|---|
| salesTotal | 売上合計（生データ集計） |
| coreSales | コア売上（生データ集計） |
| grossSales | 粗売上（推定法で計算されるが、grossSales 自体は中間値） |
| purchaseCost | 総仕入原価（生データ集計） |
| inventoryCost | 在庫仕入原価（生データ集計） |
| deliverySalesCost | 売上納品原価（生データ集計） |
| discountTotal | 売変額合計（生データ集計） |
| totalCustomers | 来店客数（生データ集計） |
| totalCostInclusion | 原価算入費（生データ集計） |
| budget | 売上予算（入力値） |
| grossProfitBudget | 粗利予算（入力値） |
| grossProfitRateBudget | 粗利率予算（入力値） |
| purchaseBudget | 仕入予算（入力値） |
| remainingBudget | 残余予算（budget - salesTotal） |
| budgetVariance | 売上予算差異（budget - salesTotal） |

## Policy 未設定 KPI の扱い

acceptancePolicy が未設定の KPI は DEFAULT_ACCEPTANCE_POLICY が適用される。
これは safe-side（partial/estimated → authoritative 不可、invalid → exploratory 不可）。

**意図的に未設定にする場合:**
- C 分類の KPI（生データ集計・入力値）
- B 分類で policy override が不要な KPI

**将来の追加候補:**
- averageMarkupRate / coreMarkupRate: 値入率の異常値検出強化時に blockingWarningCategories 追加
- averageSpendPerCustomer / itemsPerCustomer / averagePricePerItem: 客数ゼロ時の fallback 明示化
