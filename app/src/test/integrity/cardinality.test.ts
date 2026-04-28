/**
 * Integrity Domain — cardinality primitive unit tests
 *
 * Phase D Wave 2 で landing。fixture 配列で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import {
  checkUniqueness,
  checkUpperBound,
  checkNonEmpty,
  checkSizeEquality,
} from '@app-domain/integrity'

describe('detection/checkUniqueness', () => {
  const opts = { ruleId: 'AR-X', registryLabel: 'rule ids' }

  it('重複なしで違反 0', () => {
    expect(checkUniqueness(['a', 'b', 'c'], opts)).toEqual([])
  })

  it('重複 1 件で violation 1', () => {
    const r = checkUniqueness(['a', 'b', 'a'], opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('rule ids: a')
    expect(r[0].actual).toContain("'a' が重複")
  })

  it('同一 id 3 回で violation 1 (重複は集約)', () => {
    const r = checkUniqueness(['a', 'a', 'a'], opts)
    expect(r).toHaveLength(1)
  })

  it('複数の異なる重複で 2 violation', () => {
    const r = checkUniqueness(['a', 'b', 'a', 'c', 'b'], opts)
    expect(r.map((v) => v.location.replace('rule ids: ', '')).sort()).toEqual(['a', 'b'])
  })
})

describe('detection/checkUpperBound', () => {
  const opts = { ruleId: 'AR-Y', counterLabel: 'R:tag 数', upperBound: 15 }

  it('count == upperBound で違反 0', () => {
    expect(checkUpperBound(15, opts)).toEqual([])
  })

  it('count > upperBound で violation', () => {
    const r = checkUpperBound(17, opts)
    expect(r).toHaveLength(1)
    expect(r[0].actual).toContain('= 17')
    expect(r[0].actual).toContain('over by 2')
  })

  it('count < upperBound で違反 0', () => {
    expect(checkUpperBound(10, opts)).toEqual([])
  })
})

describe('detection/checkNonEmpty', () => {
  const opts = { ruleId: 'AR-Z', registryLabel: 'ARCHITECTURE_RULES' }

  it('配列非空で違反 0', () => {
    expect(checkNonEmpty([1, 2, 3], opts)).toEqual([])
  })

  it('配列空で violation', () => {
    const r = checkNonEmpty([], opts)
    expect(r).toHaveLength(1)
    expect(r[0].actual).toContain('空 (配線死亡疑い)')
  })

  it('Set 非空で違反 0', () => {
    expect(checkNonEmpty(new Set(['a']), opts)).toEqual([])
  })

  it('Set 空で violation', () => {
    const r = checkNonEmpty(new Set(), opts)
    expect(r).toHaveLength(1)
  })
})

describe('detection/checkSizeEquality', () => {
  const opts = { ruleId: 'AR-W', leftLabel: 'merged', rightLabel: 'base' }

  it('件数一致で違反 0', () => {
    expect(checkSizeEquality(10, 10, opts)).toEqual([])
  })

  it('件数差で violation', () => {
    const r = checkSizeEquality(10, 9, opts)
    expect(r).toHaveLength(1)
    expect(r[0].actual).toContain('merged=10')
    expect(r[0].actual).toContain('base=9')
  })
})
