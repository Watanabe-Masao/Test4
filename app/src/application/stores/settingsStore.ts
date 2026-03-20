import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AppSettings, CustomCategory } from '@/domain/models/storeTypes'
import { createDefaultSettings } from '@/domain/constants/defaults'
import { LEGACY_LABEL_TO_ID } from '@/domain/constants/customCategories'

/** 旧ラベル（日本語）→ 新ID への自動マイグレーション */
function migrateSupplierCategoryMap(
  map: Readonly<Partial<Record<string, string>>>,
): Readonly<Partial<Record<string, CustomCategory>>> {
  const migrated: Record<string, CustomCategory> = {}
  for (const [code, value] of Object.entries(map)) {
    if (value != null) {
      migrated[code] = (LEGACY_LABEL_TO_ID[value] ?? value) as CustomCategory
    }
  }
  return migrated
}

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

        reset: () => set({ settings: createDefaultSettings() }, false, 'reset'),
      }),
      {
        name: 'shiire-arari-settings',
        partialize: (state) => ({ settings: state.settings }),
        merge: (persisted, current) => {
          const stored = persisted as { settings?: Partial<AppSettings> }
          const raw = { ...current.settings, ...(stored?.settings ?? {}) }
          // 旧ラベル（日本語）→ 新ID マイグレーション
          const settings: AppSettings = raw.supplierCategoryMap
            ? { ...raw, supplierCategoryMap: migrateSupplierCategoryMap(raw.supplierCategoryMap) }
            : raw
          return { ...current, settings }
        },
      },
    ),
    { name: 'SettingsStore' },
  ),
)
