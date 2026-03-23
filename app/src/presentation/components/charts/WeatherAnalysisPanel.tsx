/**
 * WeatherAnalysisPanel — 天気選択時の天気-売上相関分析パネル
 *
 * 既存 WeatherCorrelationChart をサブパネルとして配置。
 * 売上・客数データは DuckDB store_day_summary から取得。
 */
/**
 * @migration P5: useQueryWithHandler 経由に移行済み（旧: useDuckDBStoreDaySummary 直接 import）
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { dateRangeToKeys } from '@/domain/models/calendar'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  storeDaySummaryHandler,
  type StoreDaySummaryInput,
} from '@/application/queries/summary/StoreDaySummaryHandler'
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
  const { queryExecutor, currentDateRange, selectedStoreIds } = ctx

  const input = useMemo<StoreDaySummaryInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
    }
  }, [currentDateRange, selectedStoreIds])

  const { data: output } = useQueryWithHandler(queryExecutor, storeDaySummaryHandler, input)
  const dailyRows = output?.records ?? null

  const { year, month } = currentDateRange.from

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
    // dateKey を 'YYYY-MM-DD' 形式に変換（weatherDaily の dateKey と一致させる）
    return [...byDay.entries()].map(([day, v]) => ({
      dateKey: toDateKeyFromParts(year, month, day),
      sales: v.sales,
      customers: v.customers,
    }))
  }, [dailyRows, year, month])

  if (!weatherDaily || weatherDaily.length === 0) {
    return (
      <NoData>
        <NoDataTitle>天気データがありません</NoDataTitle>
        <NoDataDesc>
          設定画面で店舗の所在地（緯度・経度）を登録すると、
          気象庁の過去天気データ（ETRN）を自動取得し、売上との相関を分析できます。
        </NoDataDesc>
      </NoData>
    )
  }

  return <WeatherCorrelationChart weatherDaily={weatherDaily} salesDaily={salesDaily} embedded />
})

// ── Styles ──

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]};
`

const NoDataTitle = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const NoDataDesc = styled.div`
  font-size: 0.65rem;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
`
