/**
 * useDataPreview — transformCtsPreview tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { transformCtsPreview } from '../useDataPreview'

function raw(overrides: Record<string, unknown> = {}) {
  return {
    day: 1,
    storeId: 's1',
    department: { name: '野菜' },
    line: { name: '葉物' },
    klass: { name: '単品' },
    totalAmount: 1000,
    totalQuantity: 10,
    ...overrides,
  } as never
}

describe('transformCtsPreview', () => {
  it('undefined / null で空配列', () => {
    expect(transformCtsPreview(undefined)).toEqual([])
  })

  it('空配列で空配列', () => {
    expect(transformCtsPreview([])).toEqual([])
  })

  it('単一 raw を変換', () => {
    const r = transformCtsPreview([raw({ totalAmount: 500, totalQuantity: 5 })])
    expect(r).toHaveLength(1)
    expect(r[0].amount).toBe(500)
    expect(r[0].qty).toBe(5)
    expect(r[0].dept).toBe('野菜')
    expect(r[0].line).toBe('葉物')
    expect(r[0].klass).toBe('単品')
  })

  it('200 件までに制限', () => {
    const records = Array.from({ length: 300 }, (_, i) => raw({ day: i + 1 }))
    const r = transformCtsPreview(records)
    expect(r).toHaveLength(200)
    expect(r[0].day).toBe(1)
    expect(r[199].day).toBe(200)
  })

  it('200 件以下は全件返す', () => {
    const records = Array.from({ length: 150 }, (_, i) => raw({ day: i + 1 }))
    const r = transformCtsPreview(records)
    expect(r).toHaveLength(150)
  })

  it('フィールドマッピング: department.name → dept', () => {
    const r = transformCtsPreview([
      raw({
        department: { name: 'DeptA' },
        line: { name: 'LineB' },
        klass: { name: 'KlassC' },
      }),
    ])
    expect(r[0].dept).toBe('DeptA')
    expect(r[0].line).toBe('LineB')
    expect(r[0].klass).toBe('KlassC')
  })

  it('day / storeId は pass-through', () => {
    const r = transformCtsPreview([raw({ day: 15, storeId: 'store-99' })])
    expect(r[0].day).toBe(15)
    expect(r[0].storeId).toBe('store-99')
  })
})
