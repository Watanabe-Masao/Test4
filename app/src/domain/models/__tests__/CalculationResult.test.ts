/**
 * CalculationResult — factory tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { okResult, invalidResult, undefinedResult } from '../CalculationResult'

describe('okResult', () => {
  it('value + status=ok / warnings=空', () => {
    const r = okResult(42)
    expect(r.value).toBe(42)
    expect(r.status).toBe('ok')
    expect(r.warnings).toEqual([])
  })

  it('warnings を渡せる（ok でも warning 同居可）', () => {
    const r = okResult(42, ['推定値含む'])
    expect(r.warnings).toEqual(['推定値含む'])
  })

  it('null / undefined value も ok 状態として保持', () => {
    expect(okResult<number | null>(null).value).toBeNull()
  })

  it('複雑なオブジェクトも保持', () => {
    const obj = { a: 1, b: 'x' }
    expect(okResult(obj).value).toBe(obj)
  })
})

describe('invalidResult', () => {
  it('value=null / status=invalid / warnings 必須', () => {
    const r = invalidResult<number>(['負値検出'])
    expect(r.value).toBeNull()
    expect(r.status).toBe('invalid')
    expect(r.warnings).toEqual(['負値検出'])
  })

  it('複数 warning を保持', () => {
    const r = invalidResult<number>(['a', 'b', 'c'])
    expect(r.warnings).toHaveLength(3)
  })
})

describe('undefinedResult', () => {
  it('value=null / status=undefined / warnings=空 デフォルト', () => {
    const r = undefinedResult<number>()
    expect(r.value).toBeNull()
    expect(r.status).toBe('undefined')
    expect(r.warnings).toEqual([])
  })

  it('warnings を渡せる', () => {
    const r = undefinedResult<number>(['データなし'])
    expect(r.warnings).toEqual(['データなし'])
  })
})
