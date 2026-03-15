import type { WidgetDef } from './types'
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
export const WIDGETS_KPI: readonly WidgetDef[] = [
  // ── 予算進捗ハブ（最上位: 予算達成 + 店別ドリルダウン + 予算ヘッダ） ──
  {
    id: 'widget-budget-achievement',
    label: '店別予算達成状況',
    group: '予算進捗',
    size: 'full',
    isVisible: ({ allStoreResults }) => allStoreResults.size > 0,
    render: (ctx) => <ConditionSummaryEnhanced ctx={ctx} />,
  },
]
