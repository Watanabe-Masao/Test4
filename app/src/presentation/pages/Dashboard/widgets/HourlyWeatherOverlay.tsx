/**
 * 時間帯別天気オーバーレイ
 *
 * HourlyChart の上に気温ライン・天気アイコン・降水量を重ねて表示する。
 * 売上バーチャートとの対比で天気と売上の関係を視覚化する。
 */
import { memo, useMemo } from 'react'
import type { HourlyWeatherRecord, WeatherCategory } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import { HourlyAxis, HourlyTick } from './DayDetailModal.styles'

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

interface OverlayProps {
  /** 売上バーの時間帯データ（時間順） */
  readonly hours: readonly { readonly hour: number }[]
  /** 時間別天気レコード */
  readonly weatherHourly: readonly HourlyWeatherRecord[]
  /** SVG の幅 */
  readonly chartW: number
  /** SVG の高さ */
  readonly chartH: number
  /** インデックス → ピクセルX座標 */
  readonly pxX: (i: number) => number
}

/** 気温ラインを SVG 上に描画する */
export const WeatherTempLine = memo(function WeatherTempLine({
  hours,
  weatherHourly,
  chartW,
  chartH,
  pxX,
}: OverlayProps) {
  const weatherMap = useMemo(() => {
    const m = new Map<number, HourlyWeatherRecord>()
    for (const w of weatherHourly) m.set(w.hour, w)
    return m
  }, [weatherHourly])

  const tempRange = useMemo(() => {
    const temps = hours
      .map((d) => weatherMap.get(d.hour)?.temperature)
      .filter((t): t is number => t != null)
    if (temps.length < 2) return null
    const tMin = Math.min(...temps)
    const tMax = Math.max(...temps)
    return { tMin, range: tMax - tMin || 1 }
  }, [weatherMap, hours])

  if (!tempRange || chartW <= 0 || chartH <= 0) return null

  const { tMin, range } = tempRange
  const pxY = (pct: number) => chartH * (1 - pct / 100)

  const points = hours
    .map((d, i) => {
      const t = weatherMap.get(d.hour)?.temperature
      if (t == null) return null
      const yPct = 10 + ((t - tMin) / range) * 80
      return `${pxX(i)},${pxY(yPct)}`
    })
    .filter(Boolean)

  if (points.length < 2) return null

  return (
    <>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#f97316"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="4,2"
        opacity="0.8"
      />
      {hours.map((d, i) => {
        const t = weatherMap.get(d.hour)?.temperature
        if (t == null) return null
        const yPct = 10 + ((t - tMin) / range) * 80
        return (
          <g key={`temp-${d.hour}`}>
            <circle cx={pxX(i)} cy={pxY(yPct)} r="2.5" fill="#f97316" />
            <text
              x={pxX(i)}
              y={pxY(yPct) - 6}
              textAnchor="middle"
              fontSize="7"
              fill="#f97316"
              fontWeight="600"
            >
              {Math.round(t)}°
            </text>
          </g>
        )
      })}
    </>
  )
})

/** 天気アイコン行（時間軸の下に表示） */
export const WeatherIconRow = memo(function WeatherIconRow({
  hours,
  weatherHourly,
}: {
  readonly hours: readonly { readonly hour: number }[]
  readonly weatherHourly: readonly HourlyWeatherRecord[]
}) {
  const weatherMap = useMemo(() => {
    const m = new Map<number, HourlyWeatherRecord>()
    for (const w of weatherHourly) m.set(w.hour, w)
    return m
  }, [weatherHourly])

  return (
    <HourlyAxis>
      {hours.map((d) => {
        const w = weatherMap.get(d.hour)
        if (!w) return <HourlyTick key={`w-${d.hour}`} />
        const cat = categorizeWeatherCode(w.weatherCode)
        return (
          <HourlyTick key={`w-${d.hour}`} style={{ fontSize: '0.55rem', lineHeight: 1 }}>
            <span
              title={`${Math.round(w.temperature)}°C${w.precipitation > 0 ? ' ' + w.precipitation.toFixed(1) + 'mm' : ''}`}
            >
              {WEATHER_ICONS[cat]}
            </span>
            {w.precipitation > 0 && (
              <span style={{ fontSize: '0.4rem', color: '#3b82f6', display: 'block' }}>
                {w.precipitation.toFixed(1)}
              </span>
            )}
          </HourlyTick>
        )
      })}
    </HourlyAxis>
  )
})

/** ツールチップ内の天気情報行 */
export function WeatherTooltipInfo({ weather }: { readonly weather: HourlyWeatherRecord }) {
  const cat = categorizeWeatherCode(weather.weatherCode)
  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.2)',
        marginTop: 2,
        paddingTop: 2,
      }}
    >
      {WEATHER_ICONS[cat]} {Math.round(weather.temperature)}°C
      {weather.precipitation > 0 && (
        <span style={{ color: '#93c5fd' }}> {weather.precipitation.toFixed(1)}mm</span>
      )}
      {weather.humidity > 0 && (
        <span style={{ opacity: 0.7 }}> 湿度{Math.round(weather.humidity)}%</span>
      )}
    </div>
  )
}
