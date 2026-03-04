/**
 * folderAccess.ts の追加カバレッジテスト
 *
 * getStoredHandle, removeHandle, pickDirectory (対応環境) の
 * 未カバー部分をテストする。
 *
 * 注意: folderAccess.ts は module-level の handleDbPromise を持つため
 * vi.resetModules() を使わずに、IDB の振る舞いをモックで制御する。
 * 各 describe ブロックを独立した isolate 設定にするか、
 * 代わりにモジュールレベルモックで回避する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { isFileSystemAccessSupported, listFiles } from '@/infrastructure/storage/folderAccess'

// ─── セットアップ ─────────────────────────────────────────────────────────
// folderAccess.ts の openHandleDB はモジュールレベルでキャッシュされるため、
// fake-indexeddb を使用する統合テストは folderAccess 内部の IDB を直接使う。

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ─── isFileSystemAccessSupported ──────────────────────────────────────────

describe('isFileSystemAccessSupported (拡張)', () => {
  it('showDirectoryPicker が window に存在する場合は true', () => {
    vi.stubGlobal('window', { showDirectoryPicker: vi.fn() })
    expect(isFileSystemAccessSupported()).toBe(true)
  })

  it('JSDOM 環境では showDirectoryPicker がなく false', () => {
    expect(isFileSystemAccessSupported()).toBe(false)
  })
})

// ─── pickDirectory ────────────────────────────────────────────────────────
// 実際の folderAccess.pickDirectory をインポートして実行する

describe('pickDirectory', () => {
  beforeEach(() => {
    // fake-indexeddb で handles DB を提供
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  it('非対応環境 (showDirectoryPicker なし) では null を返す', async () => {
    const { pickDirectory } = await import('@/infrastructure/storage/folderAccess')
    const result = await pickDirectory('backup')
    expect(result).toBeNull()
  })

  it('ユーザーキャンセル (AbortError) で null を返す', async () => {
    const abortError = new DOMException('user cancelled', 'AbortError')
    vi.stubGlobal('window', { showDirectoryPicker: vi.fn().mockRejectedValue(abortError) })
    const { pickDirectory } = await import('@/infrastructure/storage/folderAccess')
    const result = await pickDirectory('import')
    expect(result).toBeNull()
  })

  it('AbortError 以外のエラーは再スローする', async () => {
    const networkError = new DOMException('network error', 'NetworkError')
    vi.stubGlobal('window', { showDirectoryPicker: vi.fn().mockRejectedValue(networkError) })
    const { pickDirectory } = await import('@/infrastructure/storage/folderAccess')
    await expect(pickDirectory('backup')).rejects.toThrow('network error')
  })
})

// ─── getStoredHandle / removeHandle ──────────────────────────────────────
// IDB モックを使って getStoredHandle の各分岐をテスト
// fake-indexeddb は vi.fn() オブジェクトを cloneできないため
// モジュール全体を部分的にモックする

describe('getStoredHandle の各分岐（dbHelpers モック使用）', () => {
  // openHandleDB を差し替えるためのモック
  // IDB store に格納されるハンドルを直接制御する
  function createHandleTransaction(storedResult: unknown) {
    const tx = {
      oncomplete: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onabort: null as (() => void) | null,
      error: null as DOMException | null,
      objectStore: vi.fn(() => ({
        get: vi.fn((key: string) => {
          void key
          const req = {
            result: storedResult,
            error: null,
            onsuccess: null as ((e: Event) => void) | null,
            onerror: null as ((e: Event) => void) | null,
          }
          Promise.resolve().then(() => {
            if (req.onsuccess) req.onsuccess(new Event('success'))
          })
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete()
          }, 10)
          return req
        }),
        delete: vi.fn(() => {
          const req = {
            result: undefined,
            error: null,
            onsuccess: null as ((e: Event) => void) | null,
            onerror: null as ((e: Event) => void) | null,
          }
          Promise.resolve().then(() => {
            if (req.onsuccess) req.onsuccess(new Event('success'))
          })
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete()
          }, 10)
          return req
        }),
        put: vi.fn((value: unknown) => {
          void value
          const req = {
            result: undefined,
            error: null,
            onsuccess: null as ((e: Event) => void) | null,
            onerror: null as ((e: Event) => void) | null,
          }
          Promise.resolve().then(() => {
            if (req.onsuccess) req.onsuccess(new Event('success'))
          })
          setTimeout(() => {
            if (tx.oncomplete) tx.oncomplete()
          }, 10)
          return req
        }),
      })),
    }
    return tx
  }

  function createMockIDB(storedResult: unknown) {
    const tx = createHandleTransaction(storedResult)
    const mockDB = {
      transaction: vi.fn(() => tx),
      objectStoreNames: { contains: vi.fn(() => true) },
      createObjectStore: vi.fn(),
      onclose: null,
      onversionchange: null,
    }
    const mockIDB = {
      open: vi.fn(() => {
        const req = {
          result: mockDB,
          error: null,
          onsuccess: null as ((e: Event) => void) | null,
          onerror: null as ((e: Event) => void) | null,
          onupgradeneeded: null as ((e: IDBVersionChangeEvent) => void) | null,
        }
        Promise.resolve().then(() => {
          if (req.onsuccess) req.onsuccess(new Event('success'))
        })
        return req as unknown as IDBOpenDBRequest
      }),
    } as unknown as IDBFactory
    return mockIDB
  }

  it('IDB にハンドルなし → null を返す', async () => {
    vi.stubGlobal('indexedDB', createMockIDB(null))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('backup')
    expect(result).toBeNull()
  })

  it('IDB にハンドルなし (undefined) → null を返す', async () => {
    vi.stubGlobal('indexedDB', createMockIDB(undefined))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('backup')
    expect(result).toBeNull()
  })

  it('backup スロット: granted → readwrite モードでハンドルを返す', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn(),
    }
    vi.stubGlobal('indexedDB', createMockIDB(mockHandle))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('backup')
    expect(result).toBe(mockHandle)
    expect(mockHandle.queryPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
  })

  it('import スロット: granted → read モードでハンドルを返す', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn(),
    }
    vi.stubGlobal('indexedDB', createMockIDB(mockHandle))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('import')
    expect(result).toBe(mockHandle)
    expect(mockHandle.queryPermission).toHaveBeenCalledWith({ mode: 'read' })
  })

  it('prompt → requestPermission granted → ハンドルを返す', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    }
    vi.stubGlobal('indexedDB', createMockIDB(mockHandle))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('backup')
    expect(result).toBe(mockHandle)
    expect(mockHandle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' })
  })

  it('prompt → requestPermission denied → null を返す', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied'),
    }
    vi.stubGlobal('indexedDB', createMockIDB(mockHandle))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('backup')
    expect(result).toBeNull()
  })

  it('requestPermission が例外をスローした場合は null を返す', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockRejectedValue(new Error('user gesture required')),
    }
    vi.stubGlobal('indexedDB', createMockIDB(mockHandle))
    vi.resetModules()
    const { getStoredHandle } = await import('@/infrastructure/storage/folderAccess')
    const result = await getStoredHandle('backup')
    expect(result).toBeNull()
  })

  it('removeHandle: 指定スロットを削除する（例外なし）', async () => {
    vi.stubGlobal('indexedDB', createMockIDB(null))
    vi.resetModules()
    const { removeHandle } = await import('@/infrastructure/storage/folderAccess')
    await expect(removeHandle('backup')).resolves.toBeUndefined()
  })

  it('removeHandle: import スロットを削除する', async () => {
    vi.stubGlobal('indexedDB', createMockIDB(null))
    vi.resetModules()
    const { removeHandle } = await import('@/infrastructure/storage/folderAccess')
    await expect(removeHandle('import')).resolves.toBeUndefined()
  })
})

// ─── listFiles (エッジケース) ─────────────────────────────────────────────

describe('listFiles (エッジケース)', () => {
  it('拡張子フィルタが空配列の場合は全ファイルを返す', async () => {
    const mockEntries = [
      ['a.txt', { kind: 'file', name: 'a.txt' }],
      ['b.json', { kind: 'file', name: 'b.json' }],
      ['c.csv', { kind: 'file', name: 'c.csv' }],
    ] as const

    const mockDirHandle = {
      entries: vi.fn().mockImplementation(async function* () {
        for (const entry of mockEntries) yield entry
      }),
    } as unknown as FileSystemDirectoryHandle

    const result = await listFiles(mockDirHandle, [])
    expect(result).toHaveLength(3)
  })

  it('ディレクトリエントリはスキップされる', async () => {
    const mockEntries = [
      ['subdir', { kind: 'directory', name: 'subdir' }],
      ['file.txt', { kind: 'file', name: 'file.txt' }],
    ] as const

    const mockDirHandle = {
      entries: vi.fn().mockImplementation(async function* () {
        for (const entry of mockEntries) yield entry
      }),
    } as unknown as FileSystemDirectoryHandle

    const result = await listFiles(mockDirHandle)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('file.txt')
  })

  it('アルファベット順（localeCompare）でソートされる', async () => {
    const mockEntries = [
      ['c.txt', { kind: 'file', name: 'c.txt' }],
      ['a.txt', { kind: 'file', name: 'a.txt' }],
      ['b.txt', { kind: 'file', name: 'b.txt' }],
    ] as const

    const mockDirHandle = {
      entries: vi.fn().mockImplementation(async function* () {
        for (const entry of mockEntries) yield entry
      }),
    } as unknown as FileSystemDirectoryHandle

    const result = await listFiles(mockDirHandle)
    expect(result[0].name).toBe('a.txt')
    expect(result[1].name).toBe('b.txt')
    expect(result[2].name).toBe('c.txt')
  })

  it('複合拡張子（.json.gz）にも対応する', async () => {
    const mockEntries = [
      ['backup.json.gz', { kind: 'file', name: 'backup.json.gz' }],
      ['data.json', { kind: 'file', name: 'data.json' }],
      ['other.txt', { kind: 'file', name: 'other.txt' }],
    ] as const

    const mockDirHandle = {
      entries: vi.fn().mockImplementation(async function* () {
        for (const entry of mockEntries) yield entry
      }),
    } as unknown as FileSystemDirectoryHandle

    const result = await listFiles(mockDirHandle, ['.json', '.gz'])
    expect(result).toHaveLength(2)
    const names = result.map((r) => r.name)
    expect(names).toContain('backup.json.gz')
    expect(names).toContain('data.json')
  })

  it('大文字小文字を区別しない拡張子フィルタ', async () => {
    const mockEntries = [
      ['DATA.CSV', { kind: 'file', name: 'DATA.CSV' }],
      ['data.csv', { kind: 'file', name: 'data.csv' }],
      ['README.txt', { kind: 'file', name: 'README.txt' }],
    ] as const

    const mockDirHandle = {
      entries: vi.fn().mockImplementation(async function* () {
        for (const entry of mockEntries) yield entry
      }),
    } as unknown as FileSystemDirectoryHandle

    const result = await listFiles(mockDirHandle, ['.csv'])
    expect(result).toHaveLength(2)
    const names = result.map((r) => r.name)
    expect(names).toContain('DATA.CSV')
    expect(names).toContain('data.csv')
  })
})
