/**
 * 天気ウィジェット — 日別天気サマリ + 週間予報 + 売上相関チャート
 *
 * 気象庁 ETRN から実測天気データを、Forecast API から
 * 週間予報を取得し、カレンダーグリッドに実績と予報を並べて表示する。
 * 日付クリックでモーダルを開き、時間別天気データを折れ線グラフで表示する。
 *
 * UI/UX原則#1: 実績（緑系）と推定（オレンジ系）は別世界として視覚的に分離。
 * 禁止事項#11: presentation/ から外部APIを直接呼ばない → hook経由で取得。
 */
import { memo, useMemo, useState, useCallback } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherForecast } from '@/application/hooks/useWeatherForecast'
import { useWeatherHourlyOnDemand } from '@/application/hooks/useWeatherHourlyOnDemand'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import type { AlignmentPolicy, DailyForecast } from '@/domain/models'
import { WeatherBadge } from '@/presentation/components/common/WeatherBadge'
import { ForecastBadge } from '@/presentation/components/common/ForecastBadge'
import { WeatherCorrelationChart } from '@/presentation/components/charts/WeatherCorrelationChart'
import { HourlyWeatherModal } from './HourlyWeatherModal'
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

export const WeatherWidget = memo(function WeatherWidget({ ctx }: { ctx: WidgetContext }) {
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)

  const storeId = useMemo(() => {
    if (ctx.selectedStoreIds.size === 1) {
      return Array.from(ctx.selectedStoreIds)[0]
    }
    const candidates =
      ctx.selectedStoreIds.size > 0
        ? Array.from(ctx.selectedStoreIds)
        : Array.from(ctx.stores.keys())
    return candidates.find((id) => storeLocations[id]) ?? candidates[0] ?? ''
  }, [ctx.selectedStoreIds, ctx.stores, storeLocations])

  const { daily, isLoading, error } = useWeatherData(ctx.year, ctx.month, storeId)

  const {
    forecasts,
    isLoading: isForecastLoading,
    error: forecastError,
  } = useWeatherForecast(storeId)

  const weatherPolicy: AlignmentPolicy = ctx.comparisonFrame.policy

  // 時間別データ取得は Application hook 経由（禁止事項#11 遵守）
  const { hourlyCache, prevHourlyCache, fetchHourly, fetchPrevHourly, resolvePrevDate } =
    useWeatherHourlyOnDemand(storeId, weatherPolicy)

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [modalForecast, setModalForecast] = useState<DailyForecast | null>(null)

  /** 実測日クリック */
  const handleDayClick = useCallback(
    (dateKey: string) => {
      setModalDate(dateKey)
      setModalForecast(null)
      fetchHourly(dateKey, ctx.year, ctx.month)
      fetchPrevHourly(dateKey)
    },
    [ctx.year, ctx.month, fetchHourly, fetchPrevHourly],
  )

  /** 予報日クリック */
  const handleForecastClick = useCallback(
    (forecast: DailyForecast) => {
      setModalDate(forecast.dateKey)
      setModalForecast(forecast)
      fetchPrevHourly(forecast.dateKey)
    },
    [fetchPrevHourly],
  )

  const handleModalClose = useCallback(() => {
    setModalDate(null)
    setModalForecast(null)
  }, [])

  const observedDateKeys = useMemo(() => new Set(daily.map((d) => d.dateKey)), [daily])

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

  const modalHourly = modalDate ? hourlyCache[modalDate] : undefined
  const modalPrevHourly = modalDate ? prevHourlyCache[modalDate] : undefined
  const modalPrevDate = modalDate ? resolvePrevDate(modalDate) : null
  const modalCanShowModal =
    modalDate &&
    ((modalHourly?.status === 'done' && modalHourly.records.length > 0) ||
      (modalForecast &&
        (modalPrevHourly?.status === 'done' || modalPrevHourly?.status === 'loading')))

  return (
    <Wrapper>
      {/* 実測値グリッド */}
      {daily.length > 0 && (
        <div>
          <SectionLabel>実測（日付タップで時間別表示）</SectionLabel>
          <DailySummaryGrid>
            {daily.map((d) => {
              const dayNum = Number(d.dateKey.split('-')[2])
              return (
                <DayCell
                  key={d.dateKey}
                  $clickable
                  onClick={() => handleDayClick(d.dateKey)}
                  style={
                    modalDate === d.dateKey ? { outline: '1px solid currentColor' } : undefined
                  }
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
              )
            })}
          </DailySummaryGrid>
        </div>
      )}

      {/* 予報グリッド */}
      {futureForecasts.length > 0 && (
        <div>
          <SectionLabel>予報（日付タップで前年比較）</SectionLabel>
          <DailySummaryGrid>
            {futureForecasts.map((f) => {
              const dayNum = Number(f.dateKey.split('-')[2])
              return (
                <ForecastDayCell
                  key={f.dateKey}
                  $clickable
                  onClick={() => handleForecastClick(f)}
                  style={
                    modalDate === f.dateKey ? { outline: '1px solid currentColor' } : undefined
                  }
                >
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

      {/* 時間別天気モーダル（実測日 or 予報日） */}
      {modalDate && modalCanShowModal && (
        <HourlyWeatherModal
          dateKey={modalDate}
          records={modalHourly?.status === 'done' ? modalHourly.records : undefined}
          prevYearRecords={modalPrevHourly?.status === 'done' ? modalPrevHourly.records : undefined}
          prevYearDateKey={modalPrevDate?.dateKey}
          comparisonPolicy={weatherPolicy}
          forecast={modalForecast ?? undefined}
          onClose={handleModalClose}
        />
      )}
    </Wrapper>
  )
})
