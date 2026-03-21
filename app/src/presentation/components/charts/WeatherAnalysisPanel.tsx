/**
 * WeatherAnalysisPanel — 天気選択時の天気-売上相関分析パネル
 *
 * 既存 WeatherCorrelationChart をサブパネルとして配置。
 * daily データから salesDaily を構築して渡す。
 */
import { useMemo, memo } from 'react'
import styled from 'styled-components'
import type { DailyRecord, DailyWeatherSummary } from '@/domain/models/record'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { WeatherCorrelationChart } from './WeatherCorrelationChart'

interface Props {
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth: number
  readonly weatherDaily?: readonly DailyWeatherSummary[]
}

export const WeatherAnalysisPanel = memo(function WeatherAnalysisPanel({
  daily,
  daysInMonth,
  weatherDaily,
}: Props) {
  const salesDaily = useMemo((): readonly DailySalesForCorrelation[] => {
    const result: DailySalesForCorrelation[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      if (rec) {
        result.push({
          dateKey: `${d}`,
          sales: rec.sales,
          customers: rec.customers ?? 0,
        })
      }
    }
    return result
  }, [daily, daysInMonth])

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
