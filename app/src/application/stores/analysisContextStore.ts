/**
 * analysisContextStore — 分析コンテキスト Zustand ストア
 *
 * 設計原則2「分析はコンテキスト駆動」の中核。
 * 全ページ共通のフィルタ設定を一元管理する。
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────

export interface AnalysisContextState {
  /** カテゴリ階層フィルタ（null = フィルタなし） */
  categoryFilter: string | null
  /** 部門フィルタ（null = フィルタなし） */
  departmentFilter: string | null
}

export interface AnalysisContextStore extends AnalysisContextState {
  // Actions
  setCategoryFilter: (category: string | null) => void
  setDepartmentFilter: (department: string | null) => void
  resetFilters: () => void
}

const INITIAL_STATE: AnalysisContextState = {
  categoryFilter: null,
  departmentFilter: null,
}

// ─── Store ────────────────────────────────────────────

export const useAnalysisContextStore = create<AnalysisContextStore>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      setCategoryFilter: (categoryFilter) => set({ categoryFilter }, false, 'setCategoryFilter'),

      setDepartmentFilter: (departmentFilter) =>
        set({ departmentFilter }, false, 'setDepartmentFilter'),

      resetFilters: () =>
        set(
          {
            categoryFilter: null,
            departmentFilter: null,
          },
          false,
          'resetFilters',
        ),
    }),
    { name: 'AnalysisContextStore' },
  ),
)
