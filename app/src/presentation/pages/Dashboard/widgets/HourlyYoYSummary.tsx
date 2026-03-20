/**
 * 時間帯別前年比サマリ + 天気比較
 *
 * HourlyChart の下に表示。当年/前年の気温・降水量比較と、
 * 前年比が最も好調/不調な時間帯をハイライト表示する。
 */
import { memo, useMemo } from 'react'
import type { HourlyWeatherRecord } from '@/domain/models'
import { formatPercent } from '@/domain/formatting'
import { toComma } from '@/presentation/components/charts/chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { SumLabel, SumValue } from './DayDetailModal.styles'

export const HourlyYoYSummary = memo(function HourlyYoYSummary({
  actualData,
  prevData,
  weatherHourly,
  prevWeatherHourly,
  prevDateKey,
  curDateKey,
}: {
  actualData: readonly { hour: number; amount: number; quantity: number }[]
  prevData: readonly { hour: number; amount: number; quantity: number }[]
  weatherHourly?: readonly HourlyWeatherRecord[]
  prevWeatherHourly?: readonly HourlyWeatherRecord[]
  prevDateKey?: string
  curDateKey?: string
}) {
  const prevMap = useMemo(() => new Map(prevData.map((d) => [d.hour, d])), [prevData])

  const yoyRows = useMemo(() => {
    return actualData
      .map((cur) => {
        const prev = prevMap.get(cur.hour)
        if (!prev || prev.amount === 0) return null
        return {
          hour: cur.hour,
          curAmt: cur.amount,
          prevAmt: prev.amount,
          ratio: cur.amount / prev.amount,
          diff: cur.amount - prev.amount,
        }
      })
      .filter(Boolean) as {
      hour: number
      curAmt: number
      prevAmt: number
      ratio: number
      diff: number
    }[]
  }, [actualData, prevMap])

  // Weather comparison summary
  const weatherSummary = useMemo(() => {
    if (!weatherHourly?.length) return null
    const temps = weatherHourly.map((r) => r.temperature)
    const curMax = Math.max(...temps)
    const curMin = Math.min(...temps)
    const curPrecip = weatherHourly.reduce((s, r) => s + r.precipitation, 0)

    if (!prevWeatherHourly?.length) return { curMax, curMin, curPrecip }

    const prevTemps = prevWeatherHourly.map((r) => r.temperature)
    const prevMax = Math.max(...prevTemps)
    const prevMin = Math.min(...prevTemps)
    const prevPrecip = prevWeatherHourly.reduce((s, r) => s + r.precipitation, 0)

    return { curMax, curMin, curPrecip, prevMax, prevMin, prevPrecip }
  }, [weatherHourly, prevWeatherHourly])

  if (yoyRows.length === 0 && !weatherSummary) return null

  // Find peak/bottom YoY hours
  const bestHour = yoyRows.length > 0 ? yoyRows.reduce((b, r) => (r.diff > b.diff ? r : b)) : null
  const worstHour = yoyRows.length > 0 ? yoyRows.reduce((w, r) => (r.diff < w.diff ? r : w)) : null

  const curYear = curDateKey?.slice(0, 4) ?? ''
  const prevYearLabel = prevDateKey?.slice(0, 4) ?? ''

  return (
    <div
      style={{
        marginTop: 8,
        padding: '8px 6px',
        borderRadius: 6,
        fontSize: '0.6rem',
        lineHeight: 1.6,
      }}
    >
      {/* Weather comparison */}
      {weatherSummary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
          <div>
            <SumLabel>{curYear} 気温</SumLabel>
            <SumValue>
              <span style={{ color: '#e74c3c' }}>{weatherSummary.curMax.toFixed(1)}°</span>
              {' / '}
              <span style={{ color: '#3498db' }}>{weatherSummary.curMin.toFixed(1)}°</span>
            </SumValue>
          </div>
          {weatherSummary.prevMax != null && (
            <div>
              <SumLabel>{prevYearLabel} 気温</SumLabel>
              <SumValue>
                <span style={{ color: '#e74c3c' }}>{weatherSummary.prevMax.toFixed(1)}°</span>
                {' / '}
                <span style={{ color: '#3498db' }}>{weatherSummary.prevMin!.toFixed(1)}°</span>
              </SumValue>
            </div>
          )}
          {weatherSummary.prevMax != null && (
            <div>
              <SumLabel>気温差</SumLabel>
              <SumValue>
                最高{(weatherSummary.curMax - weatherSummary.prevMax).toFixed(1)}° / 最低
                {(weatherSummary.curMin - weatherSummary.prevMin!).toFixed(1)}°
              </SumValue>
            </div>
          )}
          <div>
            <SumLabel>{curYear} 降水</SumLabel>
            <SumValue>{weatherSummary.curPrecip.toFixed(1)}mm</SumValue>
          </div>
          {weatherSummary.prevPrecip != null && (
            <div>
              <SumLabel>{prevYearLabel} 降水</SumLabel>
              <SumValue>{weatherSummary.prevPrecip.toFixed(1)}mm</SumValue>
            </div>
          )}
        </div>
      )}

      {/* Best/worst YoY hours */}
      {bestHour && worstHour && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <SumLabel>前年比 最好調</SumLabel>
            <SumValue style={{ color: sc.positive }}>
              {bestHour.hour}時 {formatPercent(bestHour.ratio, 0)}（{bestHour.diff >= 0 ? '+' : ''}
              {toComma(bestHour.diff)}円）
            </SumValue>
          </div>
          <div>
            <SumLabel>前年比 最不調</SumLabel>
            <SumValue style={{ color: sc.negative }}>
              {worstHour.hour}時 {formatPercent(worstHour.ratio, 0)}（
              {worstHour.diff >= 0 ? '+' : ''}
              {toComma(worstHour.diff)}円）
            </SumValue>
          </div>
        </div>
      )}
    </div>
  )
})
