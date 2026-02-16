import { useCallback } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import type { AppSettings } from '@/domain/models'

const STORAGE_KEY = 'shiire-arari-settings'

/** 設定管理フック */
export function useSettings() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      dispatch({ type: 'UPDATE_SETTINGS', payload: updates })

      // localStorageに永続化
      try {
        const merged = { ...state.settings, ...updates }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      } catch {
        // localStorage利用不可時は無視
      }
    },
    [state.settings, dispatch],
  )

  return {
    settings: state.settings,
    updateSettings,
  }
}

/** localStorageから設定を復元する */
export function loadSettingsFromStorage(): Partial<AppSettings> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // パース失敗時は無視
  }
  return null
}
