/**
 * 時間別天気モーダル — 折れ線グラフで気温・降水量を表示（前年比較対応）
 *
 * 実測日: 当年の時間別データ + 前年の破線重ね合わせ
 * 予報日: 前年の時間別データをメイングラフ + 当日の予報サマリをカード表示
 *
 * @responsibility R:widget, R:chart-option, R:state-machine
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { Modal } from '@/presentation/components/common/Modal'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import { mapJmaWeatherCodeToCategory } from '@/domain/weather/forecastWeatherMapping'
import type { AlignmentMode } from '@/domain/models/calendar'
import type { HourlyWeatherRecord, WeatherCategory, DailyForecast } from '@/domain/models/record'
import {
  ChartContainer,
  SummaryGrid,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  WeatherIconSection,
  WeatherIconRowWrapper,
  WeatherIconRowLabel,
  WeatherIconRow,
  WeatherIconCell,
  WeatherIconEmoji,
} from './HourlyWeatherModal.styles'

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

interface Props {
  readonly dateKey: string
  /** 当年の時間別実測データ（予報日の場合は undefined） */
  readonly records?: readonly HourlyWeatherRecord[]
  readonly prevYearRecords?: readonly HourlyWeatherRecord[]
  readonly prevYearDateKey?: string
  readonly comparisonPolicy?: AlignmentMode
  /** 予報日の場合の予報データ */
  readonly forecast?: DailyForecast
  readonly onClose: () => void
}

type HourlyRightMetric = 'precipitation' | 'sunshine' | 'humidity'

interface ChartPoint {
  readonly hour: string
  readonly temperature?: number
  readonly precipitation?: number
  readonly sunshine?: number
  readonly humidity?: number
  readonly prevTemperature?: number
  readonly prevPrecipitation?: number
  readonly prevSunshine?: number
  readonly prevHumidity?: number
}

const HOURLY_METRIC_OPTIONS: readonly { key: HourlyRightMetric; label: string }[] = [
  { key: 'precipitation', label: '降水量' },
  { key: 'sunshine', label: '日照' },
  { key: 'humidity', label: '湿度' },
]

function buildSummary(records: readonly HourlyWeatherRecord[]) {
  if (records.length === 0) return null
  const temps = records.map((r) => r.temperature)
  const totalPrecip = records.reduce((s, r) => s + r.precipitation, 0)
  const avgHumidity = records.reduce((s, r) => s + r.humidity, 0) / records.length
  return {
    maxTemp: Math.max(...temps),
    minTemp: Math.min(...temps),
    totalPrecip,
    avgHumidity,
  }
}

export const HourlyWeatherModal = memo(function HourlyWeatherModal({
  dateKey,
  records,
  prevYearRecords,
  prevYearDateKey,
  comparisonPolicy,
  forecast,
  onClose,
}: Props) {
  const theme = useTheme() as AppTheme
  const [rightMetric, setRightMetric] = useState<HourlyRightMetric>('precipitation')
  const isForecastMode = !!forecast && (!records || records.length === 0)
  const hasPrev = prevYearRecords && prevYearRecords.length > 0
  const hasRecords = records && records.length > 0

  // 前年データを hour でインデックス化
  const prevByHour = useMemo(() => {
    if (!prevYearRecords) return new Map<number, HourlyWeatherRecord>()
    return new Map(prevYearRecords.map((r) => [r.hour, r]))
  }, [prevYearRecords])

  const chartData = useMemo<readonly ChartPoint[]>(() => {
    if (hasRecords) {
      // 実測日: 当年データをベースに前年を重ねる
      return records.map((r) => {
        const prev = prevByHour.get(r.hour)
        return {
          hour: `${String(r.hour).padStart(2, '0')}時`,
          temperature: r.temperature,
          precipitation: r.precipitation,
          sunshine: r.sunshineDuration / 60, // 秒→分
          humidity: r.humidity,
          prevTemperature: prev?.temperature,
          prevPrecipitation: prev?.precipitation,
          prevSunshine: prev ? prev.sunshineDuration / 60 : undefined,
          prevHumidity: prev?.humidity,
        }
      })
    }
    if (hasPrev) {
      // 予報日: 前年データをメインに表示
      return prevYearRecords.map((r) => ({
        hour: `${String(r.hour).padStart(2, '0')}時`,
        prevTemperature: r.temperature,
        prevPrecipitation: r.precipitation,
        prevSunshine: r.sunshineDuration / 60,
        prevHumidity: r.humidity,
      }))
    }
    return []
  }, [records, hasRecords, prevYearRecords, hasPrev, prevByHour])

  const summary = useMemo(() => (hasRecords ? buildSummary(records) : null), [records, hasRecords])
  const prevSummary = useMemo(
    () => (prevYearRecords ? buildSummary(prevYearRecords) : null),
    [prevYearRecords],
  )

  const dayLabel = dateKey.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日')
  const prevDayLabel = prevYearDateKey
    ? prevYearDateKey.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日')
    : null
  const policyLabel = comparisonPolicy === 'sameDayOfWeek' ? '同曜日' : '同日'

  const option = useMemo((): EChartsOption => {
    const hours = chartData.map((d) => d.hour)

    // 右軸メトリック設定
    const rightLabel =
      rightMetric === 'sunshine'
        ? '日照(分)'
        : rightMetric === 'humidity'
          ? '湿度(%)'
          : '降水量(mm)'
    const rightUnit = rightMetric === 'sunshine' ? '分' : rightMetric === 'humidity' ? '%' : 'mm'
    const getRightValue = (d: ChartPoint) =>
      rightMetric === 'sunshine'
        ? d.sunshine
        : rightMetric === 'humidity'
          ? d.humidity
          : d.precipitation
    const getPrevRightValue = (d: ChartPoint) =>
      rightMetric === 'sunshine'
        ? d.prevSunshine
        : rightMetric === 'humidity'
          ? d.prevHumidity
          : d.prevPrecipitation

    type SeriesItem = Record<string, unknown>
    const seriesList: SeriesItem[] = []

    // 当年右軸データ（実測日のみ）
    if (hasRecords) {
      seriesList.push({
        name: rightLabel,
        type: 'bar',
        yAxisIndex: 1,
        data: chartData.map((d) => getRightValue(d) ?? null),
        itemStyle: { color: '#3b82f6', opacity: 0.3 },
      })
    }

    // 当年気温（実測日のみ）
    if (hasRecords) {
      seriesList.push({
        name: '気温',
        type: 'line',
        yAxisIndex: 0,
        data: chartData.map((d) => d.temperature ?? null),
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        symbolSize: 6,
        smooth: true,
      })
    }

    // 前年気温
    if (hasPrev || isForecastMode) {
      seriesList.push({
        name: isForecastMode ? '前年実績気温' : '前年気温',
        type: 'line',
        yAxisIndex: 0,
        data: chartData.map((d) => d.prevTemperature ?? null),
        lineStyle: {
          color: '#ef4444',
          width: isForecastMode ? 2 : 1.5,
          type: isForecastMode ? ('solid' as const) : ('dashed' as const),
          opacity: isForecastMode ? 1 : 0.5,
        },
        itemStyle: {
          color: '#ef4444',
          opacity: isForecastMode ? 1 : 0.4,
        },
        symbolSize: isForecastMode ? 6 : 4,
        smooth: true,
      })
    }

    // 前年右軸データ
    if (hasPrev || isForecastMode) {
      const prevRightLabel = isForecastMode ? `前年実績${rightLabel}` : `前年${rightLabel}`
      seriesList.push({
        name: prevRightLabel,
        type: 'bar',
        yAxisIndex: 1,
        data: chartData.map((d) => getPrevRightValue(d) ?? null),
        itemStyle: { color: '#3b82f6', opacity: isForecastMode ? 0.3 : 0.15 },
      })
    }

    return {
      grid: { ...standardGrid(), left: 0, right: 8 },
      tooltip: {
        ...standardTooltip(theme),
        trigger: 'axis' as const,
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params]
          let html = ''
          const items = arr as { seriesName: string; value: number | null; marker: string }[]
          if (items.length > 0) {
            const first = items[0] as { axisValue?: string }
            html += `${first.axisValue ?? ''}<br/>`
          }
          for (const p of items) {
            if (p.value == null) continue
            const isTemp = p.seriesName.includes('気温')
            const unitStr = isTemp ? '\u00B0C' : rightUnit
            html += `${p.marker} ${p.seriesName}: ${(p.value as number).toFixed(1)}${unitStr}<br/>`
          }
          return html
        },
      },
      legend: {
        textStyle: { color: theme.colors.text3, fontSize: 9 },
        bottom: 0,
      },
      xAxis: {
        type: 'category' as const,
        data: hours,
        axisLabel: { color: theme.colors.text3, fontSize: 10, interval: 2 },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: [
        {
          type: 'value' as const,
          name: '\u00B0C',
          axisLabel: {
            color: theme.colors.text3,
            fontSize: 10,
            formatter: (v: number) => `${v}\u00B0`,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: {
            lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
          },
        },
        {
          type: 'value' as const,
          name: rightUnit,
          axisLabel: {
            color: theme.colors.text3,
            fontSize: 10,
            formatter: (v: number) => `${v}${rightUnit}`,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      series: seriesList,
    }
  }, [chartData, hasRecords, hasPrev, isForecastMode, theme, rightMetric])

  const modalTitle = prevDayLabel
    ? `${dayLabel}${isForecastMode ? ' の予報' : ' の時間別天気'} vs ${prevDayLabel}（${policyLabel}）`
    : `${dayLabel}${isForecastMode ? ' の予報' : ' の時間別天気'}`

  return (
    <Modal title={modalTitle} onClose={onClose} size="lg">
      {/* 予報日: 予報サマリカード */}
      {forecast && <ForecastSummary forecast={forecast} />}

      {chartData.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 4 }}>
            {HOURLY_METRIC_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRightMetric(key)}
                style={{
                  padding: '2px 10px',
                  fontSize: '0.7rem',
                  borderRadius: 4,
                  border: `1px solid ${rightMetric === key ? 'transparent' : '#d1d5db'}`,
                  background: rightMetric === key ? '#3b82f6' : '#f9fafb',
                  color: rightMetric === key ? '#fff' : '#374151',
                  fontWeight: rightMetric === key ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <ChartContainer>
            <EChart option={option} height={250} ariaLabel="時間別天気チャート" />
          </ChartContainer>

          {/* 時間帯別の天気アイコン行（当年 + 前年） */}
          <WeatherIconSection>
            {hasRecords && (
              <WeatherIconRowWrapper>
                <WeatherIconRowLabel>{dateKey.slice(0, 4)}</WeatherIconRowLabel>
                <WeatherIconRow>
                  {records.map((r) => {
                    const cat = categorizeWeatherCode(r.weatherCode)
                    return (
                      <WeatherIconCell key={r.hour}>
                        <WeatherIconEmoji>{WEATHER_ICONS[cat]}</WeatherIconEmoji>
                        <span>{String(r.hour).padStart(2, '0')}</span>
                      </WeatherIconCell>
                    )
                  })}
                </WeatherIconRow>
              </WeatherIconRowWrapper>
            )}
            {hasPrev && (
              <WeatherIconRowWrapper>
                <WeatherIconRowLabel>{prevYearDateKey?.slice(0, 4) ?? '前年'}</WeatherIconRowLabel>
                <WeatherIconRow>
                  {prevYearRecords.map((r) => {
                    const cat = categorizeWeatherCode(r.weatherCode)
                    return (
                      <WeatherIconCell key={`prev-${r.hour}`}>
                        <WeatherIconEmoji>{WEATHER_ICONS[cat]}</WeatherIconEmoji>
                        <span>{String(r.hour).padStart(2, '0')}</span>
                      </WeatherIconCell>
                    )
                  })}
                </WeatherIconRow>
              </WeatherIconRowWrapper>
            )}
          </WeatherIconSection>
        </>
      )}

      <SummaryGrid>
        {/* 実測日のサマリ */}
        {summary && (
          <>
            <SummaryItem>
              <SummaryLabel>最高気温</SummaryLabel>
              <SummaryValue style={{ color: '#ef4444' }}>
                {summary.maxTemp.toFixed(1)}°C
                {prevSummary && (
                  <DiffText value={summary.maxTemp - prevSummary.maxTemp} unit="°C" />
                )}
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>最低気温</SummaryLabel>
              <SummaryValue style={{ color: '#3498db' }}>
                {summary.minTemp.toFixed(1)}°C
                {prevSummary && (
                  <DiffText value={summary.minTemp - prevSummary.minTemp} unit="°C" />
                )}
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>降水量合計</SummaryLabel>
              <SummaryValue style={{ color: '#3b82f6' }}>
                {summary.totalPrecip.toFixed(1)}mm
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>平均湿度</SummaryLabel>
              <SummaryValue style={{ color: '#8b5cf6' }}>
                {summary.avgHumidity.toFixed(0)}%
              </SummaryValue>
            </SummaryItem>
          </>
        )}
        {/* 予報日で当年実測なし: 前年サマリのみ */}
        {isForecastMode && prevSummary && (
          <>
            <SummaryItem>
              <SummaryLabel>前年最高気温</SummaryLabel>
              <SummaryValue style={{ color: '#ef4444' }}>
                {prevSummary.maxTemp.toFixed(1)}°C
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>前年最低気温</SummaryLabel>
              <SummaryValue style={{ color: '#3498db' }}>
                {prevSummary.minTemp.toFixed(1)}°C
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>前年降水量</SummaryLabel>
              <SummaryValue style={{ color: '#3b82f6' }}>
                {prevSummary.totalPrecip.toFixed(1)}mm
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>前年平均湿度</SummaryLabel>
              <SummaryValue style={{ color: '#8b5cf6' }}>
                {prevSummary.avgHumidity.toFixed(0)}%
              </SummaryValue>
            </SummaryItem>
          </>
        )}
      </SummaryGrid>
    </Modal>
  )
})

/** 予報サマリカード（モーダル上部に表示） */
function ForecastSummary({ forecast }: { readonly forecast: DailyForecast }) {
  const cat = mapJmaWeatherCodeToCategory(forecast.weatherCode)
  const icon = WEATHER_ICONS[cat]
  return (
    <SummaryGrid style={{ marginBottom: 12 }}>
      <SummaryItem style={{ borderLeft: '3px solid rgba(249, 115, 22, 0.6)' }}>
        <SummaryLabel>予報天気</SummaryLabel>
        <SummaryValue>{icon}</SummaryValue>
      </SummaryItem>
      {forecast.tempMax != null && (
        <SummaryItem style={{ borderLeft: '3px solid rgba(249, 115, 22, 0.6)' }}>
          <SummaryLabel>予報最高</SummaryLabel>
          <SummaryValue style={{ color: '#ef4444' }}>{forecast.tempMax}°C</SummaryValue>
        </SummaryItem>
      )}
      {forecast.tempMin != null && (
        <SummaryItem style={{ borderLeft: '3px solid rgba(249, 115, 22, 0.6)' }}>
          <SummaryLabel>予報最低</SummaryLabel>
          <SummaryValue style={{ color: '#3498db' }}>{forecast.tempMin}°C</SummaryValue>
        </SummaryItem>
      )}
      {forecast.pop != null && (
        <SummaryItem style={{ borderLeft: '3px solid rgba(249, 115, 22, 0.6)' }}>
          <SummaryLabel>降水確率</SummaryLabel>
          <SummaryValue style={{ color: '#3b82f6' }}>{forecast.pop}%</SummaryValue>
        </SummaryItem>
      )}
    </SummaryGrid>
  )
}

/** 前年との差分をコンパクトに表示 */
function DiffText({
  value,
  unit,
  decimals = 1,
}: {
  readonly value: number
  readonly unit: string
  readonly decimals?: number
}) {
  const sign = value >= 0 ? '+' : ''
  const color = value > 0 ? '#ef4444' : value < 0 ? '#3498db' : undefined
  return (
    <span style={{ fontSize: '0.6rem', marginLeft: 4, color, opacity: 0.8 }}>
      {`(${sign}${value.toFixed(decimals)}${unit})`}
    </span>
  )
}
