/**
 * dbHelpers.ts のユニットテスト
 *
 * IndexedDB は JSDOM 環境では提供されないため fake-indexeddb を使う。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  resetDBConnection,
  isIndexedDBAvailable,
  dbBatchPut,
  dbGet,
  dbBatchDelete,
  dbBatchPutWithReadModify,
  dbAtomicDeleteWithReadModify,
  dbGetAllKeys,
  STORE_MONTHLY,
  STORE_META,
  STORE_APP_SETTINGS,
} from '../dbHelpers'

// ─── セットアップ ─────────────────────────────────────────────────────────

beforeEach(() => {
  // テストごとに新しいインメモリ DB を作る
  vi.stubGlobal('indexedDB', new IDBFactory())
  resetDBConnection()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetDBConnection()
})

// ─── 定数のエクスポートテスト ──────────────────────────────────────────────

describe('exported constants', () => {
  it('STORE_MONTHLY は "monthlyData"', () => {
    expect(STORE_MONTHLY).toBe('monthlyData')
  })

  it('STORE_META は "metadata"', () => {
    expect(STORE_META).toBe('metadata')
  })

  it('STORE_APP_SETTINGS は "appSettings"', () => {
    expect(STORE_APP_SETTINGS).toBe('appSettings')
  })
})

// ─── isIndexedDBAvailable ──────────────────────────────────────────────────

describe('isIndexedDBAvailable', () => {
  it('indexedDB が存在する場合は true を返す', () => {
    expect(isIndexedDBAvailable()).toBe(true)
  })
})

// ─── resetDBConnection ─────────────────────────────────────────────────────

describe('resetDBConnection', () => {
  it('resetDBConnection は例外をスローしない', () => {
    expect(() => resetDBConnection()).not.toThrow()
  })

  it('resetDBConnection を複数回呼んでも安全', () => {
    resetDBConnection()
    resetDBConnection()
    expect(true).toBe(true)
  })
})

// ─── dbBatchDelete 空配列 ─────────────────────────────────────────────────

describe('dbBatchDelete', () => {
  it('空配列で呼んだ場合は即 resolve する', async () => {
    await expect(dbBatchDelete([])).resolves.toBeUndefined()
  })
})

// ─── dbAtomicDeleteWithReadModify 全空 ───────────────────────────────────

describe('dbAtomicDeleteWithReadModify', () => {
  it('全引数が空配列で allStoreNames が 0 の場合は即 resolve する', async () => {
    // allStoreNames.size === 0 の早期 return を確認（fake DB あり）
    await expect(dbAtomicDeleteWithReadModify([], [], [])).resolves.toBeUndefined()
  })
})

// ─── dbBatchPut + dbGet 統合テスト ─────────────────────────────────────

describe('dbBatchPut + dbGet 統合テスト', () => {
  it('dbBatchPut で書き込んだ値を dbGet で読み込める', async () => {
    await dbBatchPut([{ storeName: STORE_MONTHLY, key: 'test-key', value: { x: 42 } }])
    const result = await dbGet<{ x: number }>(STORE_MONTHLY, 'test-key')
    expect(result).toEqual({ x: 42 })
  })

  it('dbGet で存在しないキーは undefined を返す', async () => {
    const result = await dbGet<unknown>(STORE_MONTHLY, 'non-existent-key')
    expect(result).toBeUndefined()
  })

  it('複数エントリを同一トランザクションで書き込める', async () => {
    await dbBatchPut([
      { storeName: STORE_MONTHLY, key: 'k1', value: 'v1' },
      { storeName: STORE_META, key: 'k2', value: 'v2' },
    ])
    expect(await dbGet<string>(STORE_MONTHLY, 'k1')).toBe('v1')
    expect(await dbGet<string>(STORE_META, 'k2')).toBe('v2')
  })

  it('同一キーを上書きできる', async () => {
    await dbBatchPut([{ storeName: STORE_MONTHLY, key: 'upsert-key', value: 'original' }])
    await dbBatchPut([{ storeName: STORE_MONTHLY, key: 'upsert-key', value: 'updated' }])
    const result = await dbGet<string>(STORE_MONTHLY, 'upsert-key')
    expect(result).toBe('updated')
  })
})

// ─── dbBatchDelete 統合テスト ─────────────────────────────────────────────

describe('dbBatchDelete 統合テスト', () => {
  it('dbBatchDelete で削除した後は undefined になる', async () => {
    await dbBatchPut([{ storeName: STORE_MONTHLY, key: 'del-key', value: 'hello' }])
    await dbBatchDelete([{ storeName: STORE_MONTHLY, key: 'del-key' }])
    const result = await dbGet<string>(STORE_MONTHLY, 'del-key')
    expect(result).toBeUndefined()
  })

  it('存在しないキーの削除は何もしない', async () => {
    await expect(
      dbBatchDelete([{ storeName: STORE_MONTHLY, key: 'no-such-key' }]),
    ).resolves.toBeUndefined()
  })

  it('複数キーを同一トランザクションで削除できる', async () => {
    await dbBatchPut([
      { storeName: STORE_MONTHLY, key: 'del-a', value: 1 },
      { storeName: STORE_MONTHLY, key: 'del-b', value: 2 },
    ])
    await dbBatchDelete([
      { storeName: STORE_MONTHLY, key: 'del-a' },
      { storeName: STORE_MONTHLY, key: 'del-b' },
    ])
    expect(await dbGet(STORE_MONTHLY, 'del-a')).toBeUndefined()
    expect(await dbGet(STORE_MONTHLY, 'del-b')).toBeUndefined()
  })
})

// ─── dbGetAllKeys 統合テスト ──────────────────────────────────────────────

describe('dbGetAllKeys 統合テスト', () => {
  it('dbGetAllKeys で全キーを取得できる', async () => {
    await dbBatchPut([
      { storeName: STORE_MONTHLY, key: 'key-a', value: 1 },
      { storeName: STORE_MONTHLY, key: 'key-b', value: 2 },
    ])
    const keys = await dbGetAllKeys(STORE_MONTHLY)
    expect(keys).toContain('key-a')
    expect(keys).toContain('key-b')
  })

  it('空ストアでは空配列を返す', async () => {
    const keys = await dbGetAllKeys(STORE_MONTHLY)
    expect(keys).toEqual([])
  })
})

// ─── dbBatchPutWithReadModify 統合テスト ─────────────────────────────────

describe('dbBatchPutWithReadModify 統合テスト', () => {
  it('entries のみ（readModifyOps なし）で動作する', async () => {
    await dbBatchPutWithReadModify(
      [{ storeName: STORE_MONTHLY, key: 'entry-only', value: 'test' }],
      undefined,
    )
    const result = await dbGet<string>(STORE_MONTHLY, 'entry-only')
    expect(result).toBe('test')
  })

  it('read-modify-write が動作する（既存値の更新）', async () => {
    await dbBatchPut([{ storeName: STORE_META, key: 'counter', value: 5 }])

    await dbBatchPutWithReadModify(
      [],
      [
        {
          storeName: STORE_META,
          key: 'counter',
          modify: (existing) => (typeof existing === 'number' ? existing + 1 : 1),
        },
      ],
    )

    const result = await dbGet<number>(STORE_META, 'counter')
    expect(result).toBe(6)
  })

  it('read-modify-write: modify が undefined を受け取った場合も動作する', async () => {
    await dbBatchPutWithReadModify(
      [],
      [
        {
          storeName: STORE_META,
          key: 'brand-new',
          modify: (existing) => (existing === undefined ? 'initial' : 'updated'),
        },
      ],
    )
    const result = await dbGet<string>(STORE_META, 'brand-new')
    expect(result).toBe('initial')
  })

  it('entries と readModifyOps を同時に実行できる', async () => {
    await dbBatchPut([{ storeName: STORE_META, key: 'list', value: ['a'] }])

    await dbBatchPutWithReadModify(
      [{ storeName: STORE_MONTHLY, key: 'direct', value: 42 }],
      [
        {
          storeName: STORE_META,
          key: 'list',
          modify: (existing) =>
            Array.isArray(existing) ? [...(existing as string[]), 'b'] : ['b'],
        },
      ],
    )

    expect(await dbGet<number>(STORE_MONTHLY, 'direct')).toBe(42)
    expect(await dbGet<string[]>(STORE_META, 'list')).toEqual(['a', 'b'])
  })

  it('複数の readModifyOps を同時に処理できる', async () => {
    await dbBatchPutWithReadModify(
      [],
      [
        {
          storeName: STORE_META,
          key: 'rmw-1',
          modify: () => 'value-1',
        },
        {
          storeName: STORE_META,
          key: 'rmw-2',
          modify: () => 'value-2',
        },
      ],
    )
    expect(await dbGet<string>(STORE_META, 'rmw-1')).toBe('value-1')
    expect(await dbGet<string>(STORE_META, 'rmw-2')).toBe('value-2')
  })
})

// ─── dbAtomicDeleteWithReadModify 統合テスト ─────────────────────────────

describe('dbAtomicDeleteWithReadModify 統合テスト', () => {
  it('無条件削除 + 条件付き削除 + read-modify-write を原子的に実行する', async () => {
    await dbBatchPut([
      { storeName: STORE_MONTHLY, key: 'delete-me', value: 'gone' },
      { storeName: STORE_META, key: 'cond-true', value: { flag: true } },
      { storeName: STORE_META, key: 'cond-false', value: { flag: false } },
      { storeName: STORE_META, key: 'rmw-key', value: ['a', 'b'] },
    ])

    await dbAtomicDeleteWithReadModify(
      [{ storeName: STORE_MONTHLY, key: 'delete-me' }],
      [
        {
          storeName: STORE_META,
          key: 'cond-true',
          shouldDelete: (v) =>
            typeof v === 'object' && v !== null && (v as { flag: boolean }).flag === true,
        },
        {
          storeName: STORE_META,
          key: 'cond-false',
          shouldDelete: (v) =>
            typeof v === 'object' && v !== null && (v as { flag: boolean }).flag === true,
        },
      ],
      [
        {
          storeName: STORE_META,
          key: 'rmw-key',
          modify: (existing) =>
            Array.isArray(existing) ? [...(existing as string[]), 'c'] : ['c'],
        },
      ],
    )

    expect(await dbGet(STORE_MONTHLY, 'delete-me')).toBeUndefined()
    expect(await dbGet(STORE_META, 'cond-true')).toBeUndefined()
    expect(await dbGet(STORE_META, 'cond-false')).toEqual({ flag: false })
    expect(await dbGet(STORE_META, 'rmw-key')).toEqual(['a', 'b', 'c'])
  })

  it('条件付き削除で shouldDelete が false を返す場合は削除しない', async () => {
    await dbBatchPut([{ storeName: STORE_META, key: 'keep', value: 'keep-me' }])

    await dbAtomicDeleteWithReadModify(
      [],
      [{ storeName: STORE_META, key: 'keep', shouldDelete: () => false }],
      [],
    )

    expect(await dbGet(STORE_META, 'keep')).toBe('keep-me')
  })

  it('storeNames が1つだけの場合も動作する', async () => {
    await dbBatchPut([{ storeName: STORE_MONTHLY, key: 'solo', value: 'hello' }])

    await dbAtomicDeleteWithReadModify([{ storeName: STORE_MONTHLY, key: 'solo' }], [], [])

    expect(await dbGet(STORE_MONTHLY, 'solo')).toBeUndefined()
  })
})

// ─── DB 接続断時の挙動（onclose / onversionchange） ─────────────────────

describe('DB 接続キャッシュのリセット動作', () => {
  it('resetDBConnection 後に再度 openDB を呼ぶと新しい接続が確立される', async () => {
    // 初回 openDB
    const db1 = await dbGet(STORE_MONTHLY, 'ping')
    expect(db1).toBeUndefined()

    // 接続をリセット
    resetDBConnection()

    // 2回目 openDB（別インスタンスを確立）
    const db2 = await dbGet(STORE_MONTHLY, 'ping')
    expect(db2).toBeUndefined()
  })
})
