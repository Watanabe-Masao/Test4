/**
 * IndexedDB 低レベルヘルパー
 *
 * DB 接続管理とバッチ操作を提供する。
 */

// ─── DB 定数 ──────────────────────────────────────────────

const DB_NAME = 'shiire-arari-db'
const DB_VERSION = 1

/** オブジェクトストア名 */
export const STORE_MONTHLY = 'monthlyData'
export const STORE_META = 'metadata'

// ─── DB 接続 ─────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_MONTHLY)) {
        db.createObjectStore(STORE_MONTHLY)
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META)
      }
    }
    request.onsuccess = () => {
      const db = request.result
      // 接続断時に自動再接続できるよう dbPromise をクリア
      db.onclose = () => {
        dbPromise = null
      }
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

/**
 * DB接続が切断されている場合にリセットして再接続する
 */
export function resetDBConnection(): void {
  dbPromise = null
}

// ─── 低レベルヘルパー ────────────────────────────────────

/**
 * 単一トランザクションで複数のキー/値を一括書き込みする。
 * 全操作が成功するか、全て失敗（ロールバック）するかのいずれか。
 */
export async function dbBatchPut(
  entries: readonly { storeName: string; key: string; value: unknown }[],
): Promise<void> {
  const db = await openDB()
  // 使用するストア名を収集
  const storeNames = [...new Set(entries.map((e) => e.storeName))]
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')
    for (const { storeName, key, value } of entries) {
      tx.objectStore(storeName).put(value, key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => {
      // 接続断の可能性があるためリセット
      if (tx.error?.name === 'InvalidStateError') resetDBConnection()
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error)
    }
    tx.onabort = () => {
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error ?? new Error('Transaction aborted'))
    }
  })
}

export async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 単一トランザクションで複数キーを一括削除する。
 */
export async function dbBatchDelete(
  entries: readonly { storeName: string; key: string }[],
): Promise<void> {
  if (entries.length === 0) return
  const db = await openDB()
  const storeNames = [...new Set(entries.map((e) => e.storeName))]
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, 'readwrite')
    for (const { storeName, key } of entries) {
      tx.objectStore(storeName).delete(key)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => {
      if (tx.error?.name === 'InvalidStateError') resetDBConnection()
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error)
    }
    tx.onabort = () => {
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error ?? new Error('Transaction aborted'))
    }
  })
}

/** read-modify-write 操作の定義 */
export interface ReadModifyWriteOp {
  readonly storeName: string
  readonly key: string
  readonly modify: (existing: unknown) => unknown
}

/**
 * 単一トランザクションで put + read-modify-write を原子的に実行する。
 * readModifyOps は同一トランザクション内で get → modify → put を行うため、
 * 並行書き込みで上書きされるリスクがない。
 *
 * 注意: IndexedDB トランザクション内で await しないこと。
 * 全操作は同期的に IDBRequest を発行し、tx.oncomplete で完了を待つ。
 */
export async function dbBatchPutWithReadModify(
  entries: readonly { storeName: string; key: string; value: unknown }[],
  readModifyOps?: readonly ReadModifyWriteOp[],
): Promise<void> {
  const db = await openDB()
  const allStoreNames = new Set(entries.map((e) => e.storeName))
  if (readModifyOps) {
    for (const op of readModifyOps) allStoreNames.add(op.storeName)
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...allStoreNames], 'readwrite')
    // 1. 直接 put
    for (const { storeName, key, value } of entries) {
      tx.objectStore(storeName).put(value, key)
    }
    // 2. read-modify-write
    if (readModifyOps) {
      for (const { storeName, key, modify } of readModifyOps) {
        const store = tx.objectStore(storeName)
        const req = store.get(key)
        req.onsuccess = () => {
          const updated = modify(req.result)
          store.put(updated, key)
        }
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => {
      if (tx.error?.name === 'InvalidStateError') resetDBConnection()
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error)
    }
    tx.onabort = () => {
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error ?? new Error('Transaction aborted'))
    }
  })
}

/**
 * 単一トランザクションで delete + read-modify-write を原子的に実行する。
 * clearMonthData で使用: 月次データ削除 + sessions メタデータ更新を1つの tx で行う。
 */
export async function dbAtomicDeleteWithReadModify(
  deleteEntries: readonly { storeName: string; key: string }[],
  conditionalDeletes: readonly {
    storeName: string
    key: string
    shouldDelete: (existing: unknown) => boolean
  }[],
  readModifyOps: readonly ReadModifyWriteOp[],
): Promise<void> {
  const db = await openDB()
  const allStoreNames = new Set<string>()
  for (const e of deleteEntries) allStoreNames.add(e.storeName)
  for (const e of conditionalDeletes) allStoreNames.add(e.storeName)
  for (const e of readModifyOps) allStoreNames.add(e.storeName)
  if (allStoreNames.size === 0) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...allStoreNames], 'readwrite')
    // 1. 無条件 delete
    for (const { storeName, key } of deleteEntries) {
      tx.objectStore(storeName).delete(key)
    }
    // 2. 条件付き delete（get して判定）
    for (const { storeName, key, shouldDelete } of conditionalDeletes) {
      const store = tx.objectStore(storeName)
      const req = store.get(key)
      req.onsuccess = () => {
        if (shouldDelete(req.result)) {
          store.delete(key)
        }
      }
    }
    // 3. read-modify-write
    for (const { storeName, key, modify } of readModifyOps) {
      const store = tx.objectStore(storeName)
      const req = store.get(key)
      req.onsuccess = () => {
        const updated = modify(req.result)
        store.put(updated, key)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => {
      if (tx.error?.name === 'InvalidStateError') resetDBConnection()
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error)
    }
    tx.onabort = () => {
      if (tx.error?.name === 'QuotaExceededError') {
        reject(new Error('Storage quota exceeded. Please free up browser storage.'))
        return
      }
      reject(tx.error ?? new Error('Transaction aborted'))
    }
  })
}

export async function dbGetAllKeys(storeName: string): Promise<string[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAllKeys()
    req.onsuccess = () => resolve(req.result as string[])
    req.onerror = () => reject(req.error)
  })
}

/**
 * IndexedDB が利用可能か判定する
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}
