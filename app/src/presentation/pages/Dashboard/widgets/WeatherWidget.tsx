/**
 * 天気ウィジェット — 日別天気サマリ + 売上相関チャート
 *
 * Open-Meteo API から天気データを取得し、WeatherBadge と
 * WeatherCorrelationChart を組み合わせてダッシュボードに表示する。
 */
import { memo, useMemo } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { useWeatherData } from '@/application/hooks/useWeather'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import { WeatherBadge } from '@/presentation/components/common/WeatherBadge'
import { WeatherCorrelationChart } from '@/presentation/components/charts/WeatherCorrelationChart'
import type { WidgetContext } from './types'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const DailySummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: ${({ theme }) => theme.spacing[1]};
`

const DayCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
`

const DayLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const LoadingText = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const ErrorText = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${sc.negative};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const NoLocationText = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const WeatherWidget = memo(function WeatherWidget({ ctx }: { ctx: WidgetContext }) {
  const storeId = ctx.result.storeId
  const { daily, isLoading, error } = useWeatherData(ctx.year, ctx.month, storeId)

  const salesDaily = useMemo<readonly DailySalesForCorrelation[]>(() => {
    const entries: DailySalesForCorrelation[] = []
    for (const [day, rec] of ctx.result.daily) {
      const mm = String(ctx.month).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      entries.push({
        dateKey: `${ctx.year}-${mm}-${dd}`,
        sales: rec.sales,
        customers: rec.customers ?? 0,
      })
    }
    return entries
  }, [ctx.result.daily, ctx.year, ctx.month])

  if (isLoading) {
    return <LoadingText>天気データを取得中...</LoadingText>
  }

  if (error) {
    return <ErrorText>天気データ取得エラー: {error}</ErrorText>
  }

  if (daily.length === 0) {
    return (
      <NoLocationText>
        店舗の位置情報が未設定です。設定画面から緯度・経度を登録してください。
      </NoLocationText>
    )
  }

  return (
    <Wrapper>
      <DailySummaryGrid>
        {daily.map((d) => {
          const dayNum = Number(d.dateKey.split('-')[2])
          return (
            <DayCell key={d.dateKey}>
              <DayLabel>{dayNum}日</DayLabel>
              <WeatherBadge
                weatherCode={d.dominantWeatherCode}
                temperature={d.temperatureAvg}
                compact
              />
            </DayCell>
          )
        })}
      </DailySummaryGrid>

      <WeatherCorrelationChart weatherDaily={daily} salesDaily={salesDaily} />
    </Wrapper>
  )
})
