/**
 * 天気ウィジェット — 日別天気サマリ + 週間予報 + 売上相関チャート
 *
 * 気象庁 ETRN から実測天気データを、Forecast API から
 * 週間予報を取得し、カレンダーグリッドに実績と予報を並べて表示する。
 * 日付クリックでモーダルを開き、時間別天気データを折れ線グラフで表示する。
 *
 * UI/UX原則#1: 実績（緑系）と推定（オレンジ系）は別世界として視覚的に分離。
 */
import { memo, useMemo, useState, useCallback } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherForecast } from '@/application/hooks/useWeatherForecast'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'
import type { HourlyWeatherRecord, AlignmentPolicy, DailyForecast } from '@/domain/models'
import { loadEtrnHourlyForStore } from '@/application/usecases/weather/WeatherLoadService'
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

/** 時間別データの取得状態 */
interface HourlyState {
  readonly status: 'idle' | 'loading' | 'done' | 'error'
  readonly records: readonly HourlyWeatherRecord[]
  readonly error?: string
}

/**
 * 当年 dateKey から前年の対応日を算出する
 *
 * sameDayOfWeek: ComparisonScope.resolveSameDowSource と同一アルゴリズム。
 *   anchor = 前年同日 → ±7日の候補から同じ曜日の最近傍を選択。
 *   独自の dowOffset 補正は使用しない（禁止事項 #2: 別ソースから再計算しない）。
 */
function resolvePrevYearDate(
  dateKey: string,
  policy: AlignmentPolicy,
): { year: number; month: number; day: number; dateKey: string } {
  const d = new Date(dateKey + 'T00:00:00')
  if (policy === 'sameDayOfWeek') {
    const anchor = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate())
    const targetDow = d.getDay()
    let best = anchor
    let bestDist = Infinity
    for (let diff = -7; diff <= 7; diff++) {
      const c = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diff)
      if (c.getDay() !== targetDow) continue
      const dist = Math.abs(c.getTime() - anchor.getTime())
      if (dist < bestDist || (dist === bestDist && c.getTime() >= anchor.getTime())) {
        bestDist = dist
        best = c
      }
    }
    return {
      year: best.getFullYear(),
      month: best.getMonth() + 1,
      day: best.getDate(),
      dateKey: best.toISOString().slice(0, 10),
    }
  }
  // sameDate: 単純に前年同月同日
  const year = d.getFullYear() - 1
  const month = d.getMonth() + 1
  const day = d.getDate()
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return { year, month, day, dateKey: `${year}-${mm}-${dd}` }
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

  // 時間別データの状態管理（モーダル表示）
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [modalForecast, setModalForecast] = useState<DailyForecast | null>(null)
  const [hourlyCache, setHourlyCache] = useState<Record<string, HourlyState>>({})
  // 前年時間別データのキャッシュ（キーは当年の dateKey）
  const [prevHourlyCache, setPrevHourlyCache] = useState<Record<string, HourlyState>>({})

  // ヘッダの比較モード（同日 / 同曜日）に従う
  const weatherPolicy: AlignmentPolicy = ctx.comparisonFrame.policy
  // dowOffset は resolvePrevYearDate 内で使用しない（コアの同曜日アルゴリズムに従う）

  /** 前年データ取得（実測日・予報日共通） */
  const fetchPrevYear = useCallback(
    (dateKey: string) => {
      if (
        prevHourlyCache[dateKey]?.status === 'done' ||
        prevHourlyCache[dateKey]?.status === 'loading'
      )
        return
      if (!location) return
      const prev = resolvePrevYearDate(dateKey, weatherPolicy)
      setPrevHourlyCache((c) => ({
        ...c,
        [dateKey]: { status: 'loading', records: [] },
      }))
      loadEtrnHourlyForStore(storeId, location, prev.year, prev.month, [prev.day])
        .then((result) => {
          setPrevHourlyCache((c) => ({
            ...c,
            [dateKey]: { status: 'done', records: result.hourly },
          }))
        })
        .catch((err) => {
          setPrevHourlyCache((c) => ({
            ...c,
            [dateKey]: {
              status: 'error',
              records: [],
              error: err instanceof Error ? err.message : String(err),
            },
          }))
        })
    },
    [prevHourlyCache, location, storeId, weatherPolicy],
  )

  /** 実測日クリック */
  const handleDayClick = useCallback(
    (dateKey: string) => {
      setModalDate(dateKey)
      setModalForecast(null)

      if (!location) return

      // 当年データの取得
      if (hourlyCache[dateKey]?.status !== 'done' && hourlyCache[dateKey]?.status !== 'loading') {
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
      }

      fetchPrevYear(dateKey)
    },
    [hourlyCache, location, storeId, ctx.year, ctx.month, fetchPrevYear],
  )

  /** 予報日クリック */
  const handleForecastClick = useCallback(
    (forecast: DailyForecast) => {
      setModalDate(forecast.dateKey)
      setModalForecast(forecast)
      fetchPrevYear(forecast.dateKey)
    },
    [fetchPrevYear],
  )

  const handleModalClose = useCallback(() => {
    setModalDate(null)
    setModalForecast(null)
  }, [])

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

  const modalHourly = modalDate ? hourlyCache[modalDate] : undefined
  const modalPrevHourly = modalDate ? prevHourlyCache[modalDate] : undefined
  const modalPrevDate = modalDate ? resolvePrevYearDate(modalDate, weatherPolicy) : null
  // 実測日: 当年データがある場合。予報日: 前年データがあるか予報がある場合
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
