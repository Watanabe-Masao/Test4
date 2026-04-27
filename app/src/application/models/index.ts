/**
 * application/models バレル
 *
 * 分析 UI の文脈・イベント契約を re-export する。
 *
 * @responsibility R:unclassified
 */
export type { SalesAnalysisContext, HierarchySelection } from './SalesAnalysisContext'
export { buildSalesAnalysisContext, deriveChildContext } from './SalesAnalysisContext'

export type { AnalysisViewEvents, CategoryFocus } from './AnalysisViewEvents'

export type {
  AnalysisNodeType,
  AnalysisFocus,
  TopDepartmentPolicy,
  AnalysisNodeContext,
} from './AnalysisNodeContext'
export {
  DEFAULT_TOP_DEPARTMENT_POLICY,
  deriveNodeContext,
  buildRootNodeContext,
  deriveDeptPatternContext,
  deriveCategoryDrilldownContext,
} from './AnalysisNodeContext'
