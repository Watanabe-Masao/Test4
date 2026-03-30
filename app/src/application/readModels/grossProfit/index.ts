/**
 * 粗利計算正本 — バレルエクスポート
 */
export { GrossProfitReadModel, GrossProfitInput, GrossProfitMeta } from './GrossProfitTypes'
export type {
  GrossProfitReadModel as GrossProfitReadModelType,
  GrossProfitInput as GrossProfitInputType,
  GrossProfitResult,
  GrossProfitMeta as GrossProfitMetaType,
} from './GrossProfitTypes'
export {
  calculateGrossProfit,
  calculateGrossProfitWithFallback,
  grossProfitFromStoreResult,
} from './calculateGrossProfit'
export { GROSS_PROFIT_LABELS } from './grossProfitLabels'
export { getEffectiveGrossProfitRate, getEffectiveGrossProfit } from '@/domain/calculations/utils'
