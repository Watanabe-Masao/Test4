/**
 * Integrity Domain — filesystemRegistry primitive unit tests
 *
 * Phase D Wave 3 で landing。fixture 配列で完結 (本 test は I/O を触らない、
 * caller が配列を渡す前提の純関数を検証)。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { filesystemRegistry, type FileEntry } from '@app-domain/integrity'

describe('parsing/filesystemRegistry', () => {
  it('FileEntry 配列を Registry に wrap', () => {
    const entries: FileEntry[] = [
      { name: 'a.md', absPath: '/repo/a.md' },
      { name: 'b.md', absPath: '/repo/b.md', displayPath: 'docs/b.md' },
    ]
    const reg = filesystemRegistry(entries, 'docs/')
    expect(reg.source).toBe('docs/')
    expect(reg.entries.size).toBe(2)
    expect(reg.entries.get('a.md')?.absPath).toBe('/repo/a.md')
    expect(reg.entries.get('b.md')?.displayPath).toBe('docs/b.md')
  })

  it('空配列で空 Registry', () => {
    const reg = filesystemRegistry([], 'src/')
    expect(reg.entries.size).toBe(0)
  })

  it('同名 entry は後勝ち (Map の挙動)', () => {
    const entries: FileEntry[] = [
      { name: 'x', absPath: '/a/x' },
      { name: 'x', absPath: '/b/x' },
    ]
    const reg = filesystemRegistry(entries, 'src')
    expect(reg.entries.size).toBe(1)
    expect(reg.entries.get('x')?.absPath).toBe('/b/x')
  })

  it('純粋性: 入力配列を mutate しない', () => {
    const entries: FileEntry[] = [{ name: 'a', absPath: '/a' }]
    const before = JSON.stringify(entries)
    filesystemRegistry(entries, 'src')
    expect(JSON.stringify(entries)).toBe(before)
  })
})
