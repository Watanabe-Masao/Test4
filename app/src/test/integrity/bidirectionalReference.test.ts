/**
 * Integrity Domain — bidirectionalReference primitive unit tests
 *
 * Phase D Wave 2 で landing。fixture map で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { checkBidirectionalReference } from '@app-domain/integrity'

type Tag = 'a' | 'b' | 'c'

describe('detection/checkBidirectionalReference', () => {
  const opts = { ruleId: 'AR-X', registryLabel: 'Antibody Pair' }

  it('全 entry が対称で違反 0', () => {
    const map: Record<Tag, Tag | null> = { a: 'b', b: 'a', c: null }
    const ids: readonly Tag[] = ['a', 'b', 'c']
    expect(checkBidirectionalReference(ids, (id) => map[id], opts)).toEqual([])
  })

  it('片方向のみ定義で violation 1', () => {
    // a → b、b → null (非対称)
    const map: Record<Tag, Tag | null> = { a: 'b', b: null, c: null }
    const ids: readonly Tag[] = ['a', 'b']
    const r = checkBidirectionalReference(ids, (id) => map[id], opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('Antibody Pair: a → b')
    expect(r[0].actual).toContain('null (非対称)')
  })

  it('reference 先が異なる対象を指す non-symmetric で violation', () => {
    // a → b、b → c (a と c の不整合)
    const map: Record<Tag, Tag | null> = { a: 'b', b: 'c', c: 'b' }
    const ids: readonly Tag[] = ['a', 'b', 'c']
    const r = checkBidirectionalReference(ids, (id) => map[id], opts)
    expect(r.map((v) => v.location)).toContain('Antibody Pair: a → b')
  })

  it('null reference は対象外 (対概念がない archetype)', () => {
    const map: Record<Tag, Tag | null> = { a: null, b: null, c: null }
    const ids: readonly Tag[] = ['a', 'b']
    expect(checkBidirectionalReference(ids, (id) => map[id], opts)).toEqual([])
  })

  it('純粋性: getReverse が injection、本 test 内で I/O 触らない', () => {
    let calls = 0
    const ids: readonly Tag[] = ['a', 'b']
    checkBidirectionalReference(
      ids,
      () => {
        calls++
        return null
      },
      opts,
    )
    expect(calls).toBe(2)
  })
})
