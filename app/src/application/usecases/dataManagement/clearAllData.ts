import type { DataRepository } from '@/domain/repositories/DataRepository'

/** clearAllData が必要とする副作用（DI で注入） */
export interface ClearAllDataEffects {
  readonly repo: DataRepository
  readonly resetDataStore: () => void
  readonly resetUiTransientState: () => void
  readonly resetSettingsStore: () => void
  readonly clearCalculationCache: () => void
}

/**
 * 全データの破壊的削除を実行する。
 *
 * 1. インメモリ状態を即時クリア（UI 即時反映）
 * 2. 永続データ（IndexedDB）を削除
 */
export async function clearAllData(effects: ClearAllDataEffects): Promise<void> {
  effects.resetDataStore()
  effects.resetUiTransientState()
  effects.resetSettingsStore()
  effects.clearCalculationCache()
  await effects.repo.clearAll()
}
