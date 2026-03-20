/**
 * PeriodFilter フック（PeriodFilter.tsx から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（PeriodFilterBar, HierarchyDropdowns）とフックを別ファイルに分離。
 *
 * @see PeriodFilter.tsx — 設計ルール (RULE-1〜RULE-6) の詳細
 * @see periodFilterUtils.ts — 純粋関数群
 * @see divisorRules.test.ts — アーキテクチャガードテスト
 */
import { useState, useMemo, useCallback } from 'react'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { AggregateMode } from './periodFilterUtils'

export type { AggregateMode } from './periodFilterUtils'

export interface PeriodFilterState {
  /** 対象日範囲 [from, to] */
  dayRange: [number, number]
  /** 集計モード: total=期間合計, dailyAvg=期間内日平均, dowAvg=曜日別平均 */
  mode: AggregateMode
  /** dowAvg 時に対象とする曜日 (0=日〜6=土)。空=全曜日 */
  selectedDows: ReadonlySet<number>
}

export interface PeriodFilterResult extends PeriodFilterState {
  setDayRange: (range: [number, number]) => void
  setMode: (mode: AggregateMode) => void
  toggleDow: (dow: number) => void
  /** 期間 + 曜日でフィルタ済みレコードを返す */
  filterRecords: (records: readonly CategoryTimeSalesRecord[]) => readonly CategoryTimeSalesRecord[]
  /** year/month (曜日計算用) */
  year: number
  month: number
  /** データ末日に基づくデフォルト終了日（リセット用） */
  defaultEndDay: number
  /** デフォルト範囲にリセット */
  resetToDefault: () => void
}

/**
 * @param daysInMonth 月の日数
 * @param year 年
 * @param month 月
 * @param dataMaxDay データが存在する最大日（0 = 未検出）。変化時に自動リセット。
 */
export function usePeriodFilter(
  daysInMonth: number,
  year: number,
  month: number,
  dataMaxDay?: number,
): PeriodFilterResult {
  const effectiveEnd =
    dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
  const [dayRange, setDayRange] = useState<[number, number]>([1, effectiveEnd])
  const [mode, setMode] = useState<AggregateMode>('total')
  const [selectedDows, setSelectedDows] = useState<ReadonlySet<number>>(new Set<number>())

  // dataMaxDay 変化時（ファイル取込など）に自動リセット。
  // state に前回値を保持し、レンダー中に比較→リセット（React推奨パターン）。
  const [prevDataMaxDay, setPrevDataMaxDay] = useState(dataMaxDay)
  if (prevDataMaxDay !== dataMaxDay) {
    setPrevDataMaxDay(dataMaxDay)
    const newEnd = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
    setDayRange([1, newEnd])
  }

  const resetToDefault = useCallback(() => {
    const end = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
    setDayRange([1, end])
  }, [dataMaxDay, daysInMonth])

  const toggleDow = useCallback((dow: number) => {
    setSelectedDows((prev) => {
      const next = new Set(prev)
      if (next.has(dow)) next.delete(dow)
      else next.add(dow)
      return next
    })
  }, [])

  const filterRecords = useCallback(
    (records: readonly CategoryTimeSalesRecord[]) => {
      let result = records.filter((r) => r.day >= dayRange[0] && r.day <= dayRange[1])
      if (mode === 'dowAvg' && selectedDows.size > 0) {
        result = result.filter((r) => {
          const dow = new Date(year, month - 1, r.day).getDay()
          return selectedDows.has(dow)
        })
      }
      return result
    },
    [dayRange, mode, selectedDows, year, month],
  )

  return {
    dayRange,
    setDayRange,
    mode,
    setMode,
    selectedDows,
    toggleDow,
    filterRecords,
    year,
    month,
    defaultEndDay: effectiveEnd,
    resetToDefault,
  }
}

/* ── 部門/ライン/クラス プルダウンフィルタ ──────────────── */

interface HierarchyOption {
  code: string
  name: string
  total: number
}

export interface HierarchyFilterState {
  deptCode: string
  lineCode: string
  klassCode: string
}

export interface HierarchyFilterResult extends HierarchyFilterState {
  setDeptCode: (code: string) => void
  setLineCode: (code: string) => void
  setKlassCode: (code: string) => void
  departments: HierarchyOption[]
  lines: HierarchyOption[]
  klasses: HierarchyOption[]
  applyFilter: (records: readonly CategoryTimeSalesRecord[]) => readonly CategoryTimeSalesRecord[]
}

/** 部門/ライン/クラスの絞り込みプルダウン用 hook */
export function useHierarchyDropdown(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
): HierarchyFilterResult {
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const storeFiltered = useMemo(
    () =>
      selectedStoreIds.size === 0
        ? records
        : records.filter((r) => selectedStoreIds.has(r.storeId)),
    [records, selectedStoreIds],
  )

  const departments = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of storeFiltered) {
      const ex = map.get(rec.department.code)
      if (ex) {
        ex.total += rec.totalAmount
      } else {
        map.set(rec.department.code, {
          name: rec.department.name || rec.department.code,
          total: rec.totalAmount,
        })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered])

  const lines = useMemo(() => {
    const filtered = deptCode
      ? storeFiltered.filter((r) => r.department.code === deptCode)
      : storeFiltered
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of filtered) {
      const ex = map.get(rec.line.code)
      if (ex) {
        ex.total += rec.totalAmount
      } else {
        map.set(rec.line.code, { name: rec.line.name || rec.line.code, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered, deptCode])

  const klasses = useMemo(() => {
    let filtered = storeFiltered
    if (deptCode) filtered = filtered.filter((r) => r.department.code === deptCode)
    if (lineCode) filtered = filtered.filter((r) => r.line.code === lineCode)
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of filtered) {
      const ex = map.get(rec.klass.code)
      if (ex) {
        ex.total += rec.totalAmount
      } else {
        map.set(rec.klass.code, { name: rec.klass.name || rec.klass.code, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered, deptCode, lineCode])

  const applyFilter = useCallback(
    (recs: readonly CategoryTimeSalesRecord[]) => {
      let result = recs
      if (deptCode) result = result.filter((r) => r.department.code === deptCode)
      if (lineCode) result = result.filter((r) => r.line.code === lineCode)
      if (klassCode) result = result.filter((r) => r.klass.code === klassCode)
      return result
    },
    [deptCode, lineCode, klassCode],
  )

  // 親が変わったら子をリセット
  const wrappedSetDept = useCallback((code: string) => {
    setDeptCode(code)
    setLineCode('')
    setKlassCode('')
  }, [])
  const wrappedSetLine = useCallback((code: string) => {
    setLineCode(code)
    setKlassCode('')
  }, [])

  return {
    deptCode,
    lineCode,
    klassCode,
    setDeptCode: wrappedSetDept,
    setLineCode: wrappedSetLine,
    setKlassCode,
    departments,
    lines,
    klasses,
    applyFilter,
  }
}
