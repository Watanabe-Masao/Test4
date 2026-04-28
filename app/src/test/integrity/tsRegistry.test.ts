/**
 * Integrity Domain — tsRegistry primitive unit tests
 *
 * Phase D Wave 1 で landing。fixture record で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { tsRegistry } from '@app-domain/integrity'

describe('parsing/tsRegistry', () => {
  it('Record を Registry に wrap (entries が key/value 維持)', () => {
    const reg = tsRegistry({ a: 1, b: 2 }, 'fixture')
    expect(reg.source).toBe('fixture')
    expect(reg.entries.size).toBe(2)
    expect(reg.entries.get('a')).toBe(1)
    expect(reg.entries.get('b')).toBe(2)
  })

  it('空 Record で空 Registry', () => {
    const reg = tsRegistry({}, 'src')
    expect(reg.entries.size).toBe(0)
    expect(reg.source).toBe('src')
  })

  it('複雑 entry 型 (object) も保持', () => {
    interface E {
      tag: 'required' | 'review'
      reason: string
    }
    const reg = tsRegistry<E>(
      {
        'foo.ts': { tag: 'required', reason: 'core' },
        'bar.ts': { tag: 'review', reason: 'edge' },
      },
      'src',
    )
    expect(reg.entries.get('foo.ts')).toEqual({ tag: 'required', reason: 'core' })
    expect(reg.entries.get('bar.ts')?.tag).toBe('review')
  })

  it('純粋性: 入力 record を mutate しない', () => {
    const input = { a: 1 } as const
    const before = JSON.stringify(input)
    tsRegistry(input, 'src')
    expect(JSON.stringify(input)).toBe(before)
  })

  it('純粋性: 出力 entries は新 Map (input と独立)', () => {
    const input: Record<string, number> = { a: 1 }
    const reg = tsRegistry(input, 'src')
    // entries Map に追加しても input は不変
    ;(reg.entries as Map<string, number>).set('b', 2)
    expect(input.b).toBeUndefined()
  })
})
