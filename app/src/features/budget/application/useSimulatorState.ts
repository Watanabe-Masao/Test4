/**
 * 予算達成シミュレーター — UI state 管理 hook
 *
 * state 設計:
 * - `currentDay`: 基準日 (1..daysInMonth、localStorage 永続化)
 * - `weekStart`: 0=日曜始まり / 1=月曜始まり (localStorage 永続化)
 * - `simulation`: 残期間シミュレーション入力を束ねたオブジェクト
 *   (mode / yoyInput / achInput / dowInputs / dowBase / dayOverrides)
 *
 * ReducerLike な setter API を外部に提供する (個別 setter はクロージャで割り当て)。
 * useState の個数を G8-P10 (≤6) に収めるため simulation 部分を 1 つの state に統合。
 *
 * currentDay と weekStart のみ localStorage に永続化する (プロトタイプ準拠)。
 * simulation 部分は session 内メモリのみ — 月替わりで自然に reset される。
 *
 * @responsibility R:unclassified
 */
import { useCallback, useEffect, useState } from 'react'
import type { DowBase, DowFactors, SimulatorMode } from '@/domain/calculations/budgetSimulator'

// localStorage キー (既存の `shiire-arari-*` 命名規約に準拠)
export const STORAGE_KEY_DAY = 'shiire-arari-budget-simulator-day'
export const STORAGE_KEY_WEEKSTART = 'shiire-arari-budget-simulator-weekstart'

export type WeekStart = 0 | 1

/** 残期間シミュレーション入力を束ねた state */
export interface SimulationInputs {
  readonly mode: SimulatorMode
  readonly yoyInput: number
  readonly achInput: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
}

export interface SimulatorState extends SimulationInputs {
  readonly currentDay: number
  readonly weekStart: WeekStart
}

export interface SimulatorStateApi extends SimulatorState {
  readonly setCurrentDay: (d: number) => void
  readonly setMode: (m: SimulatorMode) => void
  readonly setYoyInput: (n: number) => void
  readonly setAchInput: (n: number) => void
  readonly setDowInputs: (inputs: DowFactors) => void
  readonly setDowBase: (b: DowBase) => void
  readonly setDayOverride: (day: number, pct: number) => void
  readonly clearDayOverride: (day: number) => void
  readonly resetDayOverrides: () => void
  readonly setWeekStart: (s: WeekStart) => void
}

const DEFAULT_SIMULATION_INPUTS: SimulationInputs = {
  mode: 'yoy',
  yoyInput: 100,
  achInput: 100,
  dowInputs: [100, 100, 100, 100, 100, 100, 100],
  dowBase: 'yoy',
  dayOverrides: {},
}

function clampDay(d: number, daysInMonth: number): number {
  if (!Number.isFinite(d)) return 1
  return Math.max(1, Math.min(Math.trunc(d), daysInMonth))
}

function readInt(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeInt(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // localStorage 不可環境 (SSR / プライベートモード) では無視
  }
}

/**
 * シミュレーター state の hook。
 *
 * @param initialCurrentDay localStorage に保存値がない場合の初期基準日
 *   (観測期間の lastRecordedSalesDay を渡す想定)
 * @param daysInMonth 当月日数。currentDay の clamp と restore 時の範囲チェックに使う
 */
export function useSimulatorState(
  initialCurrentDay: number,
  daysInMonth: number,
): SimulatorStateApi {
  // rawCurrentDay は clamp 前の値。外部に見せる currentDay は render 時に derive する
  // ことで daysInMonth 変更にも即応しつつ、effect 内 setState による cascading render を避ける。
  const [rawCurrentDay, setRawCurrentDay] = useState<number>(() => {
    const saved = readInt(STORAGE_KEY_DAY)
    return saved ?? initialCurrentDay
  })
  const currentDay = clampDay(rawCurrentDay, daysInMonth)

  const [weekStart, setWeekStartState] = useState<WeekStart>(() => {
    const saved = readInt(STORAGE_KEY_WEEKSTART)
    return saved === 0 || saved === 1 ? (saved as WeekStart) : 1
  })

  const [sim, setSim] = useState<SimulationInputs>(DEFAULT_SIMULATION_INPUTS)

  useEffect(() => {
    writeInt(STORAGE_KEY_DAY, currentDay)
  }, [currentDay])

  useEffect(() => {
    writeInt(STORAGE_KEY_WEEKSTART, weekStart)
  }, [weekStart])

  const setCurrentDay = useCallback(
    (d: number) => setRawCurrentDay(clampDay(d, daysInMonth)),
    [daysInMonth],
  )

  const setWeekStart = useCallback((s: WeekStart) => setWeekStartState(s), [])

  const setMode = useCallback((m: SimulatorMode) => setSim((s) => ({ ...s, mode: m })), [])
  const setYoyInput = useCallback((n: number) => setSim((s) => ({ ...s, yoyInput: n })), [])
  const setAchInput = useCallback((n: number) => setSim((s) => ({ ...s, achInput: n })), [])
  const setDowInputs = useCallback(
    (inputs: DowFactors) => setSim((s) => ({ ...s, dowInputs: inputs })),
    [],
  )
  const setDowBase = useCallback((b: DowBase) => setSim((s) => ({ ...s, dowBase: b })), [])

  const setDayOverride = useCallback((day: number, pct: number) => {
    setSim((s) => ({ ...s, dayOverrides: { ...s.dayOverrides, [day]: pct } }))
  }, [])

  const clearDayOverride = useCallback((day: number) => {
    setSim((s) => {
      if (!(day in s.dayOverrides)) return s
      const next = { ...s.dayOverrides }
      delete next[day]
      return { ...s, dayOverrides: next }
    })
  }, [])

  const resetDayOverrides = useCallback(() => setSim((s) => ({ ...s, dayOverrides: {} })), [])

  return {
    currentDay,
    weekStart,
    ...sim,
    setCurrentDay,
    setMode,
    setYoyInput,
    setAchInput,
    setDowInputs,
    setDowBase,
    setDayOverride,
    clearDayOverride,
    resetDayOverrides,
    setWeekStart,
  }
}
