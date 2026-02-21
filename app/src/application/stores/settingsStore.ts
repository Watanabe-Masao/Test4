import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AppSettings } from '@/domain/models'
import { createDefaultSettings } from '@/domain/constants/defaults'

// ─── Types ────────────────────────────────────────────
export interface SettingsStore {
  // State
  settings: AppSettings

  // Actions
  updateSettings: (updates: Partial<AppSettings>) => void
  reset: () => void
}

// ─── Store ────────────────────────────────────────────
export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        settings: createDefaultSettings(),

        // Actions
        updateSettings: (updates) =>
          set(
            (state) => ({
              settings: { ...state.settings, ...updates },
            }),
            false,
            'updateSettings',
          ),

        reset: () =>
          set(
            { settings: createDefaultSettings() },
            false,
            'reset',
          ),
      }),
      {
        name: 'shiire-arari-settings',
        partialize: (state) => ({ settings: state.settings }),
      },
    ),
    { name: 'SettingsStore' },
  ),
)
