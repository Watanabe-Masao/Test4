/**
 * readCustomerFact の pure builder + helper テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  buildCustomerFactReadModel,
  toStoreCustomerRows,
  toDailyCustomerRows,
  toStoreDayCustomerRows,
} from './readCustomerFact'
import type { CustomerDailyRow } from '@/infrastructure/duckdb/queries/storeDaySummary'

const row = (storeId: string, day: number, customers: number | null): CustomerDailyRow =>
  ({ storeId, day, customers }) as unknown as CustomerDailyRow

describe('buildCustomerFactReadModel', () => {
  it('builds empty model when no rows', () => {
    const model = buildCustomerFactReadModel([], 1)
    expect(model.daily).toEqual([])
    expect(model.grandTotalCustomers).toBe(0)
    expect(model.meta.dataVersion).toBe(1)
    expect(model.meta.usedFallback).toBe(false)
    expect(model.meta.missingPolicy).toBe('zero')
  })

  it('sums customers across rows', () => {
    const rows = [row('s1', 1, 100), row('s1', 2, 200), row('s2', 1, 50)]
    const model = buildCustomerFactReadModel(rows, 7)
    expect(model.grandTotalCustomers).toBe(350)
    expect(model.daily).toHaveLength(3)
    expect(model.meta.dataVersion).toBe(7)
  })

  it('treats null customers as 0', () => {
    const rows = [row('s1', 1, null), row('s1', 2, 42)]
    const model = buildCustomerFactReadModel(rows, 1)
    expect(model.grandTotalCustomers).toBe(42)
    expect(model.daily[0].customers).toBe(0)
    expect(model.daily[1].customers).toBe(42)
  })

  it('preserves row identity (storeId + day)', () => {
    const rows = [row('s1', 15, 10)]
    const model = buildCustomerFactReadModel(rows, 1)
    expect(model.daily[0]).toEqual({ storeId: 's1', day: 15, customers: 10 })
  })
})

describe('toStoreCustomerRows', () => {
  it('aggregates by storeId', () => {
    const model = buildCustomerFactReadModel(
      [row('s1', 1, 10), row('s1', 2, 20), row('s2', 1, 5)],
      1,
    )
    const m = toStoreCustomerRows(model)
    expect(m.get('s1')).toBe(30)
    expect(m.get('s2')).toBe(5)
    expect(m.size).toBe(2)
  })

  it('returns empty map for empty model', () => {
    const model = buildCustomerFactReadModel([], 1)
    expect(toStoreCustomerRows(model).size).toBe(0)
  })
})

describe('toDailyCustomerRows', () => {
  it('aggregates by day across stores', () => {
    const model = buildCustomerFactReadModel(
      [row('s1', 1, 10), row('s2', 1, 20), row('s1', 2, 5)],
      1,
    )
    const m = toDailyCustomerRows(model)
    expect(m.get(1)).toBe(30)
    expect(m.get(2)).toBe(5)
    expect(m.size).toBe(2)
  })
})

describe('toStoreDayCustomerRows', () => {
  it('keys by "storeId:day"', () => {
    const model = buildCustomerFactReadModel([row('s1', 1, 10), row('s1', 2, 20)], 1)
    const m = toStoreDayCustomerRows(model)
    expect(m.get('s1:1')).toBe(10)
    expect(m.get('s1:2')).toBe(20)
  })

  it('sums duplicate storeId:day pairs', () => {
    const model = buildCustomerFactReadModel([row('s1', 1, 10), row('s1', 1, 5)], 1)
    const m = toStoreDayCustomerRows(model)
    expect(m.get('s1:1')).toBe(15)
    expect(m.size).toBe(1)
  })
})
