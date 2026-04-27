/**
 * データセットレジストリ
 *
 * インポートされたデータセットのメタデータ（ファイルハッシュ、スキーマバージョン）を管理する。
 * 同一ファイルの重複インポートを検知し、スキーマ変更時の再構築判定に使用する。
 *
 * 使い方:
 * ```
 * import { datasetRegistry } from '@/infrastructure/storage/datasetRegistry'
 *
 * // データセット登録
 * await datasetRegistry.register(2025, 6, { fileHashes: {...}, schemaVersion: 1 })
 *
 * // 重複チェック
 * const isDuplicate = await datasetRegistry.isDuplicate(2025, 6, 'purchase', hash)
 * ```
 *
 * @responsibility R:unclassified
 */
import { openDB, STORE_META } from './internal/dbHelpers'
import { SCHEMA_VERSION } from '@/infrastructure/duckdb/schemas'

const REGISTRY_PREFIX = 'dataset:'

/** データセットメタデータ */
export interface DatasetMeta {
  /** 各データ種別のファイルハッシュ */
  readonly fileHashes: Readonly<Record<string, string>>
  /** 登録時のスキーマバージョン */
  readonly schemaVersion: number
  /** 最終更新日時 */
  readonly updatedAt: string
  /** DuckDB にロード済みか */
  readonly loadedToDuckDB: boolean
}

function makeKey(year: number, month: number): string {
  return `${REGISTRY_PREFIX}${year}-${month}`
}

class DatasetRegistry {
  /**
   * データセットメタデータを登録・更新する
   */
  async register(year: number, month: number, meta: Omit<DatasetMeta, 'updatedAt'>): Promise<void> {
    const db = await openDB()
    const key = makeKey(year, month)
    const entry: DatasetMeta = {
      ...meta,
      updatedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite')
      tx.objectStore(STORE_META).put(entry, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * データセットメタデータを取得する
   */
  async get(year: number, month: number): Promise<DatasetMeta | null> {
    const db = await openDB()
    const key = makeKey(year, month)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly')
      const req = tx.objectStore(STORE_META).get(key)
      req.onsuccess = () => resolve((req.result as DatasetMeta) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * 指定ファイルが既にインポート済みかチェックする
   */
  async isDuplicate(
    year: number,
    month: number,
    dataType: string,
    fileHash: string,
  ): Promise<boolean> {
    const meta = await this.get(year, month)
    if (!meta) return false
    return meta.fileHashes[dataType] === fileHash
  }

  /**
   * スキーマバージョンが最新かチェックする
   */
  async isSchemaUpToDate(year: number, month: number): Promise<boolean> {
    const meta = await this.get(year, month)
    if (!meta) return false
    return meta.schemaVersion === SCHEMA_VERSION
  }

  /**
   * ファイルハッシュを更新する（部分更新）
   */
  async updateFileHash(year: number, month: number, dataType: string, hash: string): Promise<void> {
    const existing = await this.get(year, month)
    const fileHashes = { ...(existing?.fileHashes ?? {}), [dataType]: hash }

    await this.register(year, month, {
      fileHashes,
      schemaVersion: existing?.schemaVersion ?? SCHEMA_VERSION,
      loadedToDuckDB: existing?.loadedToDuckDB ?? false,
    })
  }

  /**
   * 指定年月のレジストリを削除する
   */
  async remove(year: number, month: number): Promise<void> {
    const db = await openDB()
    const key = makeKey(year, month)

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite')
      tx.objectStore(STORE_META).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  /**
   * 全レジストリ情報を一覧する
   */
  async listAll(): Promise<readonly { year: number; month: number; meta: DatasetMeta }[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly')
      const store = tx.objectStore(STORE_META)
      const keysReq = store.getAllKeys()
      const valuesReq = store.getAll()

      const results: { year: number; month: number; meta: DatasetMeta }[] = []

      tx.oncomplete = () => {
        const keys = keysReq.result as string[]
        const values = valuesReq.result as DatasetMeta[]
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          if (typeof key !== 'string' || !key.startsWith(REGISTRY_PREFIX)) continue
          const parts = key.slice(REGISTRY_PREFIX.length).split('-')
          if (parts.length !== 2) continue
          results.push({
            year: Number(parts[0]),
            month: Number(parts[1]),
            meta: values[i],
          })
        }
        resolve(results)
      }
      tx.onerror = () => reject(tx.error)
    })
  }
}

/** グローバルシングルトン */
export const datasetRegistry = new DatasetRegistry()
