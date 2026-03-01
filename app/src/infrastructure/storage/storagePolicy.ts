/**
 * ストレージ圧迫ポリシー
 *
 * navigator.storage.estimate() でストレージ使用量を監視し、
 * 圧迫時の優先削除順を定義する。
 *
 * 優先削除順:
 * 1. クエリキャッシュ（即座に削除可能）
 * 2. OPFS の DuckDB DB ファイル（原本+レシピから再構築可能）
 * 3. 古い月の IndexedDB monthlyData
 * 4. **原本（rawFiles）は最後まで守る**
 */
import { getStorageEstimate, type StorageEstimate } from './storagePersistence'

/** ストレージ圧迫レベル */
export type StoragePressureLevel = 'normal' | 'warning' | 'critical'

/** ストレージ状態 */
export interface StorageStatus {
  readonly estimate: StorageEstimate | null
  readonly level: StoragePressureLevel
  readonly usageFormatted: string
  readonly quotaFormatted: string
}

/** しきい値 */
const WARNING_THRESHOLD = 0.8
const CRITICAL_THRESHOLD = 0.95

/**
 * バイト数を人間が読める形式にフォーマットする
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)} ${units[i]}`
}

/**
 * 現在のストレージ状態を取得する
 */
export async function getStorageStatus(): Promise<StorageStatus> {
  const estimate = await getStorageEstimate()

  if (!estimate) {
    return {
      estimate: null,
      level: 'normal',
      usageFormatted: 'N/A',
      quotaFormatted: 'N/A',
    }
  }

  let level: StoragePressureLevel = 'normal'
  if (estimate.usageRatio >= CRITICAL_THRESHOLD) {
    level = 'critical'
  } else if (estimate.usageRatio >= WARNING_THRESHOLD) {
    level = 'warning'
  }

  return {
    estimate,
    level,
    usageFormatted: formatBytes(estimate.usage),
    quotaFormatted: formatBytes(estimate.quota),
  }
}

/** 削除アクション定義 */
export interface CleanupAction {
  readonly id: string
  readonly label: string
  readonly description: string
  /** 推定削減サイズ (bytes)。不明な場合は null */
  readonly estimatedSavings: number | null
  /** 削除関数 */
  execute(): Promise<void>
}

/**
 * 利用可能なクリーンアップアクションを優先度順に返す。
 * 各アクションには execute() 関数があり、呼び出すとデータを削除する。
 *
 * 呼び出し側は UI でユーザーに確認を求めてから execute() を呼ぶこと。
 */
export function getCleanupActions(options: {
  clearQueryCache?: () => void
  deleteDuckDBFile?: () => Promise<boolean>
  clearOldMonths?: (keepRecent: number) => Promise<number>
}): readonly CleanupAction[] {
  const actions: CleanupAction[] = []

  if (options.clearQueryCache) {
    const clearFn = options.clearQueryCache
    actions.push({
      id: 'query-cache',
      label: 'クエリキャッシュ削除',
      description: '計算キャッシュを削除します。次回計算時に再生成されます。',
      estimatedSavings: null,
      execute: async () => clearFn(),
    })
  }

  if (options.deleteDuckDBFile) {
    const deleteFn = options.deleteDuckDBFile
    actions.push({
      id: 'duckdb-opfs',
      label: 'DuckDB キャッシュ削除',
      description: 'OPFS の DuckDB ファイルを削除します。次回起動時に再構築されます。',
      estimatedSavings: null,
      execute: async () => {
        await deleteFn()
      },
    })
  }

  if (options.clearOldMonths) {
    const clearFn = options.clearOldMonths
    actions.push({
      id: 'old-months',
      label: '古い月データの削除',
      description: '直近3ヶ月以外のデータを削除します。バックアップを先に取ることを推奨。',
      estimatedSavings: null,
      execute: async () => {
        await clearFn(3)
      },
    })
  }

  return actions
}
