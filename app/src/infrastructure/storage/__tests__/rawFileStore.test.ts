/**
 * rawFileStore.ts のユニットテスト
 *
 * IndexedDB は fake-indexeddb でシミュレートする。
 * crypto.subtle.digest は vitest グローバル環境で利用可能。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'

// ── fake-indexeddb のセットアップ ──────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── dbHelpers のキャッシュをリセット ────────────────────────────────────────

import { resetDBConnection } from '@/infrastructure/storage/internal/dbHelpers'

beforeEach(() => {
  resetDBConnection()
})

afterEach(() => {
  resetDBConnection()
})

import { rawFileStore } from '@/infrastructure/storage/rawFileStore'

// ─── saveFile + getFile ───────────────────────────────────────────────────────

describe('rawFileStore.saveFile / getFile', () => {
  it('File を保存して取得できる', async () => {
    const file = new File(['hello world'], 'purchase.csv', { type: 'text/csv' })
    const entry = await rawFileStore.saveFile(2025, 6, 'purchase', file)

    expect(entry.dataType).toBe('purchase')
    expect(entry.filename).toBe('purchase.csv')
    expect(entry.size).toBe(file.size)
    expect(typeof entry.hash).toBe('string')
    expect(entry.hash).toHaveLength(64) // SHA-256 hex

    const retrieved = await rawFileStore.getFile(2025, 6, 'purchase')
    expect(retrieved).not.toBeNull()
    expect(retrieved!.entry.filename).toBe('purchase.csv')
    expect(retrieved!.blob).toBeDefined()
  })

  it('Blob を保存できる（filename は dataType.dat）', async () => {
    const blob = new Blob(['data'], { type: 'application/octet-stream' })
    const entry = await rawFileStore.saveFile(2025, 6, 'flowers', blob)
    expect(entry.filename).toBe('flowers.dat')
    expect(entry.dataType).toBe('flowers')
  })

  it('Blob に filename を明示的に指定できる', async () => {
    const blob = new Blob(['data'], { type: 'application/octet-stream' })
    const entry = await rawFileStore.saveFile(2025, 6, 'flowers', blob, 'my-flowers.csv')
    expect(entry.filename).toBe('my-flowers.csv')
  })

  it('存在しないキーで getFile すると null を返す', async () => {
    const result = await rawFileStore.getFile(2025, 6, 'nonexistent')
    expect(result).toBeNull()
  })

  it('savedAt は ISO 8601 形式', async () => {
    const file = new File(['x'], 'x.csv')
    const entry = await rawFileStore.saveFile(2025, 1, 'purchase', file)
    expect(() => new Date(entry.savedAt)).not.toThrow()
    expect(new Date(entry.savedAt).toISOString()).toBe(entry.savedAt)
  })

  it('同じ dataType に上書き保存できる', async () => {
    const file1 = new File(['old content'], 'old.csv')
    const file2 = new File(['new content'], 'new.csv')

    await rawFileStore.saveFile(2025, 3, 'purchase', file1)
    await rawFileStore.saveFile(2025, 3, 'purchase', file2)

    const retrieved = await rawFileStore.getFile(2025, 3, 'purchase')
    expect(retrieved!.entry.filename).toBe('new.csv')
  })

  it('異なる年月を個別に保存できる', async () => {
    const f1 = new File(['jan'], 'jan.csv')
    const f2 = new File(['feb'], 'feb.csv')

    await rawFileStore.saveFile(2025, 1, 'purchase', f1)
    await rawFileStore.saveFile(2025, 2, 'purchase', f2)

    const r1 = await rawFileStore.getFile(2025, 1, 'purchase')
    const r2 = await rawFileStore.getFile(2025, 2, 'purchase')

    expect(r1!.entry.filename).toBe('jan.csv')
    expect(r2!.entry.filename).toBe('feb.csv')
  })
})

// ─── listFiles ────────────────────────────────────────────────────────────────

describe('rawFileStore.listFiles', () => {
  it('保存したファイルを listFiles で取得できる', async () => {
    const f1 = new File(['a'], 'purchase.csv')
    const f2 = new File(['b'], 'flowers.csv')

    await rawFileStore.saveFile(2025, 4, 'purchase', f1)
    await rawFileStore.saveFile(2025, 4, 'flowers', f2)

    const files = await rawFileStore.listFiles(2025, 4)
    expect(files).toHaveLength(2)

    const types = files.map((f) => f.dataType).sort()
    expect(types).toContain('purchase')
    expect(types).toContain('flowers')
  })

  it('データが存在しない場合は空配列を返す', async () => {
    const files = await rawFileStore.listFiles(2025, 9)
    expect(files).toEqual([])
  })

  it('別年月のファイルを返さない', async () => {
    const f = new File(['x'], 'x.csv')
    await rawFileStore.saveFile(2025, 1, 'purchase', f)

    const files2025Jan = await rawFileStore.listFiles(2025, 1)
    const files2025Feb = await rawFileStore.listFiles(2025, 2)

    expect(files2025Jan).toHaveLength(1)
    expect(files2025Feb).toHaveLength(0)
  })
})

// ─── clearMonth ───────────────────────────────────────────────────────────────

describe('rawFileStore.clearMonth', () => {
  it('指定年月のファイルを全て削除する', async () => {
    const f1 = new File(['a'], 'a.csv')
    const f2 = new File(['b'], 'b.csv')

    await rawFileStore.saveFile(2025, 5, 'purchase', f1)
    await rawFileStore.saveFile(2025, 5, 'flowers', f2)

    await rawFileStore.clearMonth(2025, 5)

    const files = await rawFileStore.listFiles(2025, 5)
    expect(files).toHaveLength(0)

    const file1 = await rawFileStore.getFile(2025, 5, 'purchase')
    const file2 = await rawFileStore.getFile(2025, 5, 'flowers')
    expect(file1).toBeNull()
    expect(file2).toBeNull()
  })

  it('データが存在しない月の clearMonth は何もしない', async () => {
    await expect(rawFileStore.clearMonth(2025, 12)).resolves.toBeUndefined()
  })

  it('他の年月のデータを消さない', async () => {
    const f1 = new File(['jan'], 'jan.csv')
    const f2 = new File(['feb'], 'feb.csv')

    await rawFileStore.saveFile(2025, 1, 'purchase', f1)
    await rawFileStore.saveFile(2025, 2, 'purchase', f2)

    await rawFileStore.clearMonth(2025, 1)

    expect(await rawFileStore.listFiles(2025, 1)).toHaveLength(0)
    expect(await rawFileStore.listFiles(2025, 2)).toHaveLength(1)
  })
})

// ─── clearAll ─────────────────────────────────────────────────────────────────

describe('rawFileStore.clearAll', () => {
  it('全ファイルを削除する', async () => {
    const f1 = new File(['a'], 'a.csv')
    const f2 = new File(['b'], 'b.csv')

    await rawFileStore.saveFile(2025, 1, 'purchase', f1)
    await rawFileStore.saveFile(2025, 2, 'flowers', f2)

    await rawFileStore.clearAll()

    expect(await rawFileStore.listFiles(2025, 1)).toHaveLength(0)
    expect(await rawFileStore.listFiles(2025, 2)).toHaveLength(0)
    expect(await rawFileStore.getFile(2025, 1, 'purchase')).toBeNull()
    expect(await rawFileStore.getFile(2025, 2, 'flowers')).toBeNull()
  })

  it('データがない状態で clearAll を呼んでも例外をスローしない', async () => {
    await expect(rawFileStore.clearAll()).resolves.toBeUndefined()
  })
})

// ─── ハッシュ計算 ─────────────────────────────────────────────────────────────

describe('ファイルハッシュ', () => {
  it('同一内容のファイルは同一ハッシュを持つ', async () => {
    const f1 = new File(['same content'], 'f1.csv')
    const f2 = new File(['same content'], 'f2.csv')

    const e1 = await rawFileStore.saveFile(2025, 1, 'purchase', f1)
    const e2 = await rawFileStore.saveFile(2025, 2, 'purchase', f2)

    expect(e1.hash).toBe(e2.hash)
  })

  it('異なる内容のファイルは異なるハッシュを持つ', async () => {
    const f1 = new File(['content-a'], 'f1.csv')
    const f2 = new File(['content-b'], 'f2.csv')

    const e1 = await rawFileStore.saveFile(2025, 1, 'purchase', f1)
    const e2 = await rawFileStore.saveFile(2025, 1, 'flowers', f2)

    expect(e1.hash).not.toBe(e2.hash)
  })
})
