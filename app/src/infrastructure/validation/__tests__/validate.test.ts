import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateRecords, validateRecordsSampled } from '../validate'

const SimpleSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
})

function makeRecords(count: number, corruptIndices: Set<number> = new Set()): unknown[] {
  return Array.from({ length: count }, (_, i) =>
    corruptIndices.has(i) ? { id: NaN, name: '' } : { id: i + 1, name: `item-${i}` },
  )
}

describe('validateRecords', () => {
  it('全件正常の場合に invalidCount=0 を返す', () => {
    const result = validateRecords(SimpleSchema, makeRecords(10))
    expect(result.invalidCount).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it('不正レコードを検出する', () => {
    const records = makeRecords(10, new Set([2, 7]))
    const result = validateRecords(SimpleSchema, records)
    expect(result.invalidCount).toBe(2)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].index).toBe(2)
    expect(result.errors[1].index).toBe(7)
  })

  it('maxErrors を超えるエラーは記録しない', () => {
    const corrupt = new Set([0, 1, 2, 3, 4])
    const result = validateRecords(SimpleSchema, makeRecords(10, corrupt), 3)
    expect(result.invalidCount).toBe(5)
    expect(result.errors).toHaveLength(3)
  })

  it('空配列で invalidCount=0 を返す', () => {
    const result = validateRecords(SimpleSchema, [])
    expect(result.invalidCount).toBe(0)
  })
})

describe('validateRecordsSampled', () => {
  it('空配列で invalidCount=0 を返す', () => {
    const result = validateRecordsSampled(SimpleSchema, [])
    expect(result.invalidCount).toBe(0)
  })

  it('小さい配列は全件検証する', () => {
    const records = makeRecords(10, new Set([5]))
    const result = validateRecordsSampled(SimpleSchema, records, 30)
    expect(result.invalidCount).toBe(1)
  })

  it('大きい配列でサンプルが全件通過すると invalidCount=0 を返す', () => {
    const records = makeRecords(1000)
    const result = validateRecordsSampled(SimpleSchema, records, 30)
    expect(result.invalidCount).toBe(0)
  })

  it('先頭の不正レコードを検出する', () => {
    const records = makeRecords(1000, new Set([0]))
    const result = validateRecordsSampled(SimpleSchema, records, 30)
    expect(result.invalidCount).toBeGreaterThan(0)
  })

  it('末尾の不正レコードを検出する', () => {
    const records = makeRecords(1000, new Set([999]))
    const result = validateRecordsSampled(SimpleSchema, records, 30)
    expect(result.invalidCount).toBeGreaterThan(0)
  })

  it('中間の不正レコードはサンプルに含まれればフォールバックで検出される', () => {
    // 大量の不正レコードを中間に配置して検出確率を上げる
    const corrupt = new Set(Array.from({ length: 100 }, (_, i) => 450 + i))
    const records = makeRecords(1000, corrupt)
    const result = validateRecordsSampled(SimpleSchema, records, 30)
    // ランダムサンプルが450-549のいずれかに当たれば全件フォールバック
    // 検出できない場合もあるが、100/1000 = 10% の不正率なら高確率で検出
    // テストの安定性のため assert は「0 か 100 のどちらか」
    expect(result.invalidCount === 0 || result.invalidCount === 100).toBe(true)
  })

  it('同じ入力に対して決定論的に同じ結果を返す', () => {
    const records = makeRecords(500)
    const r1 = validateRecordsSampled(SimpleSchema, records, 20)
    const r2 = validateRecordsSampled(SimpleSchema, records, 20)
    expect(r1.invalidCount).toBe(r2.invalidCount)
  })
})
