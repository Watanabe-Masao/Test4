import { useCallback } from 'react'
import { useSettingsStore } from '@/application/stores'
import { useUiStore } from '@/application/stores'
import type { AppSettings } from '@/domain/models'

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
  try {
    const stored = localStorage.getItem('shiire-arari-settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Zustand persist format: { state: { settings: ... } }
      if (parsed?.state?.settings) return parsed.state.settings
      // Legacy format: direct settings object
      return parsed
    }
  } catch {
    // パース失敗時は無視
  }
  return null
}
