/**
 * DiscountAnalysisPanel — 売変選択時の売変内訳分析パネル
 *
 * 日別売変推移（DiscountTrendChart）+ カテゴリ別売変分析（CategoryDiscountChart）。
 * 日別チャートの日付クリックでカテゴリ別にドリルダウン。
 */
import { memo, useState, useCallback } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import type { DiscountEntry } from '@/domain/models/record'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { DiscountTrendChart } from './DiscountTrendChart'
import { CategoryDiscountChart } from './CategoryDiscountChart'

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
  const [drillDay, setDrillDay] = useState<number | null>(null)
  const [discountFilter, setDiscountFilter] = useState<string | null>(null)

  const handleDayClick = useCallback((day: number) => {
    setDrillDay((prev) => (prev === day ? null : day))
  }, [])

  const drillDateRange =
    drillDay != null
      ? { from: { year, month, day: drillDay }, to: { year, month, day: drillDay } }
      : ctx.currentDateRange

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
        onFilterChange={setDiscountFilter}
      />
      <CategoryDiscountChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={drillDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        dateLabel={drillDay != null ? `${month}月${drillDay}日` : undefined}
        discountTypeFilter={discountFilter}
      />
    </>
  )
})
