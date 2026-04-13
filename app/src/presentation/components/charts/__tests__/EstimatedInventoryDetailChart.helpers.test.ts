/**
 * EstimatedInventoryDetailChart.helpers.ts — helper tests
 */
import { describe, it, expect } from 'vitest'
import { createFmt, AGG_LABELS } from '../EstimatedInventoryDetailChart.helpers'

describe('createFmt', () => {
  it('wraps a CurrencyFormatter as number → string function', () => {
    const base = ((v: number) => `¥${v}`) as unknown as import('../chartTheme').CurrencyFormatter
    const fmt = createFmt(base)
    expect(fmt(100)).toBe('¥100')
    expect(fmt(0)).toBe('¥0')
  })

  it('preserves per-call formatter behavior', () => {
    let called = 0
    const base = ((v: number) => {
      called++
      return `${v}!`
    }) as unknown as import('../chartTheme').CurrencyFormatter
    const fmt = createFmt(base)
    fmt(1)
    fmt(2)
    expect(called).toBe(2)
  })
})

describe('AGG_LABELS', () => {
  it('includes all aggregate label keys', () => {
    expect(AGG_LABELS.inventoryCost).toBe('在庫仕入原価')
    expect(AGG_LABELS.estCogs).toBe('推定原価')
    expect(AGG_LABELS.estimated).toBe('推定在庫')
  })

  it('returns undefined for unknown keys', () => {
    expect(AGG_LABELS.unknown).toBeUndefined()
  })
})
