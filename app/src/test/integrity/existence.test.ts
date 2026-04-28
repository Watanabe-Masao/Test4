/**
 * Integrity Domain — existence + pathExistence primitive unit tests
 *
 * Phase B Step B-4 で landing。fixture set + 注入された exists 関数で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import {
  checkBidirectionalExistence,
  checkPathExistence,
  type RegisteredPath,
} from '@app-domain/integrity'

describe('detection/checkBidirectionalExistence', () => {
  const opts = {
    ruleId: 'AR-X',
    registryLabel: 'spec',
    sourceLabel: 'fs',
  }

  it('双方が一致すれば違反 0', () => {
    const r = checkBidirectionalExistence(new Set(['A', 'B']), new Set(['A', 'B']), opts)
    expect(r).toEqual([])
  })

  it('registry に有り source に無ければ stale を検出', () => {
    const r = checkBidirectionalExistence(new Set(['A', 'B']), new Set(['A']), opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('spec: B')
    expect(r[0].actual).toContain('未存在')
  })

  it('source に有り registry に無ければ untracked を検出', () => {
    const r = checkBidirectionalExistence(new Set(['A']), new Set(['A', 'B']), opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('fs: B')
    expect(r[0].actual).toContain('未登録')
  })

  it('direction=registry-to-source で片方向のみ', () => {
    const r = checkBidirectionalExistence(new Set(['A', 'B']), new Set(['A', 'C']), {
      ...opts,
      direction: 'registry-to-source',
    })
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('spec: B') // C は report しない
  })

  it('severity injection が反映される', () => {
    const r = checkBidirectionalExistence(new Set(['A']), new Set(), {
      ...opts,
      severity: 'warn',
    })
    expect(r[0].severity).toBe('warn')
  })
})

describe('detection/checkPathExistence', () => {
  const opts = { ruleId: 'AR-Y', registryLabel: 'doc-registry' }
  const fakeFs = new Set(['/repo/A.md', '/repo/B.md'])
  const exists = (p: string) => fakeFs.has(p)

  it('全 path 実在で違反 0', () => {
    const paths: RegisteredPath[] = [
      { absPath: '/repo/A.md', displayPath: 'A.md' },
      { absPath: '/repo/B.md', displayPath: 'B.md' },
    ]
    expect(checkPathExistence(paths, exists, opts)).toEqual([])
  })

  it('broken link を検出 + displayPath をエラーに含む', () => {
    const paths: RegisteredPath[] = [
      { absPath: '/repo/A.md', displayPath: 'A.md' },
      { absPath: '/repo/X.md', displayPath: 'broken/X.md' },
    ]
    const r = checkPathExistence(paths, exists, opts)
    expect(r).toHaveLength(1)
    expect(r[0].actual).toContain('broken/X.md')
    expect(r[0].fixHint).toContain('doc-registry')
  })

  it('registryLocation が指定されれば location に使う', () => {
    const paths: RegisteredPath[] = [
      { absPath: '/repo/X.md', displayPath: 'X.md', registryLocation: 'doc-registry.json:91' },
    ]
    const r = checkPathExistence(paths, exists, opts)
    expect(r[0].location).toBe('doc-registry.json:91')
  })

  it('exists 関数 injection で純粋性を確保 (本 test 内で fs 触らない)', () => {
    let calls = 0
    const customExists = (_p: string) => {
      calls++
      return true
    }
    checkPathExistence([{ absPath: '/x', displayPath: 'x' }], customExists, opts)
    expect(calls).toBe(1)
  })
})
