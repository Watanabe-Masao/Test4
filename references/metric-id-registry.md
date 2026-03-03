# MetricId レジストリ

24 個の MetricId の一覧。型定義は `domain/models/Explanation.ts` を参照。

## 売上系

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `salesTotal` | 総売上 | yen | 分類別売上の合計 |
| `coreSales` | コア売上 | yen | 総売上 - 特殊売上 |
| `grossSales` | 粗売上 | yen | 売変前売上（定価ベース） |

## 原価系

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `purchaseCost` | 総仕入 | yen | 仕入データの合計 |
| `inventoryCost` | 在庫仕入 | yen | 在庫に計上される仕入 |
| `deliverySalesCost` | 売上納品 | yen | 売上に連動する仕入 |

## 売変系

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `discountTotal` | 売変額 | yen | 値引・値下の合計 |
| `discountRate` | 売変率 | rate | 売変額 / 粗売上 |
| `discountLossCost` | 売変ロス原価 | yen | 売変による原価影響 |

## 値入率

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `averageMarkupRate` | 平均値入率 | rate | (粗売上 - 仕入原価) / 粗売上 |
| `coreMarkupRate` | コア値入率 | rate | コア売上ベースの値入率 |

## 在庫法（実績P/L）

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `invMethodCogs` | 売上原価 | yen | 期首在庫 + 仕入 - 期末在庫 |
| `invMethodGrossProfit` | 実績粗利益 | yen | 総売上 - 売上原価 |
| `invMethodGrossProfitRate` | 実績粗利率 | rate | 粗利益 / 総売上 |

## 推定法（在庫差異検知）

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `estMethodCogs` | 推定原価 | yen | 売上 × (1 - 推定マージン率) |
| `estMethodMargin` | 推定マージン | yen | 総売上 - 推定原価 |
| `estMethodMarginRate` | 推定マージン率 | rate | 推定マージン / 総売上 |
| `estMethodClosingInventory` | 推定期末在庫 | yen | 理論値（推定法による） |

## 客数

| MetricId | 指標名 | 単位 |
|---|---|---|
| `totalCustomers` | 来店客数 | count |

## 消耗品

| MetricId | 指標名 | 単位 |
|---|---|---|
| `totalConsumable` | 消耗品費 | yen |

## 予算系

| MetricId | 指標名 | 単位 | 計算式概要 |
|---|---|---|---|
| `budget` | 予算 | yen | 設定値 |
| `budgetAchievementRate` | 達成率 | rate | 総売上 / 予算 |
| `budgetProgressRate` | 消化率 | rate | 経過日数ベースの進捗 |
| `projectedSales` | 予測売上 | yen | 現在ペースでの月末予測 |
| `remainingBudget` | 残余予算 | yen | 予算 - 総売上 |

## Explanation 対応ページ

| ページ | 対応状況 |
|---|---|
| Dashboard | WidgetContext.onExplain 経由で全ウィジェットから利用可能 |
| Daily | KpiCard 6枚に接続 |
| Insight | Tab 1: KpiCard 6枚 / Tab 2: 在庫法・推定法13指標 |
| Reports | 概況 + 目標 + 仕入売変 + 損益構造 |
| Category | KpiCard 4枚 |
| CostDetail | KpiCard 2枚 |
