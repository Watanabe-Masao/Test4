import { useCallback } from 'react'
import { useSettingsStore } from '@/application/stores'
import { useUiStore } from '@/application/stores'
import type { AppSettings } from '@/domain/models/storeTypes'
import { loadJson } from '@/application/adapters/uiPersistenceAdapter'

/** 設定管理フック (Zustand ストア版) */
export function useSettings() {
  const settings = useSettingsStore((s) => s.settings)
  const zustandUpdate = useSettingsStore((s) => s.updateSettings)

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      zustandUpdate(updates)
      // 設定変更 → 計算無効化
      useUiStore.getState().invalidateCalculation()
    },
    [zustandUpdate],
  )

  return {
    settings,
    updateSettings,
  }
}

/** localStorageから設定を復元する (Zustand persist が自動処理するため非推奨) */
export function loadSettingsFromStorage(): Partial<AppSettings> | null {
  return loadJson<Partial<AppSettings> | null>('shiire-arari-settings', null, (raw) => {
    const parsed = raw as Record<string, unknown> | null
    // Zustand persist format: { state: { settings: ... } }
    if (parsed?.state && typeof parsed.state === 'object') {
      const state = parsed.state as Record<string, unknown>
      if (state.settings) return state.settings as Partial<AppSettings>
    }
    // Legacy format: direct settings object
    return parsed as Partial<AppSettings> | null
  })
}
