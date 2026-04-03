import { useState, useCallback, useMemo, useRef } from 'react'
import { getPrevYearDailySales } from '@/application/comparison/comparisonAccessors'
import {
  calculateAchievementRate,
  calculateYoYRatio,
  safeDivide,
} from '@/domain/calculations/utils'
import { calculatePinIntervals } from '@/application/hooks/calculation'
import { useClipExport } from '@/application/hooks/useClipExport'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { WidgetContext } from './types'
import { buildCalendarWeeks, buildCumulativeMaps } from './calendarUtils'

export function useMonthlyCalendarState(ctx: WidgetContext) {
  const { result: r, daysInMonth, year, month, prevYear } = ctx

  // ── State ──
  const [pins, setPins] = useState<Map<number, number>>(new Map())
  const [pinDialog, setPinDialog] = useState<{ day: number | null; input: string }>({
    day: null,
    input: '',
  })
  const [detailDay, setDetailDay] = useState<number | null>(null)
  const [ranges, setRanges] = useState<{
    aStart: string
    aEnd: string
    bStart: string
    bEnd: string
  }>({ aStart: '', aEnd: '', bStart: '', bEnd: '' })
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  // Derived accessors for backward compatibility
  const pinDay = pinDialog.day
  const inputVal = pinDialog.input
  const rangeAStart = ranges.aStart
  const rangeAEnd = ranges.aEnd
  const rangeBStart = ranges.bStart
  const rangeBEnd = ranges.bEnd

  const setPinDay = useCallback(
    (day: number | null) => setPinDialog((prev) => ({ ...prev, day })),
    [],
  )
  const setInputVal = useCallback(
    (input: string) => setPinDialog((prev) => ({ ...prev, input })),
    [],
  )
  const setRangeAStart = useCallback(
    (v: string) => setRanges((prev) => ({ ...prev, aStart: v })),
    [],
  )
  const setRangeAEnd = useCallback((v: string) => setRanges((prev) => ({ ...prev, aEnd: v })), [])
  const setRangeBStart = useCallback(
    (v: string) => setRanges((prev) => ({ ...prev, bStart: v })),
    [],
  )
  const setRangeBEnd = useCallback((v: string) => setRanges((prev) => ({ ...prev, bEnd: v })), [])

  // ── ドラッグ期間選択（useRef で state 上限を回避） ──
  const dragRef = useRef<{ active: boolean; target: 'A' | 'B'; anchorDay: number | null }>({
    active: false,
    target: 'A',
    anchorDay: null,
  })

  const handleDragStart = useCallback(
    (day: number, target: 'A' | 'B') => {
      dragRef.current = { active: true, target, anchorDay: day }
      if (target === 'A') {
        setRangeAStart(String(day))
        setRangeAEnd(String(day))
      } else {
        setRangeBStart(String(day))
        setRangeBEnd(String(day))
      }
    },
    [setRangeAStart, setRangeAEnd, setRangeBStart, setRangeBEnd],
  )

  const handleDragEnter = useCallback(
    (day: number) => {
      const d = dragRef.current
      if (!d.active || d.anchorDay == null) return
      const start = Math.min(d.anchorDay, day)
      const end = Math.max(d.anchorDay, day)
      if (d.target === 'A') {
        setRangeAStart(String(start))
        setRangeAEnd(String(end))
      } else {
        setRangeBStart(String(start))
        setRangeBEnd(String(end))
      }
    },
    [setRangeAStart, setRangeAEnd, setRangeBStart, setRangeBEnd],
  )

  const handleDragEnd = useCallback(() => {
    dragRef.current = { ...dragRef.current, active: false }
  }, [])

  const handleSetDragTarget = useCallback((target: 'A' | 'B') => {
    dragRef.current = { ...dragRef.current, target }
  }, [])

  // ── クリップエクスポート（hook 経由 — A3: presentation は描画専用） ──
  const clipExportParams = useMemo(
    () => ({
      result: r,
      prevYear,
      year,
      month,
      daysInMonth,
      storeKey: ctx.storeKey,
      stores: ctx.stores,
      queryExecutor: ctx.queryExecutor,
      selectedStoreIds: ctx.selectedStoreIds,
      comparisonScope: ctx.comparisonScope,
    }),
    [
      r,
      prevYear,
      year,
      month,
      daysInMonth,
      ctx.storeKey,
      ctx.stores,
      ctx.queryExecutor,
      ctx.selectedStoreIds,
      ctx.comparisonScope,
    ],
  )
  const { isExporting, exportClip: handleClipExport } = useClipExport(clipExportParams)

  // ── Weather data（ctx から一元取得 — 個別 hook 呼び出し禁止） ──
  const weatherDaily = useMemo(() => ctx.weatherDaily ?? [], [ctx.weatherDaily])
  const weatherByDay = useMemo(() => {
    const m = new Map<number, DailyWeatherSummary>()
    for (const d of weatherDaily) {
      const dayNum = Number(d.dateKey.split('-')[2])
      m.set(dayNum, d)
    }
    return m
  }, [weatherDaily])

  // Build calendar grid
  const weeks = buildCalendarWeeks(year, month, daysInMonth)

  // Cumulative data (sales + customers)
  const { cumBudget, cumSales, cumPrevYear, cumCustomers, cumPrevCustomers } = buildCumulativeMaps(
    daysInMonth,
    r,
    prevYear,
    year,
    month,
  )

  // ── Range selection ──
  const parseDay = (v: string) => {
    const n = parseInt(v, 10)
    return n >= 1 && n <= daysInMonth ? n : null
  }
  const rangeA = { start: parseDay(rangeAStart), end: parseDay(rangeAEnd) }
  const rangeB = { start: parseDay(rangeBStart), end: parseDay(rangeBEnd) }

  const calcRange = (start: number | null, end: number | null) => {
    if (start == null || end == null || start > end) return null
    let budget = 0,
      sales = 0,
      pySales = 0,
      salesDaysCount = 0
    for (let d = start; d <= end; d++) {
      budget += r.budgetDaily.get(d) ?? 0
      const daySales = r.daily.get(d)?.sales ?? 0
      sales += daySales
      pySales += getPrevYearDailySales(prevYear, year, month, d)
      if (daySales > 0) salesDaysCount++
    }
    const diff = sales - budget
    const ach = calculateAchievementRate(sales, budget)
    const pyRatio = calculateYoYRatio(sales, pySales)
    const avgDaily = safeDivide(sales, salesDaysCount, 0)
    return { start, end, budget, sales, diff, ach, pySales, pyRatio, salesDaysCount, avgDaily }
  }
  const rangeAData = calcRange(rangeA.start, rangeA.end)
  const rangeBData = calcRange(rangeB.start, rangeB.end)
  const hasAnyRange = rangeAData != null || rangeBData != null

  const isDayInRangeA = (day: number) =>
    rangeA.start != null && rangeA.end != null && day >= rangeA.start && day <= rangeA.end
  const isDayInRangeB = (day: number) =>
    rangeB.start != null && rangeB.end != null && day >= rangeB.start && day <= rangeB.end

  const handleRangeClear = () => {
    setRanges({ aStart: '', aEnd: '', bStart: '', bEnd: '' })
  }

  const handleRangeSwap = () => {
    setRanges((prev) => ({
      aStart: prev.bStart,
      aEnd: prev.bEnd,
      bStart: prev.aStart,
      bEnd: prev.aEnd,
    }))
  }

  // ── Pins & intervals ──
  const sortedPins = [...pins.entries()].sort((a, b) => a[0] - b[0])
  const intervals = calculatePinIntervals(r.daily, r.openingInventory, sortedPins)
  const getIntervalForDay = (day: number) =>
    intervals.find((iv) => day >= iv.startDay && day <= iv.endDay)

  const handleOpenPin = (day: number) => {
    setPinDialog({ day, input: pins.has(day) ? String(pins.get(day)) : '' })
  }

  const handlePinConfirm = () => {
    if (pinDialog.day == null) return
    const val = Number(pinDialog.input.replace(/,/g, ''))
    if (isNaN(val) || val < 0) return
    const confirmDay = pinDialog.day
    setPins((prev) => {
      const next = new Map(prev)
      next.set(confirmDay, val)
      return next
    })
    setPinDialog({ day: null, input: '' })
  }

  const handlePinRemove = () => {
    if (pinDialog.day == null) return
    const removeDay = pinDialog.day
    setPins((prev) => {
      const next = new Map(prev)
      next.delete(removeDay)
      return next
    })
    setPinDialog({ day: null, input: '' })
  }

  return {
    // State
    pins,
    pinDay,
    detailDay,
    hoveredDay,
    inputVal,
    setPinDay,
    setDetailDay,
    setHoveredDay,
    setInputVal,
    // Range
    rangeAStart,
    rangeAEnd,
    rangeBStart,
    rangeBEnd,
    setRangeAStart,
    setRangeAEnd,
    setRangeBStart,
    setRangeBEnd,
    rangeAData,
    rangeBData,
    hasAnyRange,
    isDayInRangeA,
    isDayInRangeB,
    handleRangeClear,
    handleRangeSwap,
    // Calendar data
    weeks,
    cumBudget,
    cumSales,
    cumPrevYear,
    cumCustomers,
    cumPrevCustomers,
    weatherByDay,
    // Pins
    sortedPins,
    intervals,
    getIntervalForDay,
    handleOpenPin,
    handlePinConfirm,
    handlePinRemove,
    // Drag selection
    dragRef,
    setDragTarget: handleSetDragTarget,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    // Prev year lookup
    getPrevYearSales: (day: number) => getPrevYearDailySales(prevYear, year, month, day),
    // Export
    isExporting,
    handleClipExport,
  }
}
