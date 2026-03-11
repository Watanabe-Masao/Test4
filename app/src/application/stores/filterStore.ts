/**
 * filterStore — 統一フィルタ Zustand ストア
 *
 * UI からの絞り込み条件の Single Source of Truth。
 * JS 計算エンジンと DuckDB データ取得の両方がこのストアを経由して
 * フィルタ条件を受け取ることで、整合性を保証する。
 *
 * ## 責務の分担
 *
 * - storeIds: uiStore が管理（永続化・toggle 操作は uiStore の責務）
 *   → セレクタフック（useFilterSelectors）で合流させる
 * - targetYear / targetMonth: settingsStore が管理（アプリ設定の責務）
 *   → セレクタフックで dateRange に合成する
 * - dayRange / aggregateMode / selectedDows / hierarchy / analysisContext:
 *   → 本ストアが管理
 *
 * ## カスケードリセット
 *
 * - dayRange: settingsStore.dataEndDay 変更時にリセット
 * - hierarchy: deptCode 変更時に lineCode/klassCode をリセット
 *             lineCode 変更時に klassCode をリセット
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { AggregateMode, HierarchyFilter } from '@/domain/models/UnifiedFilter'
import { EMPTY_HIERARCHY } from '@/domain/models/UnifiedFilter'

// ─── Types ────────────────────────────────────────────

interface FilterStoreState {
  /** 月内の日範囲 [from, to]（1-based） */
  dayRange: readonly [number, number]
  /** 集計モード */
  aggregateMode: AggregateMode
  /** 選択中の曜日（0=日〜6=土） */
  selectedDows: ReadonlySet<number>
  /** 部門/ライン/クラスの階層フィルタ */
  hierarchy: HierarchyFilter
  /** カテゴリフィルタ（null = フィルタなし） */
  categoryFilter: string | null
  /** 部門フィルタ（null = フィルタなし） */
  departmentFilter: string | null
}

interface FilterStoreActions {
  /** 日範囲を設定 */
  setDayRange: (range: readonly [number, number]) => void
  /** 集計モードを設定 */
  setAggregateMode: (mode: AggregateMode) => void
  /** 曜日の選択をトグル */
  toggleDow: (dow: number) => void
  /** 全曜日を選択（リセット） */
  selectAllDows: () => void
  /** 部門コードを設定（ライン・クラスはリセット） */
  setHierarchyDept: (code: string | null) => void
  /** ラインコードを設定（クラスはリセット） */
  setHierarchyLine: (code: string | null) => void
  /** クラスコードを設定 */
  setHierarchyKlass: (code: string | null) => void
  /** カテゴリフィルタを設定 */
  setCategoryFilter: (category: string | null) => void
  /** 部門フィルタを設定 */
  setDepartmentFilter: (department: string | null) => void
  /** dayRange をデータ有効範囲に合わせてリセット */
  resetDayRange: (endDay: number) => void
  /** 全フィルタをリセット */
  resetAll: (daysInMonth?: number) => void
}

export interface FilterStore extends FilterStoreState, FilterStoreActions {}

// ─── Initial State ────────────────────────────────────

const INITIAL_STATE: FilterStoreState = {
  dayRange: [1, 31],
  aggregateMode: 'total',
  selectedDows: new Set<number>(),
  hierarchy: EMPTY_HIERARCHY,
  categoryFilter: null,
  departmentFilter: null,
}

// ─── Store ────────────────────────────────────────────

export const useFilterStore = create<FilterStore>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,

      setDayRange: (range) => set({ dayRange: range }, false, 'setDayRange'),

      setAggregateMode: (mode) => set({ aggregateMode: mode }, false, 'setAggregateMode'),

      toggleDow: (dow) =>
        set(
          (state) => {
            const next = new Set(state.selectedDows)
            if (next.has(dow)) next.delete(dow)
            else next.add(dow)
            return { selectedDows: next }
          },
          false,
          'toggleDow',
        ),

      selectAllDows: () => set({ selectedDows: new Set<number>() }, false, 'selectAllDows'),

      setHierarchyDept: (code) =>
        set(
          { hierarchy: { deptCode: code, lineCode: null, klassCode: null } },
          false,
          'setHierarchyDept',
        ),

      setHierarchyLine: (code) =>
        set(
          (state) => ({
            hierarchy: { ...state.hierarchy, lineCode: code, klassCode: null },
          }),
          false,
          'setHierarchyLine',
        ),

      setHierarchyKlass: (code) =>
        set(
          (state) => ({
            hierarchy: { ...state.hierarchy, klassCode: code },
          }),
          false,
          'setHierarchyKlass',
        ),

      setCategoryFilter: (category) =>
        set({ categoryFilter: category }, false, 'setCategoryFilter'),

      setDepartmentFilter: (department) =>
        set({ departmentFilter: department }, false, 'setDepartmentFilter'),

      resetDayRange: (endDay) => set({ dayRange: [1, endDay] }, false, 'resetDayRange'),

      resetAll: (daysInMonth) =>
        set(
          {
            ...INITIAL_STATE,
            dayRange: [1, daysInMonth ?? 31],
          },
          false,
          'resetAll',
        ),
    }),
    { name: 'FilterStore' },
  ),
)
