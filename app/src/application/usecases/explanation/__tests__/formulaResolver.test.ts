/**
 * @taxonomyKind T:unclassified
 */

import { describe, expect, it } from 'vitest'
import { resolveFormulaDetail } from '../formulaResolver'
import { METRIC_DEFS } from '@/domain/constants/metricDefs'
import { FORMULA_REGISTRY } from '@/domain/constants/formulaRegistry'
import type { MetricId } from '@/domain/models/analysis'

describe('resolveFormulaDetail', () => {
  it('returns undefined for a metric without formulaRef', () => {
    // salesTotal is defined without formulaRef
    expect(METRIC_DEFS.salesTotal?.formulaRef).toBeUndefined()
    expect(resolveFormulaDetail('salesTotal')).toBeUndefined()
  })

  it('returns undefined for an unknown metric id', () => {
    const unknown = '__definitely_not_a_metric__' as MetricId
    expect(resolveFormulaDetail(unknown)).toBeUndefined()
  })

  it('resolves a known metric with formulaRef into FormulaDetail', () => {
    // Pick the first MetricId in METRIC_DEFS that has a formulaRef
    // pointing to an entry that actually exists in FORMULA_REGISTRY.
    const ids = Object.keys(METRIC_DEFS) as MetricId[]
    const resolved = ids.find((id) => {
      const ref = METRIC_DEFS[id]?.formulaRef
      return ref !== undefined && FORMULA_REGISTRY[ref] !== undefined
    })
    expect(resolved).toBeDefined()
    const detail = resolveFormulaDetail(resolved!)
    expect(detail).toBeDefined()
    const ref = METRIC_DEFS[resolved!]!.formulaRef!
    const formula = FORMULA_REGISTRY[ref]!
    expect(detail!.expression).toBe(formula.expression)
    expect(detail!.category).toBe(formula.category)
    expect(detail!.description).toBe(formula.description)
    expect(detail!.inputBindings).toEqual(
      formula.inputs.map((inp) => ({
        name: inp.name,
        label: inp.label,
        source: inp.source,
      })),
    )
  })

  it('preserves the same number of inputBindings as formula.inputs', () => {
    const ids = Object.keys(METRIC_DEFS) as MetricId[]
    for (const id of ids) {
      const detail = resolveFormulaDetail(id)
      if (!detail) continue
      const ref = METRIC_DEFS[id]!.formulaRef!
      const formula = FORMULA_REGISTRY[ref]!
      expect(detail.inputBindings.length).toBe(formula.inputs.length)
    }
  })
})
