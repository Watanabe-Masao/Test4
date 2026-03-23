/**
 * カテゴリ階層選択 sub-hook
 *
 * dept → line → klass のカスケード選択状態を管理する。
 * useDuckDBTimeSlotData から G5 違反解消のため分離。
 *
 * @guard G5 state ≤6, memo ≤7
 */
import { useState, useMemo } from 'react'

export interface HierarchyOption {
  readonly code: string
  readonly name: string
  readonly amount: number
}

interface LevelAggregationItem {
  readonly code: string
  readonly name: string
  readonly amount: number
}

export interface HierarchySelectionResult {
  readonly deptCode: string
  readonly lineCode: string
  readonly klassCode: string
  readonly setDeptCode: (code: string) => void
  readonly setLineCode: (code: string) => void
  readonly setKlassCode: (code: string) => void
  readonly hierarchy: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  }
}

/** 階層状態管理 — state 3 個 + memo 1 個 */
export function useHierarchySelection(): HierarchySelectionResult {
  const [deptCode, setDeptCodeRaw] = useState('')
  const [lineCode, setLineCodeRaw] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const hierarchy = useMemo(
    () => ({
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
    }),
    [deptCode, lineCode, klassCode],
  )

  const setDeptCode = (code: string) => {
    setDeptCodeRaw(code)
    setLineCodeRaw('')
    setKlassCode('')
  }
  const setLineCode = (code: string) => {
    setLineCodeRaw(code)
    setKlassCode('')
  }

  return {
    deptCode,
    lineCode,
    klassCode,
    setDeptCode,
    setLineCode,
    setKlassCode,
    hierarchy,
  }
}

/** 階層選択肢の構築（useMemo をまとめる） */
export function useHierarchyOptions(
  departments: readonly LevelAggregationItem[] | null | undefined,
  lines: readonly LevelAggregationItem[] | null | undefined,
  klasses: readonly LevelAggregationItem[] | null | undefined,
): {
  readonly deptOptions: readonly HierarchyOption[]
  readonly lineOptions: readonly HierarchyOption[]
  readonly klassOptions: readonly HierarchyOption[]
} {
  const deptOptions: readonly HierarchyOption[] = useMemo(
    () => departments?.map((d) => ({ code: d.code, name: d.name, amount: d.amount })) ?? [],
    [departments],
  )
  const lineOptions: readonly HierarchyOption[] = useMemo(
    () => lines?.map((l) => ({ code: l.code, name: l.name, amount: l.amount })) ?? [],
    [lines],
  )
  const klassOptions: readonly HierarchyOption[] = useMemo(
    () => klasses?.map((k) => ({ code: k.code, name: k.name, amount: k.amount })) ?? [],
    [klasses],
  )
  return { deptOptions, lineOptions, klassOptions }
}
