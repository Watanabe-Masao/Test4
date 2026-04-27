/**
 * duckdbFingerprint.ts — pure fingerprint function test
 *
 * 検証対象:
 * - computeFingerprint: data=null でも文字列返す + storedMonthsKey が含まれる
 * - computeFingerprint: records 数 + stores/budget/settings サイズ反映
 * - computeMonthFingerprint: 単月の全 field 反映
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { computeFingerprint, computeMonthFingerprint } from '../duckdbFingerprint'
import type { MonthlyData } from '@/domain/models/MonthlyData'

function makeMonthlyData(
  classifiedSalesCount: number = 0,
  purchaseCount: number = 0,
  storesSize: number = 0,
): MonthlyData {
  const storeEntries = Array.from(
    { length: storesSize },
    (_, i) => [`s${i}`, {}] as [string, object],
  )
  return {
    classifiedSales: { records: new Array(classifiedSalesCount) },
    categoryTimeSales: { records: [] },
    departmentKpi: { records: [] },
    purchase: { records: new Array(purchaseCount) },
    flowers: { records: [] },
    stores: new Map(storeEntries),
    budget: new Map(),
    settings: new Map(),
  } as unknown as MonthlyData
}

describe('computeFingerprint', () => {
  it('data=null でも文字列を返す (0 デフォルト + 年月 + storedKey)', () => {
    const result = computeFingerprint(null, 2026, 4, 'key-abc')
    // year=2026, month=4, 全 count=0, storedMonthsKey='key-abc'
    expect(result).toBe('2026:4:0:0:0:0:0:0:0:0:0:0:key-abc')
  })

  it('year / month が変わると fingerprint も変わる', () => {
    const f1 = computeFingerprint(null, 2026, 4, 'k')
    const f2 = computeFingerprint(null, 2026, 5, 'k')
    expect(f1).not.toBe(f2)
  })

  it('storedMonthsKey が変わると fingerprint も変わる', () => {
    const f1 = computeFingerprint(null, 2026, 4, 'key-a')
    const f2 = computeFingerprint(null, 2026, 4, 'key-b')
    expect(f1).not.toBe(f2)
  })

  it('data の records 数が反映される', () => {
    const data = makeMonthlyData(100, 50)
    const fp = computeFingerprint(data, 2026, 4, 'k')
    // classifiedSales=100, prevYear=0, cts=0, prev cts=0, dept=0, purchase=50
    expect(fp).toContain(':100:0:0:0:0:50:')
  })

  it('prevYear の records 数も反映される', () => {
    const cur = makeMonthlyData(100)
    const prev = makeMonthlyData(80)
    const fp = computeFingerprint(cur, 2026, 4, 'k', prev)
    expect(fp).toContain(':100:80:')
  })

  it('stores / budget / settings の size が反映される', () => {
    const data = makeMonthlyData(0, 0, 3)
    const fp = computeFingerprint(data, 2026, 4, 'k')
    // stores=3 が含まれる
    expect(fp.split(':')).toContain('3')
  })
})

describe('computeMonthFingerprint', () => {
  it('空 data で全て 0 の fingerprint を返す', () => {
    const data = makeMonthlyData()
    const fp = computeMonthFingerprint(data)
    expect(fp).toBe('0:0:0:0:0:0:0:0')
  })

  it('records 数が反映される', () => {
    const data = makeMonthlyData(5, 3)
    const fp = computeMonthFingerprint(data)
    // classifiedSales=5 / categoryTimeSales=0 / deptKpi=0 / purchase=3
    expect(fp).toBe('5:0:0:3:0:0:0:0')
  })

  it('stores Map.size が反映される', () => {
    const data = makeMonthlyData(0, 0, 4)
    const fp = computeMonthFingerprint(data)
    // classifiedSales=0 / cts=0 / dept=0 / purchase=0 / flowers=0 / stores=4
    expect(fp).toBe('0:0:0:0:0:4:0:0')
  })
})
