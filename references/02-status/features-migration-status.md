# features/ 縦スライス移行 進捗管理表

## ステータス定義

- ✅ 完了
- n/a 対象外（shared-core を使用）

## 進捗表

| Feature | Domain | Application | UI | Page Shell | Barrel | Done |
|---------|--------|-------------|-----|------------|--------|------|
| sales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| storage-admin | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| budget | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| forecast | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| purchase | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| category | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| cost-detail | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |

## 全8 feature 完了

- **sales**: domain(3 pure関数) + application(dailySalesTransform) + ui(SalesAnalysisWidgets)
- **storage-admin**: application(useMonthDataManagement) + ui(6 sections + styles + types)
- **budget**: application(useBudgetChartData) + ui(InsightTabBudget + vm)
- **forecast**: application(useForecast) + ui(InsightTabForecast + vm)
- **purchase**: application(purchaseAnalysisHelpers) + ui(PurchaseDailyPivot + PurchaseTables + Chart)
- **category**: application(categoryData + CategoryTotalView.vm) + ui(8 components + styles + widgets)
- **cost-detail**: application(useCostDetailData + helpers + types) + ui(3 tabs + widgets + styles)
- **reports**: ui(ReportSummaryGrid + ReportDeptTable + widgets + styles)

## 後方互換

全移動ファイルの旧パスに barrel re-export を配置。既存の import パスは変更不要。

## 次の移行対象（別 Epic）

- Dashboard widget を owner 単位で features/ に回収（cross-cutting widget は shared 維持）
- domain/calculations/ の feature 移動
- charts/ 配下の category 系チャートの feature 回収
