/**
 * 天気ウィジェット — 日別天気サマリ + 売上相関チャート
 *
 * 気象庁 AMEDAS API から天気データを取得し、WeatherBadge と
 * WeatherCorrelationChart を組み合わせてダッシュボードに表示する。
 */
import { memo, useMemo } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useSettingsStore } from '@/application/stores/settingsStore'
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
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)

  // ctx.result.storeId は集計時 'aggregate' になるため、
  // selectedStoreIds / stores から位置情報が登録済みの実店舗IDを解決する
  const storeId = useMemo(() => {
    // 単一店舗選択時
    if (ctx.selectedStoreIds.size === 1) {
      return Array.from(ctx.selectedStoreIds)[0]
    }
    // 全店 or 複数店舗: 位置情報が登録済みの最初の店舗を使う
    const candidates =
      ctx.selectedStoreIds.size > 0
        ? Array.from(ctx.selectedStoreIds)
        : Array.from(ctx.stores.keys())
    return candidates.find((id) => storeLocations[id]) ?? candidates[0] ?? ''
  }, [ctx.selectedStoreIds, ctx.stores, storeLocations])

  const { daily, isLoading, error } = useWeatherData(
    ctx.year,
    ctx.month,
    storeId,
    ctx.duckConn,
    ctx.duckDb,
  )

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
        店舗の位置情報が未設定です。管理画面の「店舗管理」タブから位置情報を登録してください。
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
