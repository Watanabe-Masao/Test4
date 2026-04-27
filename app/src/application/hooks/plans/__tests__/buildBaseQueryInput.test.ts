/**
 * @taxonomyKind T:unclassified
 */

// buildBaseQueryInput pure builder — unit test
//
// unify-period-analysis Phase 5 横展開: chart 配下の dateRangeToKeys
// 直接呼び出しを吸収する共通 builder の挙動を locked。
import { describe, it, expect } from 'vitest'
import { buildBaseQueryInput } from '@/application/hooks/plans/buildBaseQueryInput'
import type { DateRange } from '@/domain/models/calendar'

const sampleRange: DateRange = {
  from: { year: 2026, month: 4, day: 1 },
  to: { year: 2026, month: 4, day: 15 },
}

describe('buildBaseQueryInput', () => {
  it('currentDateRange=null: null を返す', () => {
    const result = buildBaseQueryInput(null, new Set<string>())
    expect(result).toBeNull()
  })

  it('currentDateRange=undefined: null を返す', () => {
    const result = buildBaseQueryInput(undefined, new Set<string>())
    expect(result).toBeNull()
  })

  it('currentDateRange あり: dateFrom / dateTo が YYYY-MM-DD 形式で埋まる', () => {
    const result = buildBaseQueryInput(sampleRange, new Set<string>())
    expect(result).not.toBeNull()
    expect(result?.dateFrom).toBe('2026-04-01')
    expect(result?.dateTo).toBe('2026-04-15')
  })

  it('storeIds 空集合: undefined を返す (全店対象)', () => {
    const result = buildBaseQueryInput(sampleRange, new Set<string>())
    expect(result?.storeIds).toBeUndefined()
  })

  it('storeIds 非空: 配列として渡す (集合内容を保持)', () => {
    const storeIds = new Set<string>(['store-a', 'store-b', 'store-c'])
    const result = buildBaseQueryInput(sampleRange, storeIds)
    expect(result?.storeIds).toHaveLength(3)
    expect(new Set(result?.storeIds ?? [])).toEqual(storeIds)
  })

  it('pure: 同じ入力で同じ出力を返す (非破壊性)', () => {
    const storeIds = new Set<string>(['store-a'])
    const a = buildBaseQueryInput(sampleRange, storeIds)
    const b = buildBaseQueryInput(sampleRange, storeIds)
    expect(a).toEqual(b)
  })

  it('input set を変更しても出力の storeIds は影響を受けない (defensive copy)', () => {
    const storeIds = new Set<string>(['store-a'])
    const result = buildBaseQueryInput(sampleRange, storeIds)
    storeIds.add('store-b')
    // 既に配列化済みなので後からの変更が output に反映されない
    expect(result?.storeIds).toHaveLength(1)
    expect(result?.storeIds?.[0]).toBe('store-a')
  })
})
