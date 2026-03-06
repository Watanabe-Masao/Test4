/**
 * formulaResolver
 *
 * MetricId から FORMULA_REGISTRY を参照し、FormulaDetail を解決する。
 * METRIC_DEFS の formulaRef フィールドをキーにレジストリを引く。
 */
import type { MetricId, FormulaDetail } from '@/domain/models'
import { METRIC_DEFS } from '@/domain/constants/metricDefs'
import { FORMULA_REGISTRY } from '@/domain/constants/formulaRegistry'

/**
 * MetricId → formulaRef → FORMULA_REGISTRY の解決。
 * formulaRef が未定義または未登録ならば undefined を返す。
 */
export function resolveFormulaDetail(metricId: MetricId): FormulaDetail | undefined {
  const meta = METRIC_DEFS[metricId]
  if (!meta?.formulaRef) return undefined
  const formula = FORMULA_REGISTRY[meta.formulaRef]
  if (!formula) return undefined
  return {
    expression: formula.expression,
    category: formula.category,
    description: formula.description,
    inputBindings: formula.inputs.map((inp) => ({
      name: inp.name,
      label: inp.label,
      source: inp.source,
    })),
  }
}
