/**
 * SalesFactTypes — Zod 契約の純粋テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  SalesFactQueryInput,
  SalesFactDailyRow,
  SalesFactHourlyRow,
  SalesFactReadModel,
} from './SalesFactTypes'

describe('SalesFactQueryInput', () => {
  it('parses minimal input', () => {
    const parsed = SalesFactQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
    })
    expect(parsed.dateFrom).toBe('2024-06-01')
  })

  it('accepts optional isPrevYear flag', () => {
    const parsed = SalesFactQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
      isPrevYear: true,
    })
    expect(parsed.isPrevYear).toBe(true)
  })

  it('accepts optional storeIds', () => {
    const parsed = SalesFactQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
      storeIds: ['S01'],
    })
    expect(parsed.storeIds).toEqual(['S01'])
  })

  it('rejects missing dateTo', () => {
    expect(() => SalesFactQueryInput.parse({ dateFrom: '2024-06-01' })).toThrow()
  })

  it('rejects non-boolean isPrevYear', () => {
    expect(() =>
      SalesFactQueryInput.parse({
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
        isPrevYear: 'yes',
      }),
    ).toThrow()
  })
})

describe('SalesFactDailyRow', () => {
  const makeRow = () => ({
    storeId: 'S01',
    day: 15,
    dow: 3,
    deptCode: 'D01',
    deptName: '野菜',
    lineCode: 'L01',
    lineName: '葉物',
    klassCode: 'K01',
    klassName: 'レタス',
    totalAmount: 10000,
    totalQuantity: 50,
  })

  it('parses valid daily row', () => {
    const parsed = SalesFactDailyRow.parse(makeRow())
    expect(parsed.totalAmount).toBe(10000)
    expect(parsed.totalQuantity).toBe(50)
  })

  it('rejects missing deptName', () => {
    const bad = makeRow()
    delete (bad as Partial<typeof bad>).deptName
    expect(() => SalesFactDailyRow.parse(bad)).toThrow()
  })

  it('rejects non-number day', () => {
    const bad = { ...makeRow(), day: '15' }
    expect(() => SalesFactDailyRow.parse(bad)).toThrow()
  })

  it('accepts zero totals', () => {
    const parsed = SalesFactDailyRow.parse({ ...makeRow(), totalAmount: 0, totalQuantity: 0 })
    expect(parsed.totalAmount).toBe(0)
  })
})

describe('SalesFactHourlyRow', () => {
  const makeRow = () => ({
    storeId: 'S01',
    day: 15,
    deptCode: 'D01',
    lineCode: 'L01',
    klassCode: 'K01',
    hour: 10,
    amount: 5000,
    quantity: 20,
  })

  it('parses valid hourly row', () => {
    const parsed = SalesFactHourlyRow.parse(makeRow())
    expect(parsed.hour).toBe(10)
    expect(parsed.amount).toBe(5000)
  })

  it('rejects missing hour', () => {
    const bad = makeRow()
    delete (bad as Partial<typeof bad>).hour
    expect(() => SalesFactHourlyRow.parse(bad)).toThrow()
  })

  it('rejects non-number amount', () => {
    expect(() => SalesFactHourlyRow.parse({ ...makeRow(), amount: null })).toThrow()
  })
})

describe('SalesFactReadModel', () => {
  const makeModel = () => ({
    daily: [],
    hourly: [],
    grandTotalAmount: 0,
    grandTotalQuantity: 0,
    meta: {
      usedFallback: false,
      missingPolicy: 'zero' as const,
      dataVersion: 1,
    },
  })

  it('parses empty read model', () => {
    const parsed = SalesFactReadModel.parse(makeModel())
    expect(parsed.daily).toHaveLength(0)
    expect(parsed.hourly).toHaveLength(0)
  })

  it('rejects invalid missingPolicy literal', () => {
    const bad = makeModel()
    ;(bad.meta as unknown as { missingPolicy: string }).missingPolicy = 'drop'
    expect(() => SalesFactReadModel.parse(bad)).toThrow()
  })

  it('rejects non-array daily', () => {
    const bad = makeModel()
    ;(bad as unknown as { daily: unknown }).daily = null
    expect(() => SalesFactReadModel.parse(bad)).toThrow()
  })

  it('rejects missing meta', () => {
    const bad = makeModel()
    delete (bad as Partial<typeof bad>).meta
    expect(() => SalesFactReadModel.parse(bad)).toThrow()
  })

  it('rejects non-boolean usedFallback', () => {
    const bad = makeModel()
    ;(bad.meta as unknown as { usedFallback: number }).usedFallback = 0
    expect(() => SalesFactReadModel.parse(bad)).toThrow()
  })
})
