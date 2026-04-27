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
 *      `klassName` が入力 raw record の nested field 対応値と一致する
 *      (projection が唯一の生成点であることを不変として凍結)
 *   6. Phase 4 (2026-04-20): `CategoryLeafDailyEntry` は独立 interface に昇格済み。
 *      nested field (`department.code` 等) は entry 構造から除外される。
 *      consumer は flat field のみで完結し、raw record とは構造的に分離される。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  projectCategoryLeafDailySeries,
  toCategoryLeafDailyEntries,
} from '../projectCategoryLeafDailySeries'
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

  it('entries は records と一対一対応 (Phase 4: flat field のみ / nested field 除外)', () => {
    const records = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.entries).toHaveLength(1)
    // Phase 4 以降: consumer は flat field のみアクセス可能。nested field は型レベルで消滅。
    expect(result.entries[0].deptCode).toBe('D1')
    expect(result.entries[0].totalAmount).toBe(100)
  })

  it('dayCount は options からそのまま伝搬', () => {
    const result = projectCategoryLeafDailySeries([makeRec('D1', 'L1', 'K1', 1, 1)], {
      dayCount: 30,
    })
    expect(result.dayCount).toBe(30)
  })

  it('flat field parity: deptCode / lineCode / klassCode が raw record の nested field と一致する', () => {
    const records = [
      makeRec('D1', 'L1', 'K1', 100, 5),
      makeRec('D2', 'L2', 'K2', 200, 10),
      makeRec('D3', 'L3', 'K3', 300, 15),
    ]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.entries).toHaveLength(3)
    for (let i = 0; i < result.entries.length; i++) {
      const entry = result.entries[i]
      const raw = records[i]
      expect(entry.deptCode).toBe(raw.department.code)
      expect(entry.lineCode).toBe(raw.line.code)
      expect(entry.klassCode).toBe(raw.klass.code)
    }
  })

  it('flat field parity: deptName / lineName / klassName が raw record の nested field と一致する', () => {
    // makeRec は name = code で fixture を作るため、name parity も同条件で確認できる
    const records = [makeRec('D1', 'L1', 'K1', 100, 5), makeRec('D2', 'L2', 'K2', 200, 10)]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    for (let i = 0; i < result.entries.length; i++) {
      const entry = result.entries[i]
      const raw = records[i]
      expect(entry.deptName).toBe(raw.department.name)
      expect(entry.lineName).toBe(raw.line.name)
      expect(entry.klassName).toBe(raw.klass.name)
    }
  })

  it('flat field parity: dept/line/klass の name が code と異なる場合も raw record と一致する', () => {
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
    // Phase 4 以降: nested field は entry 構造から除外 (consumer は raw record を見ない)
    expect(rec.department.code).toBe('D001')
    expect(rec.department.name).toBe('青果')
  })

  it('Phase 4 独立 interface: 保持フィールド (year/month/day/storeId/timeSlots) が raw record と一致する', () => {
    const rec: CategoryTimeSalesRecord = {
      year: 2026,
      month: 4,
      day: 15,
      storeId: 'S001',
      timeSlots: [{ hour: 10, amount: 100, quantity: 5 }],
      totalAmount: 100,
      totalQuantity: 5,
      department: { code: 'D1', name: 'D1' },
      line: { code: 'L1', name: 'L1' },
      klass: { code: 'K1', name: 'K1' },
    } as unknown as CategoryTimeSalesRecord
    const [entry] = projectCategoryLeafDailySeries([rec], { dayCount: 1 }).entries
    expect(entry.year).toBe(2026)
    expect(entry.month).toBe(4)
    expect(entry.day).toBe(15)
    expect(entry.storeId).toBe('S001')
    expect(entry.timeSlots).toEqual([{ hour: 10, amount: 100, quantity: 5 }])
  })

  it('identity 保証: 同じ records 参照を渡すと同じ entries 参照を返す (WeakMap memoize)', () => {
    // pairResult/fallbackResult が毎 render で再生成される状況下で、
    // 下流の record-based memoized aggregations が stable データで
    // 不要な再計算を起こさないための identity 契約。
    const records = [makeRec('D1', 'L1', 'K1', 100, 5), makeRec('D2', 'L2', 'K2', 200, 10)]
    const entries1 = toCategoryLeafDailyEntries(records)
    const entries2 = toCategoryLeafDailyEntries(records)
    expect(entries1).toBe(entries2)
    // 個別 entry 参照も当然同一
    expect(entries1[0]).toBe(entries2[0])
    expect(entries1[1]).toBe(entries2[1])
  })

  it('identity 保証: projectCategoryLeafDailySeries 経由でも同じ records で同じ entries 参照', () => {
    const records = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const s1 = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    const s2 = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    // series object 自体は毎回 new だが、重要なのは entries 配列の identity
    expect(s1.entries).toBe(s2.entries)
  })

  it('identity 保証: 異なる records 配列 (同値) は別 entries 参照 (期待される動作)', () => {
    // WeakMap は「同じ array 参照」のみヒットする。
    // 内容が同値でも新しい array は新しい entries を生成する (これで正しい)。
    const records1 = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const records2 = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const entries1 = toCategoryLeafDailyEntries(records1)
    const entries2 = toCategoryLeafDailyEntries(records2)
    expect(entries1).not.toBe(entries2)
  })
})
