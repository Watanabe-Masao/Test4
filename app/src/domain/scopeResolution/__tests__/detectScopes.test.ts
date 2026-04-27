/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { detectScopes } from '../detectScopes'
import type { ParsedRecordGroup } from '../detectScopes'
import type { DatedRecord } from '../../models/DataTypes'

const rec = (day: number, storeId = '001'): DatedRecord => ({
  year: 2025,
  month: 2,
  day,
  storeId,
})

describe('detectScopes', () => {
  // INV-RS-01: dayFrom <= dayTo
  it('INV-RS-01: dayFrom <= dayTo', () => {
    const groups: ParsedRecordGroup[] = [
      { dataType: 'purchase', records: [rec(5), rec(1), rec(20)] },
    ]
    const scopes = detectScopes(groups)
    expect(scopes).toHaveLength(1)
    expect(scopes[0].dayFrom).toBe(1)
    expect(scopes[0].dayTo).toBe(20)
    expect(scopes[0].dayFrom).toBeLessThanOrEqual(scopes[0].dayTo)
  })

  // INV-RS-14: storeIds は常に非空配列
  it('INV-RS-14: storeIds は常に非空', () => {
    const groups: ParsedRecordGroup[] = [
      { dataType: 'purchase', records: [rec(1, '001'), rec(5, '002')] },
    ]
    const scopes = detectScopes(groups)
    expect(scopes[0].storeIds.length).toBeGreaterThan(0)
    expect(scopes[0].storeIds).toContain('001')
    expect(scopes[0].storeIds).toContain('002')
  })

  it('デフォルト deletePolicy は upsert-only', () => {
    const groups: ParsedRecordGroup[] = [{ dataType: 'flowers', records: [rec(10)] }]
    const scopes = detectScopes(groups)
    expect(scopes[0].deletePolicy).toBe('upsert-only')
  })

  it('同じ dataType で異なる年月は別スコープ', () => {
    const groups: ParsedRecordGroup[] = [
      {
        dataType: 'purchase',
        records: [
          { year: 2025, month: 1, day: 5, storeId: '001' },
          { year: 2025, month: 2, day: 10, storeId: '001' },
        ],
      },
    ]
    const scopes = detectScopes(groups)
    expect(scopes).toHaveLength(2)
    const months = scopes.map((s) => s.month).sort()
    expect(months).toEqual([1, 2])
  })

  it('異なる dataType は別スコープ', () => {
    const groups: ParsedRecordGroup[] = [
      { dataType: 'purchase', records: [rec(1)] },
      { dataType: 'flowers', records: [rec(1)] },
    ]
    const scopes = detectScopes(groups)
    expect(scopes).toHaveLength(2)
    const types = scopes.map((s) => s.dataType).sort()
    expect(types).toEqual(['flowers', 'purchase'])
  })

  it('空レコードグループはスコープを生成しない', () => {
    const groups: ParsedRecordGroup[] = [{ dataType: 'purchase', records: [] }]
    const scopes = detectScopes(groups)
    expect(scopes).toHaveLength(0)
  })

  it('1レコードのみ: dayFrom === dayTo', () => {
    const groups: ParsedRecordGroup[] = [{ dataType: 'consumables', records: [rec(15)] }]
    const scopes = detectScopes(groups)
    expect(scopes[0].dayFrom).toBe(15)
    expect(scopes[0].dayTo).toBe(15)
  })

  it('storeIds は重複排除される', () => {
    const groups: ParsedRecordGroup[] = [
      {
        dataType: 'purchase',
        records: [rec(1, '001'), rec(2, '001'), rec(3, '002')],
      },
    ]
    const scopes = detectScopes(groups)
    expect(scopes[0].storeIds).toHaveLength(2)
  })
})
