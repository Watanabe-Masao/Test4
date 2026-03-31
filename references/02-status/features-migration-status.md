# features/ 縦スライス移行 進捗管理表

## ステータス定義

- ✅ 完了
- 🔧 進行中
- ⬜ 未着手
- n/a 対象外（shared-core を使用）

## 進捗表

| Feature | Domain | Application | UI | Page Shell | Barrel | Done |
|---------|--------|-------------|-----|------------|--------|------|
| sales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| storage-admin | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| budget | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| forecast | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| purchase | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| category | n/a | ⬜ | ⬜ | ✅ | ✅ | 🔧 |
| cost-detail | n/a | ⬜ | ⬜ | ✅ | ✅ | 🔧 |
| reports | n/a | ⬜ | ⬜ | ✅ | ✅ | 🔧 |

## 備考

- **sales**: domain(3 pure関数) + application(dailySalesTransform) + ui(SalesAnalysisWidgets)
- **storage-admin**: application(useMonthDataManagement) + ui(6 sections + styles + types)
- **budget**: application(useBudgetChartData) + ui(InsightTabBudget + vm)
- **forecast**: application(useForecast) + ui(InsightTabForecast + vm)
- **purchase**: application(purchaseAnalysisHelpers) + ui(PurchaseDailyPivot + PurchaseTables + PurchaseVsSalesChart)
- **category/cost-detail/reports**: page は既に thin shell。feature 固有 widget/VM は改修時に移動予定。

## 後方互換

全移動ファイルの旧パスに barrel re-export を配置。既存の import パスは変更不要。

## 次の移行対象

- Dashboard widget を owner 単位で features/ に回収（cross-cutting widget は shared 維持）
- domain/calculations/ の feature 移動は別 Epic

## Phase 実行履歴

| Phase | 内容 | 完了日 |
|-------|------|--------|
| Phase 0 | features 契約固定（README + guard + migration status） | 2026-03-31 |
| Phase 1 | sales を参照実装に昇格 | 2026-03-31 |
| Phase 2 | storage-admin を feature 化 | 2026-03-31 |
| Phase 3 | budget / forecast を Insight seam から回収 | 2026-03-31 |
| Phase 4 | Dashboard widget 分類確認（cross-cutting は shared 維持） | 2026-03-31 |
| Phase 5 | purchase を feature 化 + category/cost-detail/reports placeholder | 2026-03-31 |
| Phase 6 | migration status 確定 | 2026-03-31 |
