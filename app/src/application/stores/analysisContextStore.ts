/**
 * analysisContextStore — 互換レイヤー
 *
 * filterStore に統合済み。既存コードの import を壊さないための薄いラッパー。
 * 新規コードは filterStore を直接使用すること。
 *
 * @deprecated filterStore を使用してください
 * @guard C3 store は state 反映のみ
 */
import { useFilterStore } from './filterStore'

// ─── Types（後方互換のため維持）────────────────────────

export interface AnalysisContextState {
  /** @deprecated filterStore.categoryFilter を使用 */
  categoryFilter: string | null
  /** @deprecated filterStore.departmentFilter を使用 */
  departmentFilter: string | null
}

export interface AnalysisContextStore extends AnalysisContextState {
  setCategoryFilter: (category: string | null) => void
  setDepartmentFilter: (department: string | null) => void
  resetFilters: () => void
}

// ─── 互換ストア ────────────────────────────────────────

/**
 * @deprecated useFilterStore を使用してください
 *
 * filterStore へ委譲する互換レイヤー。
 * 内部的に filterStore.getState() を使い、同じ state を参照する。
 */
export const useAnalysisContextStore = Object.assign(
  <T>(selector: (state: AnalysisContextStore) => T): T => {
    return useFilterStore((filterState) =>
      selector({
        categoryFilter: filterState.categoryFilter,
        departmentFilter: filterState.departmentFilter,
        setCategoryFilter: filterState.setCategoryFilter,
        setDepartmentFilter: filterState.setDepartmentFilter,
        resetFilters: () => {
          const store = useFilterStore.getState()
          store.setCategoryFilter(null)
          store.setDepartmentFilter(null)
        },
      }),
    )
  },
  {
    /** getState() 互換 */
    getState: (): AnalysisContextStore => {
      const state = useFilterStore.getState()
      return {
        categoryFilter: state.categoryFilter,
        departmentFilter: state.departmentFilter,
        setCategoryFilter: state.setCategoryFilter,
        setDepartmentFilter: state.setDepartmentFilter,
        resetFilters: () => {
          state.setCategoryFilter(null)
          state.setDepartmentFilter(null)
        },
      }
    },
  },
)
