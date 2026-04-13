/**
 * ChartRegistry.ts — registry structure tests
 */
import { describe, it, expect } from 'vitest'
import { CHART_REGISTRY, CHART_REGISTRY_MAP } from '../ChartRegistry'

describe('CHART_REGISTRY', () => {
  it('contains at least one entry', () => {
    expect(CHART_REGISTRY.length).toBeGreaterThan(0)
  })

  it('every entry has required fields', () => {
    for (const e of CHART_REGISTRY) {
      expect(typeof e.id).toBe('string')
      expect(e.id.length).toBeGreaterThan(0)
      expect(typeof e.label).toBe('string')
      expect(e.label.length).toBeGreaterThan(0)
      expect(typeof e.group).toBe('string')
      expect(['full', 'half', 'third', 'quarter']).toContain(e.size)
      expect(['sales', 'inventory', 'category', 'customer', 'forecast', 'shared']).toContain(
        e.domain,
      )
      expect(typeof e.isDirectoryStructure).toBe('boolean')
      expect(typeof e.path).toBe('string')
    }
  })

  it('entry ids are unique', () => {
    const ids = CHART_REGISTRY.map((e) => e.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('exposes the gross-profit rate chart with its data requirements', () => {
    const e = CHART_REGISTRY.find((x) => x.id === 'chart-gp-rate')
    expect(e).toBeTruthy()
    expect(e?.domain).toBe('sales')
    expect(e?.isDirectoryStructure).toBe(true)
    expect(e?.dataRequirements.writeModel).toContain('daily')
    expect(e?.dataRequirements.writeModel).toContain('totalSales')
    expect(e?.dataRequirements.writeModel).toContain('totalCost')
  })

  it('registered metricIds for chart-gp-rate include rate metrics', () => {
    const e = CHART_REGISTRY.find((x) => x.id === 'chart-gp-rate')
    expect(e?.metricIds).toContain('invMethodGrossProfitRate')
    expect(e?.metricIds).toContain('estMethodMarginRate')
  })
})

describe('CHART_REGISTRY_MAP', () => {
  it('maps each registry id to the entry', () => {
    expect(CHART_REGISTRY_MAP.size).toBe(CHART_REGISTRY.length)
    for (const e of CHART_REGISTRY) {
      expect(CHART_REGISTRY_MAP.get(e.id)).toBe(e)
    }
  })

  it('returns undefined for unknown id', () => {
    expect(CHART_REGISTRY_MAP.get('does-not-exist')).toBeUndefined()
  })
})
