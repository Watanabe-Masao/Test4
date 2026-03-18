/**
 * 天気ウィジェット — 日別天気サマリ + 週間予報 + 売上相関チャート
 *
 * 気象庁 ETRN から実測天気データを、Forecast API から
 * 週間予報を取得し、カレンダーグリッドに実績と予報を並べて表示する。
 * 日付クリックで時間別天気データを展開表示する。
 *
 * UI/UX原則#1: 実績（緑系）と推定（オレンジ系）は別世界として視覚的に分離。
 */
import { Fragment, memo, useMemo, useState, useCallback } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherForecast } from '@/application/hooks/useWeatherForecast'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import type { HourlyWeatherRecord } from '@/domain/models'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import { loadEtrnHourlyForStore } from '@/application/usecases/weather/WeatherLoadService'
import { WeatherBadge } from '@/presentation/components/common/WeatherBadge'
import { ForecastBadge } from '@/presentation/components/common/ForecastBadge'
import { WeatherCorrelationChart } from '@/presentation/components/charts/WeatherCorrelationChart'
import type { WidgetContext } from './types'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const SectionLabel = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const DailySummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: ${({ theme }) => theme.spacing[1]};
`

const DayCell = styled.div<{ $clickable?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    &:hover {
      opacity: 0.8;
      outline: 1px solid currentColor;
    }
  `}
`

const ForecastDayCell = styled(DayCell)`
  background: rgba(249, 115, 22, 0.06);
  border: 1px dashed rgba(249, 115, 22, 0.3);
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

const HourlyPanel = styled.div`
  grid-column: 1 / -1;
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => theme.spacing[2]};
`

const HourlyTitle = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 4px;
`

const HourlyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 2px;
`

const HourlyItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1px 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.bg};
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const WEATHER_ICONS: Record<string, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

/** 時間別データの取得状態 */
interface HourlyState {
  readonly status: 'idle' | 'loading' | 'done' | 'error'
  readonly records: readonly HourlyWeatherRecord[]
  readonly error?: string
}

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

  const location = storeLocations[storeId]
  const { daily, isLoading, error } = useWeatherData(ctx.year, ctx.month, storeId)

  const {
    forecasts,
    isLoading: isForecastLoading,
    error: forecastError,
  } = useWeatherForecast(storeId)

  // 時間別データの状態管理
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [hourlyCache, setHourlyCache] = useState<Record<string, HourlyState>>({})

  const handleDayClick = useCallback(
    (dateKey: string) => {
      if (expandedDate === dateKey) {
        setExpandedDate(null)
        return
      }
      setExpandedDate(dateKey)

      if (hourlyCache[dateKey]?.status === 'done' || hourlyCache[dateKey]?.status === 'loading') {
        return
      }

      if (!location) return

      const day = parseInt(dateKey.slice(8), 10)

      setHourlyCache((prev) => ({
        ...prev,
        [dateKey]: { status: 'loading', records: [] },
      }))

      loadEtrnHourlyForStore(storeId, location, ctx.year, ctx.month, [day])
        .then((result) => {
          setHourlyCache((prev) => ({
            ...prev,
            [dateKey]: { status: 'done', records: result.hourly },
          }))
        })
        .catch((err) => {
          setHourlyCache((prev) => ({
            ...prev,
            [dateKey]: {
              status: 'error',
              records: [],
              error: err instanceof Error ? err.message : String(err),
            },
          }))
        })
    },
    [expandedDate, hourlyCache, location, storeId, ctx.year, ctx.month],
  )

  // 実測日の dateKey セット（予報と重複しないようフィルタ用）
  const observedDateKeys = useMemo(() => new Set(daily.map((d) => d.dateKey)), [daily])

  // 予報データから実測済み日を除外
  const futureForecasts = useMemo(
    () => forecasts.filter((f) => !observedDateKeys.has(f.dateKey)),
    [forecasts, observedDateKeys],
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

  if ((isLoading || isForecastLoading) && !daily.length && !forecasts.length) {
    return <LoadingText>天気データを取得中...</LoadingText>
  }

  if ((error || forecastError) && !daily.length && !forecasts.length) {
    return <ErrorText>天気データ取得エラー: {error ?? forecastError}</ErrorText>
  }

  if (daily.length === 0 && forecasts.length === 0) {
    const hasLocation = !!storeLocations[storeId]
    return (
      <NoLocationText>
        {hasLocation
          ? '天気データを取得できませんでした。しばらく時間をおいて再度お試しください。'
          : '店舗の位置情報が未設定です。管理画面の「店舗管理」タブから位置情報を登録してください。'}
      </NoLocationText>
    )
  }

  return (
    <Wrapper>
      {/* 実測値グリッド */}
      {daily.length > 0 && (
        <div>
          <SectionLabel>実測（日付タップで時間別表示）</SectionLabel>
          <DailySummaryGrid>
            {daily.map((d) => {
              const dayNum = Number(d.dateKey.split('-')[2])
              const isExpanded = expandedDate === d.dateKey
              const hourly = hourlyCache[d.dateKey]
              return (
                <Fragment key={d.dateKey}>
                  <DayCell
                    $clickable
                    onClick={() => handleDayClick(d.dateKey)}
                    style={isExpanded ? { outline: '1px solid currentColor' } : undefined}
                  >
                    <DayLabel>{dayNum}日</DayLabel>
                    <WeatherBadge
                      weatherCode={d.dominantWeatherCode}
                      temperature={d.temperatureAvg}
                      temperatureMax={d.temperatureMax}
                      temperatureMin={d.temperatureMin}
                      compact
                    />
                  </DayCell>
                  {isExpanded && (
                    <HourlyPanel>
                      <HourlyTitle>
                        {dayNum}日の時間別天気
                        {hourly?.status === 'loading' && ' — 取得中...'}
                      </HourlyTitle>
                      {hourly?.status === 'error' && (
                        <ErrorText style={{ fontSize: '0.6rem', padding: '2px' }}>
                          エラー: {hourly.error}
                        </ErrorText>
                      )}
                      {hourly?.status === 'done' && hourly.records.length === 0 && (
                        <span style={{ fontSize: '0.6rem' }}>データなし</span>
                      )}
                      {hourly?.status === 'done' && hourly.records.length > 0 && (
                        <HourlyGrid>
                          {hourly.records.map((h) => {
                            const hCat = categorizeWeatherCode(h.weatherCode)
                            return (
                              <HourlyItem key={h.hour}>
                                <span>
                                  {String(h.hour).padStart(2, '0')}時 {WEATHER_ICONS[hCat] ?? '?'}
                                </span>
                                <span>{h.temperature.toFixed(1)}°</span>
                              </HourlyItem>
                            )
                          })}
                        </HourlyGrid>
                      )}
                    </HourlyPanel>
                  )}
                </Fragment>
              )
            })}
          </DailySummaryGrid>
        </div>
      )}

      {/* 予報グリッド */}
      {futureForecasts.length > 0 && (
        <div>
          <SectionLabel>予報</SectionLabel>
          <DailySummaryGrid>
            {futureForecasts.map((f) => {
              const dayNum = Number(f.dateKey.split('-')[2])
              return (
                <ForecastDayCell key={f.dateKey}>
                  <DayLabel>{dayNum}日</DayLabel>
                  <ForecastBadge forecast={f} compact />
                </ForecastDayCell>
              )
            })}
          </DailySummaryGrid>
          {forecastError && (
            <ErrorText style={{ fontSize: '0.65rem', padding: '4px' }}>
              予報取得エラー: {forecastError}
            </ErrorText>
          )}
        </div>
      )}

      <WeatherCorrelationChart weatherDaily={daily} salesDaily={salesDaily} />
    </Wrapper>
  )
})
