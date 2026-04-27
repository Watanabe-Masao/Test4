/**
 * DiscountFactTypes — Zod 契約の純粋テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { DiscountFactQueryInput, DiscountFactRow, DiscountFactReadModel } from './DiscountFactTypes'

describe('DiscountFactQueryInput', () => {
  it('parses minimal input', () => {
    const parsed = DiscountFactQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
    })
    expect(parsed.dateFrom).toBe('2024-06-01')
    expect(parsed.dateTo).toBe('2024-06-30')
  })

  it('accepts isPrevYear flag', () => {
    const parsed = DiscountFactQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
      isPrevYear: false,
    })
    expect(parsed.isPrevYear).toBe(false)
  })

  it('accepts storeIds array', () => {
    const parsed = DiscountFactQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
      storeIds: ['S01', 'S02', 'S03'],
    })
    expect(parsed.storeIds).toHaveLength(3)
  })

  it('rejects missing dateFrom', () => {
    expect(() => DiscountFactQueryInput.parse({ dateTo: '2024-06-30' })).toThrow()
  })

  it('rejects non-array storeIds', () => {
    expect(() =>
      DiscountFactQueryInput.parse({
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
        storeIds: 'S01',
      }),
    ).toThrow()
  })
})

describe('DiscountFactRow', () => {
  const makeRow = () => ({
    storeId: 'S01',
    day: 5,
    deptCode: 'D01',
    deptName: '青果',
    lineCode: 'L01',
    lineName: '葉物',
    klassCode: 'K01',
    klassName: 'レタス',
    discount71: 100,
    discount72: 50,
    discount73: 25,
    discount74: 10,
    discountTotal: 185,
  })

  it('parses valid discount row', () => {
    const parsed = DiscountFactRow.parse(makeRow())
    expect(parsed.discountTotal).toBe(185)
    expect(parsed.discount71).toBe(100)
  })

  it('accepts zero discounts', () => {
    const parsed = DiscountFactRow.parse({
      ...makeRow(),
      discount71: 0,
      discount72: 0,
      discount73: 0,
      discount74: 0,
      discountTotal: 0,
    })
    expect(parsed.discountTotal).toBe(0)
  })

  it('rejects missing discount71', () => {
    const bad = makeRow()
    delete (bad as Partial<typeof bad>).discount71
    expect(() => DiscountFactRow.parse(bad)).toThrow()
  })

  it('rejects non-number discountTotal', () => {
    const bad = { ...makeRow(), discountTotal: '185' }
    expect(() => DiscountFactRow.parse(bad)).toThrow()
  })

  it('rejects missing klassName', () => {
    const bad = makeRow()
    delete (bad as Partial<typeof bad>).klassName
    expect(() => DiscountFactRow.parse(bad)).toThrow()
  })
})

describe('DiscountFactReadModel', () => {
  const makeModel = () => ({
    rows: [],
    grandTotal: 0,
    grandTotal71: 0,
    grandTotal72: 0,
    grandTotal73: 0,
    grandTotal74: 0,
    meta: {
      usedFallback: false,
      missingPolicy: 'zero' as const,
      dataVersion: 1,
    },
  })

  it('parses empty model', () => {
    const parsed = DiscountFactReadModel.parse(makeModel())
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.grandTotal).toBe(0)
  })

  it('parses model with rows', () => {
    const parsed = DiscountFactReadModel.parse({
      ...makeModel(),
      rows: [
        {
          storeId: 'S01',
          day: 1,
          deptCode: 'D01',
          deptName: '青果',
          lineCode: 'L01',
          lineName: '葉物',
          klassCode: 'K01',
          klassName: 'レタス',
          discount71: 10,
          discount72: 20,
          discount73: 30,
          discount74: 40,
          discountTotal: 100,
        },
      ],
      grandTotal: 100,
      grandTotal71: 10,
      grandTotal72: 20,
      grandTotal73: 30,
      grandTotal74: 40,
    })
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.grandTotal).toBe(100)
  })

  it('rejects invalid missingPolicy literal', () => {
    const bad = makeModel()
    ;(bad.meta as unknown as { missingPolicy: string }).missingPolicy = 'skip'
    expect(() => DiscountFactReadModel.parse(bad)).toThrow()
  })

  it('rejects missing grandTotal71', () => {
    const bad = makeModel()
    delete (bad as Partial<typeof bad>).grandTotal71
    expect(() => DiscountFactReadModel.parse(bad)).toThrow()
  })

  it('rejects non-number dataVersion', () => {
    const bad = makeModel()
    ;(bad.meta as unknown as { dataVersion: unknown }).dataVersion = null
    expect(() => DiscountFactReadModel.parse(bad)).toThrow()
  })

  it('rejects missing usedFallback', () => {
    const bad = makeModel()
    delete (bad.meta as Partial<typeof bad.meta>).usedFallback
    expect(() => DiscountFactReadModel.parse(bad)).toThrow()
  })
})
