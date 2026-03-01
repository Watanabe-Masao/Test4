/**
 * 元ファイル保存ストア
 *
 * インポートされた元ファイル（CSV/XLSX の Blob）を IndexedDB に保存する。
 * DuckDB OPFS + rawFiles があれば monthlyData から再構築可能になり、
 * 将来的に monthlyData ストアの段階的廃止を可能にする。
 *
 * 使い方:
 * ```
 * import { rawFileStore } from '@/infrastructure/storage/rawFileStore'
 *
 * // 保存
 * await rawFileStore.saveFile(2025, 6, 'purchase', file)
 *
 * // 取得
 * const blob = await rawFileStore.getFile(2025, 6, 'purchase')
 *
 * // 一覧
 * const files = await rawFileStore.listFiles(2025, 6)
 * ```
 */
import { openDB, STORE_META } from './internal/dbHelpers'

/** rawFiles ストア名（DB_VERSION アップグレード時に追加） */
const RAW_FILES_PREFIX = 'rawFile:'

export interface RawFileEntry {
  /** ファイル名 */
  readonly filename: string
  /** データ種別 */
  readonly dataType: string
  /** 保存日時 */
  readonly savedAt: string
  /** ファイルサイズ (bytes) */
  readonly size: number
  /** ファイルの SHA-256 ハッシュ（重複検知用） */
  readonly hash: string
}

export interface RawFileMeta {
  readonly entry: RawFileEntry
  readonly blob: Blob
}

/**
 * rawFile の IndexedDB キーを生成する
 */
function makeKey(year: number, month: number, dataType: string): string {
  return `${RAW_FILES_PREFIX}${year}-${month}:${dataType}`
}

/**
 * メタデータキーを生成する
 */
function makeMetaKey(year: number, month: number): string {
  return `${RAW_FILES_PREFIX}meta:${year}-${month}`
}

/**
 * ファイルの SHA-256 ハッシュを計算する
 */
async function computeFileHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

class RawFileStore {
  /**
   * 元ファイルを保存する
   */
  async saveFile(
    year: number,
    month: number,
    dataType: string,
    file: File | Blob,
    filename?: string,
  ): Promise<RawFileEntry> {
    const db = await openDB()
    const hash = await computeFileHash(file)
    const entry: RawFileEntry = {
      filename: filename ?? (file instanceof File ? file.name : `${dataType}.dat`),
      dataType,
      savedAt: new Date().toISOString(),
      size: file.size,
      hash,
    }

    const key = makeKey(year, month, dataType)
    const metaKey = makeMetaKey(year, month)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite')
      const store = tx.objectStore(STORE_META)

      // ファイル Blob を保存
      store.put({ entry, blob: file }, key)

      // メタデータ一覧を更新
      const metaReq = store.get(metaKey)
      metaReq.onsuccess = () => {
        const existing: Record<string, RawFileEntry> =
          (metaReq.result as Record<string, RawFileEntry>) ?? {}
        existing[dataType] = entry
        store.put(existing, metaKey)
      }

      tx.oncomplete = () => resolve(entry)
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * 元ファイルを取得する
   */
  async getFile(
    year: number,
    month: number,
    dataType: string,
  ): Promise<RawFileMeta | null> {
    const db = await openDB()
    const key = makeKey(year, month, dataType)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly')
      const req = tx.objectStore(STORE_META).get(key)
      req.onsuccess = () => {
        const result = req.result as RawFileMeta | undefined
        resolve(result ?? null)
      }
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * 指定年月の全ファイル一覧を取得する
   */
  async listFiles(year: number, month: number): Promise<readonly RawFileEntry[]> {
    const db = await openDB()
    const metaKey = makeMetaKey(year, month)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly')
      const req = tx.objectStore(STORE_META).get(metaKey)
      req.onsuccess = () => {
        const result = req.result as Record<string, RawFileEntry> | undefined
        resolve(result ? Object.values(result) : [])
      }
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * 指定年月の全ファイルを削除する
   */
  async clearMonth(year: number, month: number): Promise<void> {
    const files = await this.listFiles(year, month)
    if (files.length === 0) return

    const db = await openDB()
    const metaKey = makeMetaKey(year, month)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite')
      const store = tx.objectStore(STORE_META)

      // 個別ファイル削除
      for (const file of files) {
        store.delete(makeKey(year, month, file.dataType))
      }
      // メタデータ削除
      store.delete(metaKey)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * 全ファイルを削除する
   */
  async clearAll(): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite')
      const store = tx.objectStore(STORE_META)
      const req = store.getAllKeys()

      req.onsuccess = () => {
        const keys = req.result as string[]
        for (const key of keys) {
          if (typeof key === 'string' && key.startsWith(RAW_FILES_PREFIX)) {
            store.delete(key)
          }
        }
      }

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

/** グローバルシングルトン */
export const rawFileStore = new RawFileStore()
