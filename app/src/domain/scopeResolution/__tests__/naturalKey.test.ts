/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { naturalKey } from '../naturalKey'
import type { CategoryTimeSalesRecord } from '../../models/DataTypes'
import type { ClassifiedSalesRecord } from '../../models/ClassifiedSales'

describe('naturalKey', () => {
  const base = { year: 2025, month: 2, day: 15, storeId: '001' }

  it('purchase: prefix + year/month/day/storeId', () => {
    expect(naturalKey('purchase', base)).toBe('purchase\t2025\t2\t15\t001')
  })

  it('flowers: prefix + year/month/day/storeId', () => {
    expect(naturalKey('flowers', base)).toBe('flowers\t2025\t2\t15\t001')
  })

  it('directProduce: dp prefix', () => {
    expect(naturalKey('directProduce', base)).toBe('dp\t2025\t2\t15\t001')
  })

  it('interStoreIn: isi prefix', () => {
    expect(naturalKey('interStoreIn', base)).toBe('isi\t2025\t2\t15\t001')
  })

  it('interStoreOut: iso prefix', () => {
    expect(naturalKey('interStoreOut', base)).toBe('iso\t2025\t2\t15\t001')
  })

  it('consumables: con prefix', () => {
    expect(naturalKey('consumables', base)).toBe('con\t2025\t2\t15\t001')
  })

  it('classifiedSales: cs prefix + group/dept/line/class', () => {
    const rec = {
      ...base,
      groupName: 'G1',
      departmentName: 'D1',
      lineName: 'L1',
      className: 'C1',
    } as ClassifiedSalesRecord
    expect(naturalKey('classifiedSales', rec)).toBe('cs\t2025\t2\t15\t001\tG1\tD1\tL1\tC1')
  })

  it('categoryTimeSales: cts prefix + dept/line/klass codes', () => {
    const rec = {
      ...base,
      department: { code: '01', name: 'Dept' },
      line: { code: '02', name: 'Line' },
      klass: { code: '03', name: 'Klass' },
      timeSlots: [],
      totalQuantity: 0,
      totalAmount: 0,
    } as CategoryTimeSalesRecord
    expect(naturalKey('categoryTimeSales', rec)).toBe('cts\t2025\t2\t15\t001\t01\t02\t03')
  })

  it('異なるデータ種別は衝突しない', () => {
    const keys = [
      naturalKey('purchase', base),
      naturalKey('flowers', base),
      naturalKey('directProduce', base),
      naturalKey('interStoreIn', base),
      naturalKey('interStoreOut', base),
      naturalKey('consumables', base),
    ]
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})
