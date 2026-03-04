import { describe, it, expect } from 'vitest'
import { TEMPLATE_TYPES, TEMPLATE_LABELS } from '../ExportPort'
import type { TemplateDataType } from '../ExportPort'

describe('ExportPort constants', () => {
  it('TEMPLATE_TYPES has all 9 data types', () => {
    expect(TEMPLATE_TYPES).toHaveLength(9)
  })

  it('every TEMPLATE_TYPE has a label', () => {
    for (const t of TEMPLATE_TYPES) {
      expect(TEMPLATE_LABELS[t]).toBeTruthy()
    }
  })

  it('includes expected types', () => {
    const types = new Set<TemplateDataType>(TEMPLATE_TYPES)
    expect(types.has('purchase')).toBe(true)
    expect(types.has('classifiedSales')).toBe(true)
    expect(types.has('flowers')).toBe(true)
    expect(types.has('directProduce')).toBe(true)
    expect(types.has('interStoreOut')).toBe(true)
    expect(types.has('interStoreIn')).toBe(true)
    expect(types.has('budget')).toBe(true)
    expect(types.has('categoryTimeSales')).toBe(true)
    expect(types.has('consumables')).toBe(true)
  })

  it('labels are in Japanese', () => {
    expect(TEMPLATE_LABELS.purchase).toBe('仕入')
    expect(TEMPLATE_LABELS.budget).toBe('売上予算')
  })
})
