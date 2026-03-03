/**
 * OPFS 永続化マネージャー
 *
 * OPFS 上の DuckDB DB + Parquet キャッシュのライフサイクルを管理する。
 * 起動時にOPFSの整合性をチェックし、有効なデータがあればデータ再ロードをスキップする。
 *
 * フロー:
 * 1. 起動 → checkIntegrity()
 * 2. schemaValid && monthCount > 0 → OPFS DB を信頼（再ロード不要）
 * 3. schemaValid && monthCount === 0 && hasParquetCache → Parquet からインポート
 * 4. それ以外 → IndexedDB から通常ロード → 完了後 Parquet エクスポート
 */

import type { DuckDBWorkerClient } from './worker/duckdbWorkerClient'
import type { IntegrityCheckResult } from './worker/types'

export type OpfsReloadStrategy =
  | 'opfs-valid' // OPFS DB にデータあり → 再ロード不要
  | 'parquet-restore' // Parquet キャッシュからリストア
  | 'full-reload' // IndexedDB から通常ロード

export interface OpfsCheckResult {
  readonly strategy: OpfsReloadStrategy
  readonly integrity: IntegrityCheckResult
  readonly durationMs: number
}

/**
 * OPFS の状態をチェックし、最適なリロード戦略を判定する。
 */
export async function determineReloadStrategy(
  client: DuckDBWorkerClient,
): Promise<OpfsCheckResult> {
  const start = performance.now()

  try {
    const integrity = await client.checkIntegrity()

    let strategy: OpfsReloadStrategy

    if (integrity.isOpfsPersisted && integrity.schemaValid && integrity.monthCount > 0) {
      // OPFS DB が有効でデータあり → 再ロード不要
      strategy = 'opfs-valid'
    } else if (integrity.hasParquetCache) {
      // Parquet キャッシュあり → Parquet からリストア
      strategy = 'parquet-restore'
    } else {
      // IndexedDB から通常ロード
      strategy = 'full-reload'
    }

    return {
      strategy,
      integrity,
      durationMs: performance.now() - start,
    }
  } catch {
    // integrity チェック自体が失敗 → 通常ロード
    return {
      strategy: 'full-reload',
      integrity: {
        schemaValid: false,
        monthCount: 0,
        isOpfsPersisted: false,
        hasParquetCache: false,
      },
      durationMs: performance.now() - start,
    }
  }
}

/**
 * データロード完了後に Parquet キャッシュを非同期でエクスポートする。
 * メインのデータフローをブロックしない fire-and-forget パターン。
 */
export async function scheduleParquetExport(client: DuckDBWorkerClient): Promise<void> {
  try {
    const result = await client.exportParquet()
    if (result.tablesExported > 0) {
      console.info(
        `Parquet cache: ${result.tablesExported} tables, ${result.totalRows} rows in ${result.durationMs.toFixed(0)}ms`,
      )
    }
  } catch {
    // Parquet エクスポート失敗は無視（キャッシュは best-effort）
    console.warn('Parquet cache export failed (non-critical)')
  }
}

/**
 * OPFS 上の Parquet キャッシュを削除する。
 *
 * @returns true=削除成功, false=OPFS 未対応または削除失敗
 */
export async function clearParquetCache(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry('parquet-cache', { recursive: true })
    return true
  } catch {
    return false
  }
}
