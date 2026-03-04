/**
 * serialization.ts の追加カバレッジテスト
 *
 * wrapEnvelope, unwrapEnvelope, mapToObj, budgetToSerializable の
 * 未カバー部分をテストする。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  wrapEnvelope,
  unwrapEnvelope,
  mapToObj,
  budgetToSerializable,
  sanitizeNumericValues,
} from '../serialization'

// ─── mapToObj ────────────────────────────────────────────────────────────────

describe('mapToObj', () => {
  it('Map を plain object に変換する', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ])
    expect(mapToObj(map)).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('空 Map は空オブジェクトを返す', () => {
    expect(mapToObj(new Map())).toEqual({})
  })

  it('文字列値の Map を変換できる', () => {
    const map = new Map([['key', 'value']])
    expect(mapToObj(map)).toEqual({ key: 'value' })
  })

  it('オブジェクト値の Map を変換できる', () => {
    const map = new Map([['store1', { name: 'Store A', code: 'S1' }]])
    expect(mapToObj(map)).toEqual({ store1: { name: 'Store A', code: 'S1' } })
  })
})

// ─── budgetToSerializable ──────────────────────────────────────────────────

describe('budgetToSerializable', () => {
  it('BudgetData を plain object に変換する', () => {
    const budget = {
      storeId: 'S001',
      total: 1000000,
      daily: new Map([
        [1, 50000],
        [15, 60000],
        [31, 40000],
      ]),
    }
    const result = budgetToSerializable(budget) as {
      storeId: string
      total: number
      daily: Record<string, number>
    }
    expect(result.storeId).toBe('S001')
    expect(result.total).toBe(1000000)
    expect(result.daily['1']).toBe(50000)
    expect(result.daily['15']).toBe(60000)
    expect(result.daily['31']).toBe(40000)
  })

  it('daily が空 Map の場合は空オブジェクトを返す', () => {
    const budget = { storeId: 'S001', total: 0, daily: new Map<number, number>() }
    const result = budgetToSerializable(budget) as { daily: Record<string, number> }
    expect(result.daily).toEqual({})
  })
})

// ─── sanitizeNumericValues (Map ブランチ) ────────────────────────────────

describe('sanitizeNumericValues - Map ブランチ', () => {
  it('Map 内の NaN/Infinity を正規化する', () => {
    const input = new Map([
      ['a', NaN],
      ['b', Infinity],
      ['c', 42],
    ])
    const result = sanitizeNumericValues(input) as Map<string, number>
    expect(result.get('a')).toBe(0)
    expect(result.get('b')).toBe(0)
    expect(result.get('c')).toBe(42)
  })

  it('ネストした Map も再帰的に正規化する', () => {
    const inner = new Map([['x', NaN]])
    const outer = new Map([['inner', inner]])
    const result = sanitizeNumericValues(outer) as Map<string, Map<string, number>>
    expect(result.get('inner')!.get('x')).toBe(0)
  })

  it('string はそのまま返す', () => {
    expect(sanitizeNumericValues('hello')).toBe('hello')
  })

  it('boolean はそのまま返す', () => {
    expect(sanitizeNumericValues(true)).toBe(true)
  })
})

// ─── wrapEnvelope ────────────────────────────────────────────────────────────

describe('wrapEnvelope', () => {
  it('DataEnvelope を生成する', () => {
    const payload = { value: 100 }
    const envelope = wrapEnvelope(payload, 2025, 6)

    expect(envelope.origin.year).toBe(2025)
    expect(envelope.origin.month).toBe(6)
    expect(typeof envelope.origin.importedAt).toBe('string')
    expect(envelope.origin.sourceFile).toBeUndefined()
    expect(envelope.payload).toEqual(payload)
    expect(typeof envelope.checksum).toBe('number')
  })

  it('sourceFile を渡すと origin に含まれる', () => {
    const envelope = wrapEnvelope({ data: 'test' }, 2024, 12, 'purchase.csv')
    expect(envelope.origin.sourceFile).toBe('purchase.csv')
  })

  it('NaN を含むペイロードをサニタイズしてから保存する', () => {
    const payload = { amount: NaN, count: 5 }
    const envelope = wrapEnvelope(payload, 2025, 1)
    expect((envelope.payload as { amount: number }).amount).toBe(0)
    expect((envelope.payload as { count: number }).count).toBe(5)
  })

  it('チェックサムが同じペイロードで一定である', () => {
    const payload = { x: 1, y: 2 }
    const env1 = wrapEnvelope(payload, 2025, 1)
    const env2 = wrapEnvelope(payload, 2025, 1)
    expect(env1.checksum).toBe(env2.checksum)
  })

  it('異なるペイロードで異なるチェックサムを生成する（高確率）', () => {
    const env1 = wrapEnvelope({ a: 1 }, 2025, 1)
    const env2 = wrapEnvelope({ a: 2 }, 2025, 1)
    // 衝突の可能性は非常に低い
    expect(env1.checksum).not.toBe(env2.checksum)
  })

  it('importedAt は ISO 8601 形式の文字列', () => {
    const envelope = wrapEnvelope({ x: 0 }, 2025, 3)
    expect(() => new Date(envelope.origin.importedAt)).not.toThrow()
    expect(new Date(envelope.origin.importedAt).toISOString()).toBe(envelope.origin.importedAt)
  })
})

// ─── unwrapEnvelope ───────────────────────────────────────────────────────────

describe('unwrapEnvelope', () => {
  it('null を渡すと null を返す', () => {
    expect(unwrapEnvelope(null, 2025, 1)).toBeNull()
  })

  it('undefined を渡すと null を返す', () => {
    expect(unwrapEnvelope(undefined, 2025, 1)).toBeNull()
  })

  it('新形式（DataEnvelope）を正常に unwrap する', () => {
    const original = { count: 10 }
    const envelope = wrapEnvelope(original, 2025, 6)
    const result = unwrapEnvelope<{ count: number }>(envelope, 2025, 6)

    expect(result).not.toBeNull()
    expect(result!.value).toEqual({ count: 10 })
    expect(result!.origin).not.toBeNull()
    expect(result!.origin!.year).toBe(2025)
    expect(result!.origin!.month).toBe(6)
  })

  it('origin の年月がキーと不一致の場合は null を返す', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const envelope = wrapEnvelope({ x: 1 }, 2025, 6)
    // year=2025, month=6 で作ったが year=2025, month=7 で読む
    const result = unwrapEnvelope(envelope, 2025, 7)
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Integrity mismatch'))
    consoleSpy.mockRestore()
  })

  it('チェックサムが不一致の場合は null を返す（改ざん検知）', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const envelope = wrapEnvelope({ x: 1 }, 2025, 6)
    // チェックサムを改ざん
    const tampered = { ...envelope, checksum: (envelope.checksum ?? 0) + 1 }
    const result = unwrapEnvelope(tampered, 2025, 6)
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Checksum mismatch'))
    consoleSpy.mockRestore()
  })

  it('旧形式（生データ）は origin: null でそのまま返す', () => {
    const rawData = { purchase: { S001: { 1: { amount: 100 } } } }
    const result = unwrapEnvelope<typeof rawData>(rawData, 2025, 1)

    expect(result).not.toBeNull()
    expect(result!.value).toEqual(rawData)
    expect(result!.origin).toBeNull()
  })

  it('チェックサムが存在しない envelope は検証をスキップする', () => {
    // checksum フィールドなし（旧 envelope 形式）
    const noChecksumEnvelope = {
      origin: { year: 2025, month: 1, importedAt: new Date().toISOString() },
      payload: { data: 'test' },
      // checksum なし
    }
    const result = unwrapEnvelope(noChecksumEnvelope, 2025, 1)
    expect(result).not.toBeNull()
    expect(result!.value).toEqual({ data: 'test' })
  })

  it('wrapEnvelope + unwrapEnvelope でラウンドトリップできる', () => {
    const original = { stores: ['S001', 'S002'], total: 999 }
    const envelope = wrapEnvelope(original, 2024, 3)
    const result = unwrapEnvelope<typeof original>(envelope, 2024, 3)

    expect(result).not.toBeNull()
    expect(result!.value).toEqual(original)
    expect(result!.origin!.year).toBe(2024)
    expect(result!.origin!.month).toBe(3)
  })

  it('配列ペイロードでも正常に動作する', () => {
    const payload = [1, 2, 3]
    const envelope = wrapEnvelope(payload, 2025, 12)
    const result = unwrapEnvelope<number[]>(envelope, 2025, 12)
    expect(result!.value).toEqual([1, 2, 3])
  })

  it('空オブジェクトでも正常に動作する', () => {
    const envelope = wrapEnvelope({}, 2025, 1)
    const result = unwrapEnvelope<Record<string, never>>(envelope, 2025, 1)
    expect(result!.value).toEqual({})
  })
})
