/**
 * DiscountAnalysisPanel — 売変選択時の売変内訳分析パネル
 *
 * 既存 DiscountTrendChart（種別スタック棒+累計売変率ライン+前年比較）をラップ。
 * DailyRecord Map は DiscountTrendChart が使用（将来 DuckDB 化予定）。
 */
import { memo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import type { DiscountEntry } from '@/domain/models/record'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { DiscountTrendChart } from './DiscountTrendChart'

interface Props {
  readonly ctx: DuckQueryContext
  /** DiscountTrendChart が使用する DailyRecord データ（将来 DuckDB 化で廃止予定） */
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
  daily,
  daysInMonth,
  year,
  month,
  discountEntries,
  totalGrossSales,
  prevYearDaily,
}: Props) {
  return (
    <DiscountTrendChart
      daily={daily}
      daysInMonth={daysInMonth}
      year={year}
      month={month}
      discountEntries={discountEntries}
      totalGrossSales={totalGrossSales}
      prevYearDaily={prevYearDaily}
      embedded
    />
  )
})
