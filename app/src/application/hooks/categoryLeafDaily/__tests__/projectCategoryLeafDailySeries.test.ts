/**
 * projectCategoryLeafDailySeries — parity / truth-table test
 *
 * `CategoryTimeSalesRecord[] → CategoryLeafDailySeries` 変換の意味を固定する。
 *
 * 凍結対象:
 *   1. 空入力 → 空 series（dayCount は options 通り伝搬）
 *   2. grandTotals が全 records の totalAmount / totalQuantity の合計と一致
 *   3. entries は入力 records と一対一対応（index 順も保持）
 *   4. dayCount は options からそのまま伝搬
 *   5. flat field parity (category-leaf-daily-entry-shape-break Phase 1):
 *      entry の `deptCode` / `deptName` / `lineCode` / `lineName` / `klassCode` /
 *      `klassName` が必ず nested field の対応する値と一致する
 *      (projection が唯一の生成点であることを不変として凍結)
 *   6. 既存 nested field (`department.code` 等) は intersection 型として残存し
 *      consumer が参照可能（Phase 4 で独立 interface 化する際に解除予定）
 */
import { describe, it, expect } from 'vitest'
import { projectCategoryLeafDailySeries } from '../projectCategoryLeafDailySeries'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

function makeRec(
  dept: string,
  line: string,
  klass: string,
  totalAmount: number,
  totalQuantity: number,
): CategoryTimeSalesRecord {
  return {
    timeSlots: [],
    totalAmount,
    totalQuantity,
    department: { code: dept, name: dept },
    line: { code: line, name: line },
    klass: { code: klass, name: klass },
  } as unknown as CategoryTimeSalesRecord
}

describe('projectCategoryLeafDailySeries', () => {
  it('空 records → entries 空 + grandTotals 0 + dayCount 伝搬', () => {
    const result = projectCategoryLeafDailySeries([], { dayCount: 7 })
    expect(result.entries).toEqual([])
    expect(result.grandTotals).toEqual({ amount: 0, quantity: 0 })
    expect(result.dayCount).toBe(7)
  })

  it('grandTotals は全 records の totalAmount / totalQuantity の合計', () => {
    const records = [
      makeRec('D1', 'L1', 'K1', 100, 5),
      makeRec('D1', 'L2', 'K2', 200, 10),
      makeRec('D2', 'L1', 'K3', 300, 15),
    ]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.grandTotals).toEqual({ amount: 600, quantity: 30 })
  })

  it('entries は records と一対一対応（nested field は intersection 型として存置）', () => {
    const records = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.entries).toHaveLength(1)
    // nested field (intersection で残存) は consumer が引き続き参照可能
    expect(result.entries[0].department.code).toBe('D1')
    expect(result.entries[0].totalAmount).toBe(100)
  })

  it('dayCount は options からそのまま伝搬', () => {
    const result = projectCategoryLeafDailySeries([makeRec('D1', 'L1', 'K1', 1, 1)], {
      dayCount: 30,
    })
    expect(result.dayCount).toBe(30)
  })

  it('flat field parity: deptCode / lineCode / klassCode が nested field と一致する', () => {
    const records = [
      makeRec('D1', 'L1', 'K1', 100, 5),
      makeRec('D2', 'L2', 'K2', 200, 10),
      makeRec('D3', 'L3', 'K3', 300, 15),
    ]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.entries).toHaveLength(3)
    for (const entry of result.entries) {
      expect(entry.deptCode).toBe(entry.department.code)
      expect(entry.lineCode).toBe(entry.line.code)
      expect(entry.klassCode).toBe(entry.klass.code)
    }
  })

  it('flat field parity: deptName / lineName / klassName が nested field と一致する', () => {
    // makeRec は name = code で fixture を作るため、name parity も同条件で確認できる
    const records = [makeRec('D1', 'L1', 'K1', 100, 5), makeRec('D2', 'L2', 'K2', 200, 10)]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    for (const entry of result.entries) {
      expect(entry.deptName).toBe(entry.department.name)
      expect(entry.lineName).toBe(entry.line.name)
      expect(entry.klassName).toBe(entry.klass.name)
    }
  })

  it('flat field parity: dept/line/klass の name が code と異なる場合も一致する', () => {
    // projection は name / code を独立に読み取る。同値 fixture 以外でも parity が成立することを明示的に凍結。
    const rec: CategoryTimeSalesRecord = {
      timeSlots: [],
      totalAmount: 100,
      totalQuantity: 5,
      department: { code: 'D001', name: '青果' },
      line: { code: 'L010', name: '葉物野菜' },
      klass: { code: 'K100', name: 'ほうれん草' },
    } as unknown as CategoryTimeSalesRecord
    const result = projectCategoryLeafDailySeries([rec], { dayCount: 1 })
    const [entry] = result.entries
    expect(entry.deptCode).toBe('D001')
    expect(entry.deptName).toBe('青果')
    expect(entry.lineCode).toBe('L010')
    expect(entry.lineName).toBe('葉物野菜')
    expect(entry.klassCode).toBe('K100')
    expect(entry.klassName).toBe('ほうれん草')
    // nested field も引き続きアクセス可能 (intersection 型)
    expect(entry.department.code).toBe('D001')
    expect(entry.department.name).toBe('青果')
  })
})
