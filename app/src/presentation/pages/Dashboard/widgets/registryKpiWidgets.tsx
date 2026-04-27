/**
 * @responsibility R:unclassified
 */

import type { DashboardWidgetDef } from './types'
import { ConditionSummaryEnhanced } from './ConditionSummaryEnhanced'

/**
 * KPI ウィジェットレジストリ
 *
 * 削除済み（ConditionSummaryEnhanced に吸収）:
 *   kpi-core-sales, kpi-total-cost, kpi-inv-gross-profit, kpi-est-margin,
 *   kpi-inventory-cost, kpi-delivery-sales, kpi-cost-inclusion,
 *   kpi-discount-loss, kpi-core-markup,
 *   kpi-py-same-dow, kpi-py-same-date, kpi-dow-gap,
 *   kpi-summary-table (収益概況テーブル)
 */

// ── KPI Widgets ──
export const WIDGETS_KPI: readonly DashboardWidgetDef[] = [
  // ── 予算進捗ハブ（最上位: 予算達成 + 店別ドリルダウン + 予算ヘッダ） ──
  {
    /** @widget-id WID-001 */
    id: 'widget-budget-achievement',
    label: '店別予算達成状況',
    group: '予算進捗',
    size: 'full',
    isVisible: ({ allStoreResults }) => allStoreResults.size > 0,
    render: (ctx) => (
      <ConditionSummaryEnhanced
        elapsedDays={ctx.elapsedDays}
        year={ctx.year}
        month={ctx.month}
        comparisonScope={ctx.comparisonScope}
        currentCtsQuantity={ctx.currentCtsQuantity}
        result={ctx.result}
        prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
        dowGap={ctx.dowGap}
        allStoreResults={ctx.allStoreResults}
        fmtCurrency={ctx.fmtCurrency}
        prevYear={ctx.prevYear}
        prevYearStoreCostPrice={ctx.prevYearStoreCostPrice}
        readModels={ctx.readModels}
        stores={ctx.stores}
        onPrevYearDetail={ctx.onPrevYearDetail}
        daysInMonth={ctx.daysInMonth}
        prevYearScope={ctx.prevYearScope}
        dataMaxDay={ctx.dataMaxDay}
        queryExecutor={ctx.queryExecutor}
      />
    ),
  },
]
