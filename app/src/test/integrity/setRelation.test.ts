/**
 * Integrity Domain — setRelation primitive unit tests
 *
 * Phase D Wave 1 で landing。fixture set / predicate で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { checkDisjoint, checkInclusion, checkInclusionByPredicate } from '@app-domain/integrity'

describe('detection/checkDisjoint', () => {
  const opts = { ruleId: 'AR-X', leftLabel: 'owns', rightLabel: 'warn' }

  it('共通元なしで違反 0', () => {
    expect(checkDisjoint(new Set(['a', 'b']), new Set(['c', 'd']), opts)).toEqual([])
  })

  it('共通元 1 件で violation 1', () => {
    const r = checkDisjoint(new Set(['a', 'b']), new Set(['b', 'c']), opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('owns ∩ warn: b')
  })

  it('共通元 2 件で violation 2', () => {
    const r = checkDisjoint(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']), opts)
    expect(r.map((v) => v.actual)).toEqual([`'b' が両方に出現`, `'c' が両方に出現`])
  })
})

describe('detection/checkInclusion', () => {
  const opts = { ruleId: 'AR-Y', subsetLabel: 'required', supersetLabel: 'actual' }

  it('subset ⊆ superset で違反 0', () => {
    expect(checkInclusion(new Set(['a']), new Set(['a', 'b']), opts)).toEqual([])
  })

  it('要素不足で違反', () => {
    const r = checkInclusion(new Set(['a', 'b', 'c']), new Set(['a']), opts)
    expect(r.map((v) => v.location.replace('actual: ', ''))).toEqual(['b', 'c'])
  })
})

describe('detection/checkInclusionByPredicate', () => {
  const opts = {
    ruleId: 'AR-Z',
    subsetLabel: 'tokens',
    supersetLabel: 'CLAUDE.md',
  }

  it('全 token が predicate を満たせば違反 0', () => {
    const text = 'foo bar baz'
    expect(
      checkInclusionByPredicate(new Set(['foo', 'bar']), (t) => text.includes(t), opts),
    ).toEqual([])
  })

  it('一部 token が満たさないと violation', () => {
    const text = 'foo'
    const r = checkInclusionByPredicate(new Set(['foo', 'missing']), (t) => text.includes(t), opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('CLAUDE.md: missing')
    expect(r[0].fixHint).toContain('CLAUDE.md')
  })

  it('純粋性: predicate injection で本 test 内で I/O 触らない', () => {
    let calls = 0
    checkInclusionByPredicate(
      new Set(['a', 'b']),
      () => {
        calls++
        return true
      },
      opts,
    )
    expect(calls).toBe(2)
  })
})
