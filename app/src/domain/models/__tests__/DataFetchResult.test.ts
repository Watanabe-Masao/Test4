/**
 * DataFetchResult — validateRecords tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { validateRecords } from '../DataFetchResult'

describe('validateRecords', () => {
  it('空配列は isValid=false + 理由付き', () => {
    const r = validateRecords([])
    expect(r.isValid).toBe(false)
    expect(r.reason).toBe('データがありません')
    expect(r.recordCount).toBe(0)
    expect(r.actualDateRange).toBeNull()
  })

  it('非空配列は isValid=true + recordCount を返す', () => {
    const r = validateRecords([
      { dateKey: '2026-03-01' },
      { dateKey: '2026-03-02' },
      { dateKey: '2026-03-03' },
    ])
    expect(r.isValid).toBe(true)
    expect(r.reason).toBeNull()
    expect(r.recordCount).toBe(3)
  })

  it('actualDateRange は最小/最大 dateKey', () => {
    const r = validateRecords([
      { dateKey: '2026-03-15' },
      { dateKey: '2026-03-01' },
      { dateKey: '2026-03-10' },
    ])
    expect(r.actualDateRange?.minDateKey).toBe('2026-03-01')
    expect(r.actualDateRange?.maxDateKey).toBe('2026-03-15')
  })

  it('dateKey が string でない行は無視（数値 / undefined）', () => {
    const r = validateRecords([{ dateKey: '2026-03-01' }, { dateKey: 123 }, { other: 'x' }])
    expect(r.isValid).toBe(true)
    expect(r.recordCount).toBe(3) // recordCount は全行を数える
    expect(r.actualDateRange?.minDateKey).toBe('2026-03-01')
    expect(r.actualDateRange?.maxDateKey).toBe('2026-03-01')
  })

  it('カスタム dateKeyField を指定できる', () => {
    const r = validateRecords([{ date: '2026-03-01' }, { date: '2026-03-02' }], 'date')
    expect(r.isValid).toBe(true)
    expect(r.actualDateRange?.minDateKey).toBe('2026-03-01')
    expect(r.actualDateRange?.maxDateKey).toBe('2026-03-02')
  })

  it('dateKey 一切なしで非空配列 → actualDateRange=null', () => {
    const r = validateRecords([{ other: 'x' }, { other: 'y' }])
    expect(r.isValid).toBe(true)
    expect(r.recordCount).toBe(2)
    expect(r.actualDateRange).toBeNull()
  })

  it('単一行は min=max', () => {
    const r = validateRecords([{ dateKey: '2026-03-15' }])
    expect(r.actualDateRange?.minDateKey).toBe('2026-03-15')
    expect(r.actualDateRange?.maxDateKey).toBe('2026-03-15')
  })
})
