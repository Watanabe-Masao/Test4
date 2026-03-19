/**
 * 時間別天気モーダル — 折れ線グラフで気温・降水量を表示（前年比較対応）
 *
 * 実測日: 当年の時間別データ + 前年の破線重ね合わせ
 * 予報日: 前年の時間別データをメイングラフ + 当日の予報サマリをカード表示
 */
import { memo, useMemo } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'
import { createChartTooltip } from '@/presentation/components/charts/createChartTooltip'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import { mapJmaWeatherCodeToCategory } from '@/domain/calculations/forecastWeatherMapping'
import type {
  HourlyWeatherRecord,
  WeatherCategory,
  AlignmentPolicy,
  DailyForecast,
} from '@/domain/models'
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseBtn,
  ChartContainer,
  SummaryGrid,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
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
  readonly comparisonPolicy?: AlignmentPolicy
  /** 予報日の場合の予報データ */
  readonly forecast?: DailyForecast
  readonly onClose: () => void
}

interface ChartPoint {
  readonly hour: string
  readonly temperature?: number
  readonly precipitation?: number
  readonly prevTemperature?: number
  readonly prevPrecipitation?: number
}

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
  const chartTheme = useChartTheme()
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
          prevTemperature: prev?.temperature,
          prevPrecipitation: prev?.precipitation,
        }
      })
    }
    if (hasPrev) {
      // 予報日: 前年データをメインに表示
      return prevYearRecords.map((r) => ({
        hour: `${String(r.hour).padStart(2, '0')}時`,
        prevTemperature: r.temperature,
        prevPrecipitation: r.precipitation,
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

  const tooltipContent = useMemo(
    () =>
      createChartTooltip({
        ct: chartTheme,
        formatter: (value, name) => {
          const v = value as number
          if (name === '気温' || name === '前年気温') return [`${v.toFixed(1)}°C`, name]
          if (name === '降水量' || name === '前年降水量') return [`${v.toFixed(1)}mm`, name]
          return [String(v), name]
        },
      }),
    [chartTheme],
  )

  // 天気アイコン行のデータソース（実測日: 当年、予報日: 前年）
  const iconRecords = hasRecords ? records : hasPrev ? prevYearRecords : []

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            {dayLabel}
            {isForecastMode ? ' の予報' : ' の時間別天気'}
            {prevDayLabel && (
              <span style={{ fontSize: '0.7rem', color: chartTheme.textMuted, marginLeft: 8 }}>
                vs {prevDayLabel}（{policyLabel}）
              </span>
            )}
          </ModalTitle>
          <ModalCloseBtn onClick={onClose}>&times;</ModalCloseBtn>
        </ModalHeader>

        {/* 予報日: 予報サマリカード */}
        {forecast && <ForecastSummary forecast={forecast} />}

        {chartData.length > 0 && (
          <>
            <ChartContainer>
              <ResponsiveContainer>
                <ComposedChart data={chartData as ChartPoint[]} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: chartTheme.textMuted }}
                    interval={2}
                  />
                  <YAxis
                    yAxisId="temp"
                    tick={{ fontSize: 10, fill: chartTheme.textMuted }}
                    tickFormatter={(v: number) => `${v}°`}
                    width={40}
                  />
                  <YAxis
                    yAxisId="precip"
                    orientation="right"
                    tick={{ fontSize: 10, fill: chartTheme.textMuted }}
                    tickFormatter={(v: number) => `${v}mm`}
                    width={45}
                  />
                  <Tooltip content={tooltipContent} />
                  <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
                  {/* 当年データ（実測日のみ） */}
                  {hasRecords && (
                    <Bar
                      yAxisId="precip"
                      dataKey="precipitation"
                      fill="#3b82f6"
                      opacity={0.3}
                      name="降水量"
                    />
                  )}
                  {hasRecords && (
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="temperature"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#ef4444' }}
                      name="気温"
                    />
                  )}
                  {/* 前年データ */}
                  {(hasPrev || isForecastMode) && (
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="prevTemperature"
                      stroke={isForecastMode ? '#ef4444' : '#ef4444'}
                      strokeWidth={isForecastMode ? 2 : 1.5}
                      strokeDasharray={isForecastMode ? undefined : '6 3'}
                      strokeOpacity={isForecastMode ? 1 : 0.5}
                      dot={
                        isForecastMode
                          ? { r: 3, fill: '#ef4444' }
                          : { r: 2, fill: '#ef4444', fillOpacity: 0.4 }
                      }
                      name={isForecastMode ? '前年実績気温' : '前年気温'}
                    />
                  )}
                  {(hasPrev || isForecastMode) && (
                    <Bar
                      yAxisId="precip"
                      dataKey="prevPrecipitation"
                      fill="#3b82f6"
                      opacity={isForecastMode ? 0.3 : 0.15}
                      name={isForecastMode ? '前年実績降水量' : '前年降水量'}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* 時間帯別の天気アイコン行 */}
            {iconRecords.length > 0 && (
              <WeatherIconRow>
                {iconRecords.map((r) => {
                  const cat = categorizeWeatherCode(r.weatherCode)
                  return (
                    <WeatherIconCell key={r.hour}>
                      <WeatherIconEmoji>{WEATHER_ICONS[cat]}</WeatherIconEmoji>
                      <span>{String(r.hour).padStart(2, '0')}</span>
                    </WeatherIconCell>
                  )
                })}
              </WeatherIconRow>
            )}
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
      </ModalContent>
    </ModalOverlay>
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
      ({sign}
      {value.toFixed(decimals)}
      {unit})
    </span>
  )
}
