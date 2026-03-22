/**
 * application/models バレル
 *
 * 分析 UI の文脈・イベント契約を re-export する。
 */
export type { SalesAnalysisContext, HierarchySelection } from './SalesAnalysisContext'
export { buildSalesAnalysisContext, deriveChildContext } from './SalesAnalysisContext'

export type { AnalysisViewEvents, CategoryFocus } from './AnalysisViewEvents'
