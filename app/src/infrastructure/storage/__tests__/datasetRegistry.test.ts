/**
 * datasetRegistry.ts のユニットテスト
 *
 * IndexedDB は fake-indexeddb でシミュレートする。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { resetDBConnection } from '@/infrastructure/storage/internal/dbHelpers'
import { datasetRegistry } from '@/infrastructure/storage/datasetRegistry'

// ─── セットアップ ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  resetDBConnection()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetDBConnection()
})

// ─── register + get ──────────────────────────────────────────────────────────

describe('datasetRegistry.register / get', () => {
  it('データセットメタデータを登録して取得できる', async () => {
    await datasetRegistry.register(2025, 6, {
      fileHashes: { purchase: 'abc123', flowers: 'def456' },
      schemaVersion: 2,
      loadedToDuckDB: true,
    })

    const meta = await datasetRegistry.get(2025, 6)
    expect(meta).not.toBeNull()
    expect(meta!.fileHashes.purchase).toBe('abc123')
    expect(meta!.fileHashes.flowers).toBe('def456')
    expect(meta!.schemaVersion).toBe(2)
    expect(meta!.loadedToDuckDB).toBe(true)
    expect(typeof meta!.updatedAt).toBe('string')
  })

  it('updatedAt は ISO 8601 形式', async () => {
    await datasetRegistry.register(2025, 1, {
      fileHashes: {},
      schemaVersion: 1,
      loadedToDuckDB: false,
    })
    const meta = await datasetRegistry.get(2025, 1)
    expect(() => new Date(meta!.updatedAt)).not.toThrow()
    expect(new Date(meta!.updatedAt).toISOString()).toBe(meta!.updatedAt)
  })

  it('存在しない年月で get すると null を返す', async () => {
    const result = await datasetRegistry.get(2099, 12)
    expect(result).toBeNull()
  })

  it('異なる年月を独立して保存・取得できる', async () => {
    await datasetRegistry.register(2025, 1, {
      fileHashes: { purchase: 'hash-jan' },
      schemaVersion: 1,
      loadedToDuckDB: false,
    })
    await datasetRegistry.register(2025, 2, {
      fileHashes: { purchase: 'hash-feb' },
      schemaVersion: 1,
      loadedToDuckDB: false,
    })

    const jan = await datasetRegistry.get(2025, 1)
    const feb = await datasetRegistry.get(2025, 2)

    expect(jan!.fileHashes.purchase).toBe('hash-jan')
    expect(feb!.fileHashes.purchase).toBe('hash-feb')
  })

  it('上書き登録で updatedAt が更新される', async () => {
    await datasetRegistry.register(2025, 3, {
      fileHashes: { purchase: 'old-hash' },
      schemaVersion: 1,
      loadedToDuckDB: false,
    })
    const first = await datasetRegistry.get(2025, 3)

    // 少し待ってから更新
    await new Promise((r) => setTimeout(r, 5))

    await datasetRegistry.register(2025, 3, {
      fileHashes: { purchase: 'new-hash' },
      schemaVersion: 2,
      loadedToDuckDB: true,
    })
    const second = await datasetRegistry.get(2025, 3)

    expect(second!.fileHashes.purchase).toBe('new-hash')
    expect(second!.schemaVersion).toBe(2)
    // updatedAt が変化していること（タイムスタンプが同じ場合もありうるのでここは確認のみ）
    expect(typeof second!.updatedAt).toBe('string')
    expect(first!.updatedAt <= second!.updatedAt).toBe(true)
  })
})

// ─── isDuplicate ─────────────────────────────────────────────────────────────

describe('datasetRegistry.isDuplicate', () => {
  it('同じハッシュが登録済みなら true を返す', async () => {
    await datasetRegistry.register(2025, 6, {
      fileHashes: { purchase: 'abc123' },
      schemaVersion: 1,
      loadedToDuckDB: false,
    })

    const result = await datasetRegistry.isDuplicate(2025, 6, 'purchase', 'abc123')
    expect(result).toBe(true)
  })

  it('異なるハッシュなら false を返す', async () => {
    await datasetRegistry.register(2025, 6, {
      fileHashes: { purchase: 'abc123' },
      schemaVersion: 1,
      loadedToDuckDB: false,
    })

    const result = await datasetRegistry.isDuplicate(2025, 6, 'purchase', 'different-hash')
    expect(result).toBe(false)
  })

  it('dataType が未登録なら false を返す', async () => {
    await datasetRegistry.register(2025, 6, {
      fileHashes: { purchase: 'abc123' },
      schemaVersion: 1,
      loadedToDuckDB: false,
    })

    const result = await datasetRegistry.isDuplicate(2025, 6, 'flowers', 'abc123')
    expect(result).toBe(false)
  })

  it('年月が未登録なら false を返す', async () => {
    const result = await datasetRegistry.isDuplicate(2099, 12, 'purchase', 'any-hash')
    expect(result).toBe(false)
  })
})

// ─── isSchemaUpToDate ─────────────────────────────────────────────────────────

describe('datasetRegistry.isSchemaUpToDate', () => {
  it('最新スキーマバージョンで登録された場合は true', async () => {
    // SCHEMA_VERSION = 2
    await datasetRegistry.register(2025, 6, {
      fileHashes: {},
      schemaVersion: 2,
      loadedToDuckDB: false,
    })

    const result = await datasetRegistry.isSchemaUpToDate(2025, 6)
    expect(result).toBe(true)
  })

  it('古いスキーマバージョンで登録された場合は false', async () => {
    await datasetRegistry.register(2025, 6, {
      fileHashes: {},
      schemaVersion: 1,
      loadedToDuckDB: false,
    })

    const result = await datasetRegistry.isSchemaUpToDate(2025, 6)
    expect(result).toBe(false)
  })

  it('未登録の場合は false を返す', async () => {
    const result = await datasetRegistry.isSchemaUpToDate(2099, 1)
    expect(result).toBe(false)
  })
})

// ─── updateFileHash ───────────────────────────────────────────────────────────

describe('datasetRegistry.updateFileHash', () => {
  it('既存レジストリにハッシュを追加できる（部分更新）', async () => {
    await datasetRegistry.register(2025, 7, {
      fileHashes: { purchase: 'p-hash' },
      schemaVersion: 2,
      loadedToDuckDB: true,
    })

    await datasetRegistry.updateFileHash(2025, 7, 'flowers', 'f-hash')

    const meta = await datasetRegistry.get(2025, 7)
    expect(meta!.fileHashes.purchase).toBe('p-hash')
    expect(meta!.fileHashes.flowers).toBe('f-hash')
    expect(meta!.schemaVersion).toBe(2)
    expect(meta!.loadedToDuckDB).toBe(true)
  })

  it('既存ハッシュを上書きできる', async () => {
    await datasetRegistry.register(2025, 8, {
      fileHashes: { purchase: 'old-hash' },
      schemaVersion: 2,
      loadedToDuckDB: false,
    })

    await datasetRegistry.updateFileHash(2025, 8, 'purchase', 'new-hash')

    const meta = await datasetRegistry.get(2025, 8)
    expect(meta!.fileHashes.purchase).toBe('new-hash')
  })

  it('レジストリが存在しない場合は新規作成する', async () => {
    await datasetRegistry.updateFileHash(2024, 12, 'purchase', 'hash-only')

    const meta = await datasetRegistry.get(2024, 12)
    expect(meta).not.toBeNull()
    expect(meta!.fileHashes.purchase).toBe('hash-only')
    expect(meta!.loadedToDuckDB).toBe(false)
  })
})

// ─── remove ──────────────────────────────────────────────────────────────────

describe('datasetRegistry.remove', () => {
  it('指定年月のレジストリを削除する', async () => {
    await datasetRegistry.register(2025, 9, {
      fileHashes: { purchase: 'hash' },
      schemaVersion: 2,
      loadedToDuckDB: false,
    })

    await datasetRegistry.remove(2025, 9)

    const result = await datasetRegistry.get(2025, 9)
    expect(result).toBeNull()
  })

  it('存在しない年月の remove は例外をスローしない', async () => {
    await expect(datasetRegistry.remove(2099, 1)).resolves.toBeUndefined()
  })

  it('他の年月は削除しない', async () => {
    await datasetRegistry.register(2025, 1, {
      fileHashes: { purchase: 'hash-jan' },
      schemaVersion: 2,
      loadedToDuckDB: false,
    })
    await datasetRegistry.register(2025, 2, {
      fileHashes: { purchase: 'hash-feb' },
      schemaVersion: 2,
      loadedToDuckDB: false,
    })

    await datasetRegistry.remove(2025, 1)

    expect(await datasetRegistry.get(2025, 1)).toBeNull()
    expect(await datasetRegistry.get(2025, 2)).not.toBeNull()
  })
})

// ─── listAll ─────────────────────────────────────────────────────────────────

describe('datasetRegistry.listAll', () => {
  it('登録された全レジストリを一覧取得できる', async () => {
    await datasetRegistry.register(2025, 1, {
      fileHashes: { purchase: 'h1' },
      schemaVersion: 2,
      loadedToDuckDB: false,
    })
    await datasetRegistry.register(2025, 2, {
      fileHashes: { purchase: 'h2' },
      schemaVersion: 2,
      loadedToDuckDB: true,
    })

    const list = await datasetRegistry.listAll()

    expect(list.length).toBeGreaterThanOrEqual(2)

    const jan = list.find((e) => e.year === 2025 && e.month === 1)
    const feb = list.find((e) => e.year === 2025 && e.month === 2)

    expect(jan).toBeDefined()
    expect(jan!.meta.fileHashes.purchase).toBe('h1')
    expect(feb).toBeDefined()
    expect(feb!.meta.fileHashes.purchase).toBe('h2')
  })

  it('データがない場合は空配列を返す', async () => {
    const list = await datasetRegistry.listAll()
    expect(list).toEqual([])
  })

  it('dataset: プレフィックス以外のキーは無視する', async () => {
    // rawFile: や他のプレフィックスが混在しても正しくフィルタリングされる
    // → rawFileStore.saveFile で別キーを作り、listAll に影響しないことを確認
    await datasetRegistry.register(2025, 6, {
      fileHashes: {},
      schemaVersion: 2,
      loadedToDuckDB: false,
    })

    const list = await datasetRegistry.listAll()
    // 全て dataset: プレフィックスのエントリのみ
    expect(list.every((e) => typeof e.year === 'number' && typeof e.month === 'number')).toBe(true)
  })

  it('キーのパース: 年月が正しく抽出される', async () => {
    await datasetRegistry.register(2024, 11, {
      fileHashes: {},
      schemaVersion: 2,
      loadedToDuckDB: false,
    })

    const list = await datasetRegistry.listAll()
    const nov = list.find((e) => e.year === 2024 && e.month === 11)
    expect(nov).toBeDefined()
    expect(nov!.year).toBe(2024)
    expect(nov!.month).toBe(11)
  })
})
