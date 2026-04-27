/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { WIDGET_OWNERSHIP } from '@/presentation/pages/Dashboard/widgets/widgetOwnership'

describe('WIDGET_OWNERSHIP registry', () => {
  it('contains expected widget-budget-achievement entry', () => {
    const entry = WIDGET_OWNERSHIP['widget-budget-achievement']
    expect(entry.owner).toBe('shared')
    expect(entry.reason.length).toBeGreaterThan(0)
  })

  it('assigns chart-daily-sales to sales feature', () => {
    expect(WIDGET_OWNERSHIP['chart-daily-sales'].owner).toBe('sales')
  })

  it('assigns chart-sales-purchase-comparison to purchase feature', () => {
    expect(WIDGET_OWNERSHIP['chart-sales-purchase-comparison'].owner).toBe('purchase')
  })

  it('assigns analysis-gp-heatmap to budget feature', () => {
    expect(WIDGET_OWNERSHIP['analysis-gp-heatmap'].owner).toBe('budget')
  })

  it('assigns duckdb-category-mix to category feature', () => {
    expect(WIDGET_OWNERSHIP['duckdb-category-mix'].owner).toBe('category')
  })

  it('assigns exec-forecast-tools to forecast feature', () => {
    expect(WIDGET_OWNERSHIP['exec-forecast-tools'].owner).toBe('forecast')
  })

  it('assigns exec-daily-inventory to cost-detail feature', () => {
    expect(WIDGET_OWNERSHIP['exec-daily-inventory'].owner).toBe('cost-detail')
  })

  it('assigns analysis-seasonal-benchmark to forecast feature', () => {
    expect(WIDGET_OWNERSHIP['analysis-seasonal-benchmark'].owner).toBe('forecast')
  })

  it('has all entries with non-empty reason text', () => {
    const entries = Object.values(WIDGET_OWNERSHIP)
    expect(entries.length).toBeGreaterThan(20)
    for (const e of entries) {
      expect(typeof e.reason).toBe('string')
      expect(e.reason.length).toBeGreaterThan(5)
    }
  })

  it('uses only valid owner values', () => {
    const validOwners = new Set([
      'sales',
      'budget',
      'forecast',
      'category',
      'purchase',
      'cost-detail',
      'reports',
      'shared',
    ])
    for (const entry of Object.values(WIDGET_OWNERSHIP)) {
      expect(validOwners.has(entry.owner)).toBe(true)
    }
  })

  it('has multiple shared widgets', () => {
    const shared = Object.values(WIDGET_OWNERSHIP).filter((e) => e.owner === 'shared')
    expect(shared.length).toBeGreaterThanOrEqual(3)
  })
})
