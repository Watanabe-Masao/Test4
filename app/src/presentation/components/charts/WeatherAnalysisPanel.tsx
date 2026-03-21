/**
 * WeatherAnalysisPanel — 天気選択時の天気-売上相関分析パネル
 *
 * 既存 WeatherCorrelationChart をサブパネルとして配置。
 * 売上・客数データは DuckDB store_day_summary から取得。
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { useDuckDBStoreDaySummary } from '@/application/hooks/useDuckDBQuery'
import type { DuckQueryContext } from './SubAnalysisPanel'
import { WeatherCorrelationChart } from './WeatherCorrelationChart'

interface Props {
  readonly ctx: DuckQueryContext
  readonly weatherDaily?: readonly DailyWeatherSummary[]
}

export const WeatherAnalysisPanel = memo(function WeatherAnalysisPanel({
  ctx,
  weatherDaily,
}: Props) {
  const { duckConn, duckDataVersion, currentDateRange, selectedStoreIds } = ctx
  // DuckDB から日別売上・客数を取得
  const { data: dailyRows } = useDuckDBStoreDaySummary(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )

  const salesDaily = useMemo((): readonly DailySalesForCorrelation[] => {
    if (!dailyRows) return []
    // 日別に集約（複数店舗の場合）
    const byDay = new Map<number, { sales: number; customers: number }>()
    for (const row of dailyRows) {
      const existing = byDay.get(row.day) ?? { sales: 0, customers: 0 }
      existing.sales += row.sales
      existing.customers += row.customers
      byDay.set(row.day, existing)
    }
    return [...byDay.entries()].map(([day, v]) => ({
      dateKey: `${day}`,
      sales: v.sales,
      customers: v.customers,
    }))
  }, [dailyRows])

  if (!weatherDaily || weatherDaily.length === 0) {
    return <NoData>天気データがありません</NoData>
  }

  return <WeatherCorrelationChart weatherDaily={weatherDaily} salesDaily={salesDaily} />
})

// ── Styles ──

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: 0.75rem;
`
