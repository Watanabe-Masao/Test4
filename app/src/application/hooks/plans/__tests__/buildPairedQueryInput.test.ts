/**
 * @taxonomyKind T:unclassified
 */

// buildPairedQueryInput pure builder — unit test
//
// unify-period-analysis Phase 5 横展開 第 2 バッチ: PairedQueryInput 系の
// 共通 builder の挙動を locked。
import { describe, it, expect } from 'vitest'
import { buildPairedQueryInput } from '@/application/hooks/plans/buildPairedQueryInput'
import type { DateRange } from '@/domain/models/calendar'

const curRange: DateRange = {
  from: { year: 2026, month: 4, day: 1 },
  to: { year: 2026, month: 4, day: 15 },
}

const prevRange: DateRange = {
  from: { year: 2025, month: 4, day: 1 },
  to: { year: 2025, month: 4, day: 15 },
}

describe('buildPairedQueryInput', () => {
  it('currentDateRange=null: null を返す (prev の有無に関係なく)', () => {
    expect(buildPairedQueryInput(null, undefined, new Set<string>())).toBeNull()
    expect(buildPairedQueryInput(null, prevRange, new Set<string>())).toBeNull()
    expect(buildPairedQueryInput(undefined, prevRange, new Set<string>())).toBeNull()
  })

  it('current のみ (prev=undefined): base の dateFrom/dateTo が埋まる、comparison フィールドは undefined', () => {
    const result = buildPairedQueryInput(curRange, undefined, new Set<string>())
    expect(result).not.toBeNull()
    expect(result?.dateFrom).toBe('2026-04-01')
    expect(result?.dateTo).toBe('2026-04-15')
    expect(result?.comparisonDateFrom).toBeUndefined()
    expect(result?.comparisonDateTo).toBeUndefined()
  })

  it('current のみ (prev=null): prev nullish は comparison なしと同じ挙動', () => {
    const result = buildPairedQueryInput(curRange, null, new Set<string>())
    expect(result?.comparisonDateFrom).toBeUndefined()
    expect(result?.comparisonDateTo).toBeUndefined()
  })

  it('current + prev: comparisonDateFrom/To が埋まる', () => {
    const result = buildPairedQueryInput(curRange, prevRange, new Set<string>())
    expect(result?.dateFrom).toBe('2026-04-01')
    expect(result?.dateTo).toBe('2026-04-15')
    expect(result?.comparisonDateFrom).toBe('2025-04-01')
    expect(result?.comparisonDateTo).toBe('2025-04-15')
  })

  it('storeIds 空集合: undefined を返す (全店対象)', () => {
    const result = buildPairedQueryInput(curRange, prevRange, new Set<string>())
    expect(result?.storeIds).toBeUndefined()
  })

  it('storeIds 非空: 配列として渡す', () => {
    const storeIds = new Set<string>(['store-a', 'store-b'])
    const result = buildPairedQueryInput(curRange, prevRange, storeIds)
    expect(result?.storeIds).toHaveLength(2)
    expect(new Set(result?.storeIds ?? [])).toEqual(storeIds)
  })

  it('buildBaseQueryInput との整合: prev なしの返り値は BaseQueryInput と同じ shape', () => {
    // current のみ版は BaseQueryInput と同じ 3 フィールドのみを持つ
    const result = buildPairedQueryInput(curRange, undefined, new Set<string>())
    const keys = Object.keys(result ?? {})
    expect(keys.sort()).toEqual(['dateFrom', 'dateTo', 'storeIds'].sort())
  })

  it('prev ありの場合: 5 フィールドを持つ (dateFrom/dateTo/storeIds/comparisonDateFrom/comparisonDateTo)', () => {
    const result = buildPairedQueryInput(curRange, prevRange, new Set<string>(['s1']))
    const keys = Object.keys(result ?? {})
    expect(keys.sort()).toEqual(
      ['dateFrom', 'dateTo', 'storeIds', 'comparisonDateFrom', 'comparisonDateTo'].sort(),
    )
  })

  it('pure: 同じ入力で同じ出力を返す (非破壊性)', () => {
    const storeIds = new Set<string>(['store-a'])
    const a = buildPairedQueryInput(curRange, prevRange, storeIds)
    const b = buildPairedQueryInput(curRange, prevRange, storeIds)
    expect(a).toEqual(b)
  })

  it('追加フィールド展開: spread で拡張可能 (caller 側の責務)', () => {
    const base = buildPairedQueryInput(curRange, prevRange, new Set<string>())
    // caller が level / deptCode などを追加する典型例
    const extended = { ...base, level: 'department' as const, deptCode: '01' }
    expect(extended.dateFrom).toBe('2026-04-01')
    expect(extended.comparisonDateFrom).toBe('2025-04-01')
    expect(extended.level).toBe('department')
    expect(extended.deptCode).toBe('01')
  })
})
