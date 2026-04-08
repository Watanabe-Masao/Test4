# Canonical Value Ownership Ledger

## 概要

各業務値の「現在の正本」「目標の正本」「共存状態」「除去条件」を 1 行で固定する台帳。

移行は **transform → coexist → eliminate** の 3 段階で行う。
共存期間と除去条件を明示することで、Big Bang を避けつつ旧経路の滞留を防ぐ。

## 値の分類

| 種類 | 定義 | 例 |
|---|---|---|
| **direct fact** | 外部データから直接取得する事実 | 売上、客数、値引き |
| **composite fact** | 複数の fact を組み合わせた事実 | 仕入原価（3独立正本） |
| **calculated value** | fact から計算で導出する値 | 粗利、PI値、客数GAP、要因分解 |

## 移行ステータス

| status | 意味 |
|---|---|
| **accepted** | 正本が確定し、全利用箇所が正本経由。移行完了 |
| **coexist** | 新正本は稼働中だが、旧経路がまだ残っている |
| **migrate** | 新正本の方針は決まったが、まだ移行中 |
| **legacy** | 旧経路のみ。新正本の設計が未確定 |

## 台帳

### Direct Fact（外部データから直接取得）

| 値 | 種類 | 現在の正本 | 目標の正本 | status | 旧経路残件 | 除去条件 | guard | 定義書 |
|---|---|---|---|---|---|---|---|---|
| 売上・販売点数 | direct fact | `readSalesFact()` | 同左 | accepted | 0 | — | salesFactPathGuard | sales-definition.md |
| 値引き | direct fact | `readDiscountFact()` | 同左 | accepted | 0 | — | discountFactPathGuard | discount-definition.md |
| 客数 | direct fact | `readCustomerFact()` | 同左 | coexist | 16 | `StoreResult.totalCustomers` の分析参照が 0 になった | customerFactPathGuard + storeResultAnalysisInputGuard | customer-definition.md |
| 自由期間分析 | direct fact | `readFreePeriodFact()` | 同左 | accepted | 0 | — | freePeriodPathGuard | free-period-analysis-definition.md |
| 自由期間予算 | direct fact | `readFreePeriodBudgetFact()` | 同左 | accepted | 0 | — | freePeriodBudgetPathGuard | free-period-budget-kpi-contract.md |
| 自由期間部門KPI | direct fact | `readFreePeriodDeptKPI()` | 同左 | accepted | 0 | — | freePeriodDeptKPIPathGuard | free-period-budget-kpi-contract.md |

### Composite Fact（複数正本の統合）

| 値 | 種類 | 現在の正本 | 目標の正本 | status | 旧経路残件 | 除去条件 | guard | 定義書 |
|---|---|---|---|---|---|---|---|---|
| 仕入原価 | composite fact | `readPurchaseCost()` | 同左 | accepted | 0 | 旧 7 クエリは廃止済み | purchaseCostPathGuard + importGuard | purchase-cost-definition.md |

### Calculated Value（fact から導出）

| 値 | 種類 | 現在の正本 | 目標の正本 | status | 旧経路残件 | 除去条件 | guard | 定義書 |
|---|---|---|---|---|---|---|---|---|
| 粗利 | calculated | `calculateGrossProfit()` | 同左 | accepted | 0 | — | grossProfitPathGuard + consistencyGuard | gross-profit-definition.md |
| 要因分解 | calculated | `calculateFactorDecomposition()` | 同左 | accepted | 0 | — | factorDecompositionPathGuard | authoritative-calculation-definition.md |
| PI値（点数） | calculated | `calculateQuantityPI()` | `buildPICanonicalInput() → calculateQuantityPI()` | coexist | 0 | canonical input builder 以外の入力経路が 0 | piValuePathGuard + canonicalInputGuard | pi-value-definition.md |
| PI値（金額） | calculated | `calculateAmountPI()` | `buildPICanonicalInput() → calculateAmountPI()` | coexist | 0 | 同上 | piValuePathGuard + canonicalInputGuard | pi-value-definition.md |
| 客数GAP | calculated | `calculateCustomerGap()` | `buildCustomerGapCanonicalInput() → calculateCustomerGap()` | coexist | 0 | canonical input builder 以外の入力経路が 0 | customerGapPathGuard + canonicalInputGuard | customer-gap-definition.md |

### 表示用集計値（StoreResult）

| 値 | 種類 | 現在の正本 | 目標の正本 | status | 旧経路残件 | 除去条件 | guard | 定義書 |
|---|---|---|---|---|---|---|---|---|
| 予算 | composite | StoreResult（統一済み） | 同左 | accepted | 0 | — | — | budget-definition.md |
| KPI | composite | StoreResult（統一済み） | 同左 | accepted | 0 | — | — | kpi-definition.md |
| totalCustomers | direct fact | `StoreResult.totalCustomers` | `readCustomerFact()` | coexist | 16 | 分析用途の `.totalCustomers` 参照が 0 | storeResultAnalysisInputGuard | customer-definition.md |

## coexist の管理ルール

1. **coexist エントリは旧経路残件数を追跡する**（guard の allowlist サイズで計測）
2. **残件数は ratchet-down**（増加禁止）
3. **除去条件が満たされたら legacy 経路を削除し status: accepted に変更**
4. **新規利用は全て新正本経由**（guard で強制）

## totalCustomers 移行の詳細（coexist → accepted）

旧経路 16 件の分類:

### 計算入力（移行必須 — 11 件）

CustomerFact 経由に変更が必要。presentation 層では UnifiedWidgetContext
または plan hook 経由で受け取る。

| ファイル | 用途 | 優先度 |
|---|---|---|
| conditionPanelCustomerGap.tsx | `calculateCustomerGap()` の直接入力 | P1 |
| conditionSummaryCardBuilders.ts | `calculateCustomerGap()` + YoY 比率 | P1 |
| StorePIComparisonChart.builders.ts | PI 値の除数 | P1 |
| ConditionSummary.tsx | YoY 比率 + 客単価計算 | P2 |
| conditionPanelYoY.vm.ts | YoY 比率計算 | P2 |
| ExecSummaryBarWidget.tsx | YoY 比率 + 客単価 | P2 |
| PlanActualForecast.tsx | YoY 比率 + 日次平均 + 予測計算 | P2 |
| KpiTabContent.tsx | YoY 比率 + 客単価 + 日次平均 | P2 |
| ForecastPage.helpers.ts | バケット集計の除数 | P3 |
| useInsightData.ts | YoY/比率計算の下流入力 | P3 |
| SensitivityDashboard.tsx | PI 弾力性シミュレーション | P3 |

### 表示のみ（StoreResult 維持可 — 5 件）

表示用途のみ。StoreResult.totalCustomers を使い続けて問題なし。
移行完了後に allowlist から除外。

| ファイル | 用途 |
|---|---|
| DataTableWidgets.tsx | 条件付きレンダリング（> 0 チェック） |
| conditionPanelSalesDetail.tsx | ViewModel 経由で表示 |
| conditionPanelSalesDetail.vm.ts | ローカライズ文字列に変換 |
| conditionSummaryUtils.ts | 内訳表示用に整形 |
| registryAnalysisWidgets.tsx | 子コンポーネントに props で渡す |

## guard との接続

| guard | 保護する値 | 検出内容 |
|---|---|---|
| salesFactPathGuard | 売上 | 旧クエリの直接 import |
| discountFactPathGuard | 値引き | 旧クエリの直接 import |
| customerFactPathGuard | 客数 | 旧クエリの直接 import |
| purchaseCostPathGuard + importGuard | 仕入原価 | 旧 7 クエリの使用 |
| grossProfitPathGuard + consistencyGuard | 粗利 | 独自計算・経路不整合 |
| factorDecompositionPathGuard | 要因分解 | 独自計算 |
| piValuePathGuard + canonicalInputGuard | PI値 | インライン除算 |
| customerGapPathGuard + canonicalInputGuard | 客数GAP | インライン差分計算 |
| storeResultAnalysisInputGuard | totalCustomers | 分析用途の旧経路 |
| freePeriodPathGuard | 自由期間 | 旧クエリの直接 import |

## 完了条件

この台帳が「完了」と言えるのは:
1. 全値が status: accepted
2. coexist エントリの旧経路残件が 0
3. legacy エントリが 0
4. 全値に guard + 定義書が紐づいている
