import type { WidgetDef } from './types'
import { ConditionSummaryEnhanced } from './ConditionSummaryEnhanced'
import { KpiSummaryTable } from './KpiSummaryTable'

/**
 * KPI ウィジェットレジストリ
 *
 * KPIカード選定基準:
 *   「基準値に対して今どうか？」が答えられ、ドリルダウンで深掘りできるもののみ。
 *   予算・前年・目標・あるべき姿に対しての比較が成立しないものはテーブル行で十分。
 *
 * メトリクス階層:
 *   主1: 売上予算 + Sub2(客数/客単価) → シャープリー直結
 *   主2: 粗利額+粗利率予算 + Sub1(値入率/売変率) → 原価分析直結
 *
 * 削除済み（テーブル行 or ConditionSummaryEnhanced に吸収）:
 *   kpi-core-sales, kpi-total-cost, kpi-inv-gross-profit, kpi-est-margin,
 *   kpi-inventory-cost, kpi-delivery-sales, kpi-cost-inclusion,
 *   kpi-discount-loss, kpi-core-markup,
 *   kpi-py-same-dow, kpi-py-same-date, kpi-dow-gap
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
  // ── 収益概況テーブル（主1+Sub2, 主2+Sub1） ──
  {
    id: 'kpi-summary-table',
    label: '収益概況',
    group: '収益概況',
    size: 'full',
    render: (ctx) => <KpiSummaryTable ctx={ctx} />,
  },
]
