import { describe, it, expect } from 'vitest'
import { classifyChanges } from '../classifyChanges'
import type { ImportScope, StoredRecord } from '../../models/ScopeResolution'
import type { DatedRecord } from '../../models/DataTypes'

const scope = (overrides?: Partial<ImportScope>): ImportScope => ({
  dataType: 'purchase',
  year: 2025,
  month: 2,
  dayFrom: 1,
  dayTo: 28,
  storeIds: ['001'],
  deletePolicy: 'upsert-only',
  ...overrides,
})

const incoming = (day: number, cost: number): DatedRecord =>
  ({
    year: 2025,
    month: 2,
    day,
    storeId: '001',
    total: { cost, price: cost * 1.2 },
  }) as unknown as DatedRecord

const stored = (day: number, cost: number): StoredRecord =>
  ({
    year: 2025,
    month: 2,
    day,
    storeId: '001',
    total: { cost, price: cost * 1.2 },
    _naturalKey: `purchase\t2025\t2\t${day}\t001`,
    _dataType: 'purchase' as const,
  }) as unknown as StoredRecord

describe('classifyChanges', () => {
  // INV-RS-08: 純粋関数
  it('INV-RS-08: 同じ入力に同じ出力（純粋関数）', () => {
    const s = scope()
    const inc = [incoming(5, 10000)]
    const exist = [stored(5, 8000)]
    const result1 = classifyChanges(s, inc, exist)
    const result2 = classifyChanges(s, inc, exist)
    expect(result1).toEqual(result2)
  })

  it('新規レコードは add に分類', () => {
    const result = classifyChanges(scope(), [incoming(5, 10000)], [])
    expect(result.adds).toHaveLength(1)
    expect(result.adds[0].kind).toBe('add')
    expect(result.updates).toHaveLength(0)
    expect(result.deletes).toHaveLength(0)
  })

  it('同値レコードは skip（add/update/delete いずれにも含まれない）', () => {
    const result = classifyChanges(scope(), [incoming(5, 10000)], [stored(5, 10000)])
    expect(result.adds).toHaveLength(0)
    expect(result.updates).toHaveLength(0)
    expect(result.deletes).toHaveLength(0)
  })

  it('差異があるレコードは update に分類', () => {
    const result = classifyChanges(scope(), [incoming(5, 12000)], [stored(5, 10000)])
    expect(result.updates).toHaveLength(1)
    expect(result.updates[0].kind).toBe('update')
    expect(result.updates[0].previousRecord).toEqual(stored(5, 10000))
  })

  // INV-RS-13: deletePolicy 'upsert-only' のとき deletes は常に空
  it('INV-RS-13: upsert-only では既存にしかないレコードは削除しない', () => {
    const result = classifyChanges(
      scope({ deletePolicy: 'upsert-only' }),
      [incoming(5, 10000)], // day 5 のみ
      [stored(5, 10000), stored(10, 8000)], // day 10 は incoming にない
    )
    expect(result.deletes).toHaveLength(0)
  })

  it('replace-scope では incoming にないレコードが delete に分類', () => {
    const result = classifyChanges(
      scope({ deletePolicy: 'replace-scope' }),
      [incoming(5, 10000)],
      [stored(5, 10000), stored(10, 8000)],
    )
    expect(result.deletes).toHaveLength(1)
    expect(result.deletes[0].kind).toBe('delete')
    expect(result.deletes[0].naturalKey).toBe('purchase\t2025\t2\t10\t001')
  })

  // INV-RS-05: add + update + skip + delete はスコープ内を網羅
  it('INV-RS-05: 全レコードが add/update/skip/delete のいずれかに分類', () => {
    const s = scope({ deletePolicy: 'replace-scope' })
    const inc = [incoming(1, 8000), incoming(5, 12000), incoming(15, 9000)]
    const exist = [stored(5, 10000), stored(10, 10000)]

    const result = classifyChanges(s, inc, exist)

    // incoming 3件: day 1 = add, day 5 = update, day 15 = add
    expect(result.adds).toHaveLength(2)
    expect(result.updates).toHaveLength(1)
    // existing day 10 は incoming にない → delete
    expect(result.deletes).toHaveLength(1)

    // 全キーが網羅されていることを検証
    const allKeys = new Set([
      ...result.adds.map((c) => c.naturalKey),
      ...result.updates.map((c) => c.naturalKey),
      ...result.deletes.map((c) => c.naturalKey),
    ])
    // skip は含まれないが、incoming の 3 key + existing only の 1 key = 4 key
    expect(allKeys.size).toBe(4)
  })

  it('INV-RS-06: update の previousRecord は既存値と一致', () => {
    const existingRecord = stored(5, 10000)
    const result = classifyChanges(scope(), [incoming(5, 12000)], [existingRecord])
    expect(result.updates[0].previousRecord).toBe(existingRecord)
  })

  it('incoming に重複キーがある場合はエラー', () => {
    expect(() => classifyChanges(scope(), [incoming(5, 10000), incoming(5, 12000)], [])).toThrow(
      '重複キー',
    )
  })

  it('空の incoming + 空の existing = 空の結果', () => {
    const result = classifyChanges(scope(), [], [])
    expect(result.adds).toHaveLength(0)
    expect(result.updates).toHaveLength(0)
    expect(result.deletes).toHaveLength(0)
  })

  it('設計書の具体例: upsert-only 差分取込', () => {
    // 既存: 2/5:10000, 2/10:10000
    // incoming: 2/1:8000, 2/5:12000, 2/15:9000
    // 結果: add [2/1, 2/15], update [2/5], delete []
    const s = scope({ deletePolicy: 'upsert-only' })
    const inc = [incoming(1, 8000), incoming(5, 12000), incoming(15, 9000)]
    const exist = [stored(5, 10000), stored(10, 10000)]

    const result = classifyChanges(s, inc, exist)
    expect(result.adds).toHaveLength(2)
    expect(result.updates).toHaveLength(1)
    expect(result.deletes).toHaveLength(0) // upsert-only: 2/10 は残る
  })
})
