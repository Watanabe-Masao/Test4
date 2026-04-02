/**
 * DiscountAnalysisPanel — 売変選択時の売変内訳分析パネル
 *
 * 日別売変推移（DiscountTrendChart）+ カテゴリ別売変分析（CategoryDiscountChart）。
 * 日別チャートの日付クリックまたは範囲ドラッグでカテゴリ別にドリルダウン。
 */
import { memo, useState, useCallback, useMemo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import type { DiscountEntry } from '@/domain/models/record'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { DiscountTrendChart } from './DiscountTrendChart'
import { CategoryDiscountChart } from '@/features/category'
import { useDrillDateRange } from '@/application/hooks/useDrillDateRange'

interface Props {
  readonly ctx: DuckQueryContext
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth: number
  readonly year: number
  readonly month: number
  readonly discountEntries?: readonly DiscountEntry[]
  readonly totalGrossSales?: number
  readonly prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >
}

export const DiscountAnalysisPanel = memo(function DiscountAnalysisPanel({
  ctx,
  daily,
  daysInMonth,
  year,
  month,
  discountEntries,
  totalGrossSales,
  prevYearDaily,
}: Props) {
  const [drillRange, setDrillRange] = useState<{ start: number; end: number } | null>(null)
  const [discountFilter, setDiscountFilter] = useState<string | null>(null)

  const handleDayClick = useCallback((day: number) => {
    setDrillRange((prev) =>
      prev?.start === day && prev?.end === day ? null : { start: day, end: day },
    )
  }, [])

  const handleDayRangeSelect = useCallback((startDay: number, endDay: number) => {
    setDrillRange({ start: startDay, end: endDay })
  }, [])

  const { dateRange: drillDateRange, prevYearScope: drillPrevYearScope } = useDrillDateRange(
    drillRange,
    year,
    month,
    ctx.prevYearScope,
  )

  const effectiveDateRange = drillDateRange ?? ctx.currentDateRange
  const effectivePrevYearScope = drillPrevYearScope ?? ctx.prevYearScope

  const dateLabel = useMemo(() => {
    if (!drillRange) return undefined
    if (drillRange.start === drillRange.end) return `${month}月${drillRange.start}日`
    return `${month}月${drillRange.start}〜${drillRange.end}日`
  }, [drillRange, month])

  return (
    <>
      <DiscountTrendChart
        daily={daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        discountEntries={discountEntries}
        totalGrossSales={totalGrossSales}
        prevYearDaily={prevYearDaily}
        embedded
        onDayClick={handleDayClick}
        onDayRangeSelect={handleDayRangeSelect}
        onFilterChange={setDiscountFilter}
      />
      <CategoryDiscountChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={effectiveDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        prevYearScope={effectivePrevYearScope}
        dateLabel={dateLabel}
        discountTypeFilter={discountFilter}
      />
    </>
  )
})
