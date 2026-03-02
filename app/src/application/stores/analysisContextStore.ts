/**
 * analysisContextStore — 分析コンテキスト Zustand ストア
 *
 * 設計原則2「分析はコンテキスト駆動」の中核。
 * 全ページ共通のフィルタ・粒度・比較設定を一元管理する。
 */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AnalysisGranularity, ComparisonType, DataLineage } from '@/domain/models'

// ─── Types ────────────────────────────────────────────

export interface AnalysisContextState {
  /** 時間粒度 */
  granularity: AnalysisGranularity
  /** 比較タイプ（null = 比較なし） */
  comparisonType: ComparisonType | null
  /** データ系統（実績 or 推定） */
  dataLineage: DataLineage
  /** カテゴリ階層フィルタ（null = フィルタなし） */
  categoryFilter: string | null
  /** 部門フィルタ（null = フィルタなし） */
  departmentFilter: string | null
}

export interface AnalysisContextStore extends AnalysisContextState {
  // Actions
  setGranularity: (granularity: AnalysisGranularity) => void
  setComparisonType: (type: ComparisonType | null) => void
  setDataLineage: (lineage: DataLineage) => void
  setCategoryFilter: (category: string | null) => void
  setDepartmentFilter: (department: string | null) => void
  resetFilters: () => void
}

const INITIAL_STATE: AnalysisContextState = {
  granularity: 'daily',
  comparisonType: null,
  dataLineage: 'actual',
  categoryFilter: null,
  departmentFilter: null,
}

// ─── Store ────────────────────────────────────────────

export const useAnalysisContextStore = create<AnalysisContextStore>()(
  devtools(
    persist(
      (set) => ({
        ...INITIAL_STATE,

        setGranularity: (granularity) => set({ granularity }, false, 'setGranularity'),

        setComparisonType: (comparisonType) => set({ comparisonType }, false, 'setComparisonType'),

        setDataLineage: (dataLineage) => set({ dataLineage }, false, 'setDataLineage'),

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
      {
        name: 'shiire-arari-analysis-context',
        partialize: (state) => ({
          granularity: state.granularity,
          comparisonType: state.comparisonType,
          dataLineage: state.dataLineage,
        }),
      },
    ),
    { name: 'AnalysisContextStore' },
  ),
)
