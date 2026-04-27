/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  isBudgetMetric,
  METRIC_DEFS,
  type MetricKey,
} from '@/presentation/pages/Dashboard/widgets/conditionSummaryTypes'

describe('isBudgetMetric', () => {
  it('returns true for sales', () => {
    expect(isBudgetMetric('sales')).toBe(true)
  })

  it('returns true for gp', () => {
    expect(isBudgetMetric('gp')).toBe(true)
  })

  it('returns true for gpRate', () => {
    expect(isBudgetMetric('gpRate')).toBe(true)
  })

  it('returns false for markupRate', () => {
    expect(isBudgetMetric('markupRate')).toBe(false)
  })

  it('returns false for discountRate', () => {
    expect(isBudgetMetric('discountRate')).toBe(false)
  })

  it('acts as type guard', () => {
    const k: MetricKey = 'sales'
    if (isBudgetMetric(k)) {
      const budget: 'sales' | 'gp' | 'gpRate' = k
      expect(budget).toBe('sales')
    }
  })
})

describe('METRIC_DEFS', () => {
  it('defines all 5 metric keys', () => {
    expect(Object.keys(METRIC_DEFS).sort()).toEqual(
      ['discountRate', 'gp', 'gpRate', 'markupRate', 'sales'].sort(),
    )
  })

  it('sales has label "売上" and is not rate', () => {
    expect(METRIC_DEFS.sales.label).toBe('売上')
    expect(METRIC_DEFS.sales.isRate).toBe(false)
    expect(METRIC_DEFS.sales.icon).toBe('S')
  })

  it('gp is not rate, gpRate is rate', () => {
    expect(METRIC_DEFS.gp.isRate).toBe(false)
    expect(METRIC_DEFS.gpRate.isRate).toBe(true)
  })

  it('markupRate and discountRate are rate-typed', () => {
    expect(METRIC_DEFS.markupRate.isRate).toBe(true)
    expect(METRIC_DEFS.discountRate.isRate).toBe(true)
  })

  it('all entries have color hex string', () => {
    for (const def of Object.values(METRIC_DEFS)) {
      expect(def.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('all entries have non-empty icon and label', () => {
    for (const def of Object.values(METRIC_DEFS)) {
      expect(def.icon.length).toBeGreaterThan(0)
      expect(def.label.length).toBeGreaterThan(0)
    }
  })
})
