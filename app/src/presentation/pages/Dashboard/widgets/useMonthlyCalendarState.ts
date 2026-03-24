import { useState, useMemo } from 'react'
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
  const [pinDay, setPinDay] = useState<number | null>(null)
  const [detailDay, setDetailDay] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [rangeAStart, setRangeAStart] = useState<string>('')
  const [rangeAEnd, setRangeAEnd] = useState<string>('')
  const [rangeBStart, setRangeBStart] = useState<string>('')
  const [rangeBEnd, setRangeBEnd] = useState<string>('')
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

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
    setRangeAStart('')
    setRangeAEnd('')
    setRangeBStart('')
    setRangeBEnd('')
  }

  const handleRangeSwap = () => {
    const tmpS = rangeAStart,
      tmpE = rangeAEnd
    setRangeAStart(rangeBStart)
    setRangeAEnd(rangeBEnd)
    setRangeBStart(tmpS)
    setRangeBEnd(tmpE)
  }

  // ── Pins & intervals ──
  const sortedPins = [...pins.entries()].sort((a, b) => a[0] - b[0])
  const intervals = calculatePinIntervals(r.daily, r.openingInventory, sortedPins)
  const getIntervalForDay = (day: number) =>
    intervals.find((iv) => day >= iv.startDay && day <= iv.endDay)

  const handleOpenPin = (day: number) => {
    setPinDay(day)
    setInputVal(pins.has(day) ? String(pins.get(day)) : '')
  }

  const handlePinConfirm = () => {
    if (pinDay == null) return
    const val = Number(inputVal.replace(/,/g, ''))
    if (isNaN(val) || val < 0) return
    setPins((prev) => {
      const next = new Map(prev)
      next.set(pinDay, val)
      return next
    })
    setPinDay(null)
  }

  const handlePinRemove = () => {
    if (pinDay == null) return
    setPins((prev) => {
      const next = new Map(prev)
      next.delete(pinDay)
      return next
    })
    setPinDay(null)
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
    // Prev year lookup
    getPrevYearSales: (day: number) =>
      getPrevYearDailySales(prevYear, year, month, day),
    // Export
    isExporting,
    handleClipExport,
  }
}
