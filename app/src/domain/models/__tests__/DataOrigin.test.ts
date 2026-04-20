/**
 * DataOrigin — isEnvelope type guard tests
 */
import { describe, it, expect } from 'vitest'
import { isEnvelope, type DataEnvelope, type DataOrigin } from '../DataOrigin'

const sampleOrigin: DataOrigin = {
  year: 2026,
  month: 3,
  importedAt: '2026-04-20T00:00:00.000Z',
}

describe('isEnvelope', () => {
  it('正しい envelope 形式を判定する', () => {
    const env: DataEnvelope<{ a: number }> = {
      origin: sampleOrigin,
      payload: { a: 1 },
    }
    expect(isEnvelope(env)).toBe(true)
  })

  it('envelope 形式（checksum 付き）も true', () => {
    const env: DataEnvelope<string> = {
      origin: sampleOrigin,
      payload: 'data',
      checksum: 12345,
    }
    expect(isEnvelope(env)).toBe(true)
  })

  it('null は false', () => {
    expect(isEnvelope(null as unknown as DataEnvelope<unknown>)).toBe(false)
  })

  it('undefined は false', () => {
    expect(isEnvelope(undefined as unknown as DataEnvelope<unknown>)).toBe(false)
  })

  it('プリミティブ（数値）は false', () => {
    expect(isEnvelope(42 as unknown as DataEnvelope<unknown>)).toBe(false)
  })

  it('文字列は false', () => {
    expect(isEnvelope('text' as unknown as DataEnvelope<unknown>)).toBe(false)
  })

  it('origin だけで payload が無い → false', () => {
    expect(isEnvelope({ origin: sampleOrigin } as unknown as DataEnvelope<unknown>)).toBe(false)
  })

  it('payload だけで origin が無い → false', () => {
    expect(isEnvelope({ payload: 1 } as unknown as DataEnvelope<unknown>)).toBe(false)
  })

  it('origin に year が無い → false', () => {
    const bad = {
      origin: { month: 3, importedAt: '2026-04-20' },
      payload: {},
    } as unknown as DataEnvelope<unknown>
    expect(isEnvelope(bad)).toBe(false)
  })

  it('origin の year が string → false（型ミスマッチ）', () => {
    const bad = {
      origin: { year: '2026', month: 3, importedAt: 'x' },
      payload: {},
    } as unknown as DataEnvelope<unknown>
    expect(isEnvelope(bad)).toBe(false)
  })

  it('origin の importedAt が無い → false', () => {
    const bad = {
      origin: { year: 2026, month: 3 },
      payload: {},
    } as unknown as DataEnvelope<unknown>
    expect(isEnvelope(bad)).toBe(false)
  })

  it('プレーン object（origin/payload なし）は false', () => {
    expect(isEnvelope({ a: 1, b: 2 } as unknown as DataEnvelope<unknown>)).toBe(false)
  })
})
